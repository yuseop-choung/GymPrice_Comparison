import { USE_MOCK } from "../../constants/config";
import { supabase } from "../../lib/supabase";
import type {
  Gym,
  GymDetail,
  GymDetailValues,
  GymPrice,
  GymWithPrice,
  MyPriceItem,
  PriceValues,
} from "../../types";
import {
  deletePriceMock,
  getGymDetailMock,
  getGymWithPricesMock,
  getMyPricesMock,
  getNearbyGymsMock,
  getPriceMock,
  registerGymMock,
  saveGymDetailMock,
  submitPriceMock,
  updatePriceMock,
} from "./mock";
import { distanceKm } from "./utils";

/**
 * 헬스장(gym) 도메인 API
 * - supabase 클라이언트는 /lib/supabase.ts 에서 가져와 사용한다.
 * - 응답 타입은 .returns<T>() 로 명시해 any 사용을 피한다.
 */

/**
 * 위경도 기반 반경 내 헬스장 목록 조회 (각 헬스장의 1개월권 최저가 포함)
 * - 바운딩 박스로 1차 필터(DB) 후, 정확한 반경으로 2차 필터(클라이언트)한다.
 */
export async function getNearbyGyms(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<GymWithPrice[]> {
  if (USE_MOCK) return getNearbyGymsMock();

  // 위도 1도 ≈ 111km, 경도는 위도에 따라 보정
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

  const { data, error } = await supabase
    .from("gyms")
    .select("*")
    .gte("lat", lat - latDelta)
    .lte("lat", lat + latDelta)
    .gte("lng", lng - lngDelta)
    .lte("lng", lng + lngDelta)
    .returns<Gym[]>();
  if (error) throw new Error(error.message);

  const inRadius = (data ?? []).filter(
    (gym) => distanceKm(lat, lng, gym.lat, gym.lng) <= radiusKm
  );
  if (inRadius.length === 0) return [];

  // 반경 내 헬스장들의 1개월권 가격을 모아 최저가를 계산한다.
  const ids = inRadius.map((gym) => gym.id);
  const { data: prices, error: priceError } = await supabase
    .from("gym_prices")
    .select("gym_id, price_1m")
    .in("gym_id", ids)
    .returns<{ gym_id: string; price_1m: number | null }[]>();
  if (priceError) throw new Error(priceError.message);

  const lowestByGym = new Map<string, number>();
  for (const { gym_id, price_1m } of prices ?? []) {
    if (price_1m === null) continue;
    const current = lowestByGym.get(gym_id);
    if (current === undefined || price_1m < current) {
      lowestByGym.set(gym_id, price_1m);
    }
  }

  return inRadius.map((gym) => ({
    ...gym,
    lowest_price_1m: lowestByGym.get(gym.id) ?? null,
  }));
}

/**
 * 헬스장 상세 정보 + 등록된 가격 목록 조회
 */
export async function getGymWithPrices(
  gymId: string
): Promise<{ gym: Gym; prices: GymPrice[]; detail: GymDetail | null }> {
  if (USE_MOCK) return getGymWithPricesMock(gymId);

  const { data: gym, error: gymError } = await supabase
    .from("gyms")
    .select("*")
    .eq("id", gymId)
    .returns<Gym[]>()
    .single();

  if (gymError) throw new Error(gymError.message);
  if (!gym) throw new Error("헬스장을 찾을 수 없습니다.");

  const { data: prices, error: priceError } = await supabase
    .from("gym_prices")
    .select("*")
    .eq("gym_id", gymId)
    .order("created_at", { ascending: false })
    .returns<GymPrice[]>();

  if (priceError) throw new Error(priceError.message);

  const detail = await getGymDetail(gymId);

  return { gym, prices: prices ?? [], detail };
}

/** 헬스장 부가정보 조회 (없으면 null) */
export async function getGymDetail(gymId: string): Promise<GymDetail | null> {
  if (USE_MOCK) return getGymDetailMock(gymId);

  const { data, error } = await supabase
    .from("gym_details")
    .select("*")
    .eq("gym_id", gymId)
    .limit(1)
    .returns<GymDetail[]>();
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

/**
 * 헬스장 부가정보 저장 (있으면 수정, 없으면 생성)
 * - gym_details.gym_id UNIQUE 제약을 이용해 upsert 한 번으로 처리한다.
 */
export async function saveGymDetail(
  gymId: string,
  values: GymDetailValues
): Promise<void> {
  if (USE_MOCK) return saveGymDetailMock(gymId, values);

  const { error } = await supabase
    .from("gym_details")
    .upsert({ gym_id: gymId, ...values }, { onConflict: "gym_id" });
  if (error) throw new Error(error.message);
}

/**
 * 특정 유저가 등록한 가격 목록 조회 (헬스장 이름 포함, 최신순)
 */
export async function getMyPrices(userId: string): Promise<MyPriceItem[]> {
  if (USE_MOCK) return getMyPricesMock(userId);

  const { data, error } = await supabase
    .from("gym_prices")
    .select("*, gyms(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<(GymPrice & { gyms: { name: string } | null })[]>();
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const { gyms, ...price } = row;
    return { ...price, gym_name: gyms?.name ?? "알 수 없는 헬스장" };
  });
}

/**
 * 새 헬스장 등록
 */
export async function registerGym(
  data: Omit<Gym, "id" | "created_at">
): Promise<Gym> {
  if (USE_MOCK) return registerGymMock(data);

  const { data: created, error } = await supabase
    .from("gyms")
    .insert(data)
    .select("*")
    .returns<Gym[]>()
    .single();

  if (error) throw new Error(error.message);
  if (!created) throw new Error("헬스장 등록에 실패했습니다.");

  return created;
}

/** 가격 단건 조회 */
export async function getPrice(priceId: string): Promise<GymPrice> {
  if (USE_MOCK) return getPriceMock(priceId);

  const { data, error } = await supabase
    .from("gym_prices")
    .select("*")
    .eq("id", priceId)
    .returns<GymPrice[]>()
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("가격 정보를 찾을 수 없습니다.");
  return data;
}

/** 가격 수정 (RLS: 본인 데이터만 가능) */
export async function updatePrice(
  priceId: string,
  values: PriceValues
): Promise<GymPrice> {
  if (USE_MOCK) return updatePriceMock(priceId, values);

  const { data, error } = await supabase
    .from("gym_prices")
    .update(values)
    .eq("id", priceId)
    .select("*")
    .returns<GymPrice[]>()
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("가격 수정에 실패했습니다.");
  return data;
}

/** 가격 삭제 (RLS: 본인 데이터만 가능) */
export async function deletePrice(priceId: string): Promise<void> {
  if (USE_MOCK) return deletePriceMock(priceId);

  const { error } = await supabase
    .from("gym_prices")
    .delete()
    .eq("id", priceId);
  if (error) throw new Error(error.message);
}

/**
 * 가격 정보 등록 (크라우드소싱)
 */
export async function submitPrice(
  data: Omit<GymPrice, "id" | "created_at">
): Promise<GymPrice> {
  if (USE_MOCK) return submitPriceMock(data);

  const { data: created, error } = await supabase
    .from("gym_prices")
    .insert(data)
    .select("*")
    .returns<GymPrice[]>()
    .single();

  if (error) throw new Error(error.message);
  if (!created) throw new Error("가격 등록에 실패했습니다.");

  return created;
}
