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
  searchGymsMock,
  searchGymsWithPriceMock,
  submitPricesMock,
  updatePriceMock,
} from "./mock";
import { distanceKm } from "./utils";
import { latestByGroup } from "../price/utils";

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
  return attachLowestPrices(inRadius);
}

/**
 * 헬스장 목록에 "1개월" 최저가를 붙인다 (getNearbyGyms/searchGymsWithPrice 공용).
 * - 헬스장은 PT 횟수권 등 다른 라벨의 가격도 등록할 수 있지만, 홈/리스트의 대표
 *   최저가는 기간권 비교가 핵심인 서비스 특성상 "1개월"로 고정한다.
 */
async function attachLowestPrices(gyms: Gym[]): Promise<GymWithPrice[]> {
  if (gyms.length === 0) return [];

  const ids = gyms.map((gym) => gym.id);
  const { data: prices, error: priceError } = await supabase
    .from("gym_prices")
    .select("gym_id, user_id, price, status, created_at")
    .eq("label", "1개월")
    .in("gym_id", ids)
    .returns<
      {
        gym_id: string;
        user_id: string;
        price: number;
        status: string;
        created_at: string;
      }[]
    >();
  if (priceError) throw new Error(priceError.message);

  // 관리자 승인(approved)된 가격만 공개 최저가에 반영한다. RLS가 본인의 심사 대기 중인
  // 가격도 함께 내려줄 수 있어(본인 조회 허용) 여기서 한 번 더 걸러낸다.
  const approved = (prices ?? []).filter((p) => p.status === "approved");

  // 같은 유저가 같은 헬스장에 중복 제보한 경우 최신 1건만 최저가 계산에 반영한다.
  const latestPrices = latestByGroup(approved, (p) => `${p.gym_id}:${p.user_id}`);

  const lowestByGym = new Map<string, number>();
  for (const { gym_id, price } of latestPrices) {
    const current = lowestByGym.get(gym_id);
    if (current === undefined || price < current) {
      lowestByGym.set(gym_id, price);
    }
  }

  return gyms.map((gym) => ({
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

/**
 * 이름으로 이미 등록된 헬스장 검색 (가격만 등록할 대상 헬스장을 고를 때 사용)
 * - 카카오 장소 검색(searchPlaces)과 달리 우리 DB에 이미 등록된 헬스장만 대상으로 한다.
 * - ilike()는 값 자체를 안전하게 파라미터로 넘기므로 SQL 인젝션 걱정이 없다
 *   (.or()로 문자열을 직접 조합하는 방식은 피한다).
 */
export async function searchGyms(keyword: string): Promise<Gym[]> {
  if (USE_MOCK) return searchGymsMock(keyword);

  const { data, error } = await supabase
    .from("gyms")
    .select("*")
    .ilike("name", `%${keyword}%`)
    .order("name")
    .limit(20)
    .returns<Gym[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * 이름으로 헬스장 검색 + 1개월 최저가 포함 (리스트 화면의 "전체에서 검색"용).
 * - searchGyms와 달리 목록 카드에 가격을 함께 보여주고 가격대 필터를 적용할 수 있다.
 */
export async function searchGymsWithPrice(keyword: string): Promise<GymWithPrice[]> {
  if (USE_MOCK) return searchGymsWithPriceMock(keyword);

  const gyms = await searchGyms(keyword);
  return attachLowestPrices(gyms);
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
 * - 한 번의 등록에서 여러 항목(예: "1개월" + "PT 10회")을 함께 제출할 수 있어
 *   배열로 받아 한 번에 insert한다. 각 항목은 gym_prices의 별도 행이 된다.
 * - status는 클라이언트가 지정할 수 없다 (DB 기본값 'pending'으로 시작 →
 *   관리자 승인 후에만 다른 유저에게 노출된다. supabase/schema.sql의 컬럼 권한 참고)
 */
export async function submitPrices(
  items: Omit<GymPrice, "id" | "created_at" | "status">[]
): Promise<GymPrice[]> {
  if (USE_MOCK) return submitPricesMock(items);

  const { data: created, error } = await supabase
    .from("gym_prices")
    .insert(items)
    .select("*")
    .returns<GymPrice[]>();

  if (error) throw new Error(error.message);
  if (!created || created.length === 0) {
    throw new Error("가격 등록에 실패했습니다.");
  }

  return created;
}
