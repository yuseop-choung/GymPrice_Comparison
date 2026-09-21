import type {
  Gym,
  GymDetail,
  GymDetailValues,
  GymPrice,
  GymWithPrice,
  MyPriceItem,
  PriceValues,
} from "../../types";
import { latestByGroup } from "../price/utils";

/**
 * 목(mock) 데이터 및 더미 API
 * - 백엔드 없이 화면 흐름을 확인하기 위한 용도. (USE_MOCK=true 일 때 api.ts에서 사용)
 * - 좌표는 봉은사역 인근으로 두어 기본 위치에서 바로 조회된다.
 */

const MOCK_GYMS: Gym[] = [
  {
    id: "gym-1",
    name: "스타필드 피트니스",
    address: "서울 강남구 봉은사로 524",
    lat: 37.5142,
    lng: 127.0588,
    phone: "02-1234-5678",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "gym-2",
    name: "강철짐 봉은사역점",
    address: "서울 강남구 삼성동 159",
    lat: 37.5151,
    lng: 127.0607,
    phone: null,
    created_at: "2026-01-02T00:00:00Z",
  },
  {
    id: "gym-3",
    name: "헬스앤라이프",
    address: "서울 강남구 영동대로 513",
    lat: 37.5129,
    lng: 127.0572,
    phone: "02-9876-5432",
    created_at: "2026-01-03T00:00:00Z",
  },
];

// 가격은 메모리에 보관하여 등록 시 즉시 반영되도록 한다.
// 라벨(자유 텍스트) + 가격 1건 = 1행 구조 — 기간권(1/3/6/12개월)뿐 아니라
// PT 횟수권처럼 커스텀 라벨도 등록할 수 있다.
// status: 실제 서버는 관리자 승인 전엔 'pending'으로 시작하지만, 데모 편의를 위해
// 미리 넣어둔 항목들은 'approved'로 시작한다(새로 등록하면 submitPricesMock이 'pending'으로 넣는다).
const MOCK_PRICES: GymPrice[] = [
  // gym-1, user-1 제보: 기본 4항목 + PT 10회(커스텀 라벨)
  { id: "price-1", gym_id: "gym-1", user_id: "user-1", label: "1개월", price: 60000, memo: "PT 10회 포함 시 +30만", status: "approved", created_at: "2026-02-01T00:00:00Z" },
  { id: "price-2", gym_id: "gym-1", user_id: "user-1", label: "3개월", price: 165000, memo: null, status: "approved", created_at: "2026-02-01T00:00:01Z" },
  { id: "price-3", gym_id: "gym-1", user_id: "user-1", label: "6개월", price: 300000, memo: null, status: "approved", created_at: "2026-02-01T00:00:02Z" },
  { id: "price-4", gym_id: "gym-1", user_id: "user-1", label: "12개월", price: 540000, memo: null, status: "approved", created_at: "2026-02-01T00:00:03Z" },
  { id: "price-5", gym_id: "gym-1", user_id: "user-1", label: "PT 10회", price: 450000, memo: null, status: "approved", created_at: "2026-02-01T00:00:04Z" },
  // gym-1, user-2 제보: 더 저렴한 1개월/6개월
  { id: "price-6", gym_id: "gym-1", user_id: "user-2", label: "1개월", price: 55000, memo: null, status: "approved", created_at: "2026-03-01T00:00:00Z" },
  { id: "price-7", gym_id: "gym-1", user_id: "user-2", label: "6개월", price: 280000, memo: null, status: "approved", created_at: "2026-03-01T00:00:01Z" },
  // gym-2, user-1 제보
  { id: "price-8", gym_id: "gym-2", user_id: "user-1", label: "1개월", price: 49000, memo: "학생 할인 가능", status: "approved", created_at: "2026-02-15T00:00:00Z" },
  { id: "price-9", gym_id: "gym-2", user_id: "user-1", label: "3개월", price: 132000, memo: "학생 할인 가능", status: "approved", created_at: "2026-02-15T00:00:01Z" },
  { id: "price-10", gym_id: "gym-2", user_id: "user-1", label: "12개월", price: 420000, memo: "학생 할인 가능", status: "approved", created_at: "2026-02-15T00:00:02Z" },
];

// 헬스장 부가정보 (메모리 보관)
const MOCK_DETAILS: GymDetail[] = [
  {
    id: "detail-1",
    gym_id: "gym-1",
    equipment_brand: "테크노짐",
    cleanliness: 4,
    trainer_count: 5,
    memo: "샤워실이 깨끗하고 수건 제공",
  },
];

let seq = MOCK_PRICES.length;

/** 네트워크 지연을 흉내내는 헬퍼 */
function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/**
 * 헬스장 목록에 "1개월" 최저가를 붙인다 (getNearbyGymsMock/searchGymsWithPriceMock 공용,
 * api.ts의 attachLowestPrices와 동일 로직).
 */
function attachLowestPricesMock(gyms: Gym[]): GymWithPrice[] {
  return gyms.map((gym) => {
    // 홈/리스트의 대표 최저가는 "1개월" 라벨 + 관리자 승인(approved)된 것만 반영한다.
    const monthlyPrices = MOCK_PRICES.filter(
      (p) => p.gym_id === gym.id && p.label === "1개월" && p.status === "approved"
    );
    // 같은 유저의 중복 제보는 최신 1건만 최저가 계산에 반영한다 (api.ts와 동일 로직).
    const latestPrices = latestByGroup(monthlyPrices, (p) => p.user_id);
    const values = latestPrices.map((p) => p.price);
    return {
      ...gym,
      lowest_price_1m: values.length > 0 ? Math.min(...values) : null,
    };
  });
}

export function getNearbyGymsMock(): Promise<GymWithPrice[]> {
  return delay(attachLowestPricesMock(MOCK_GYMS));
}

export function getMyPricesMock(userId: string): Promise<MyPriceItem[]> {
  const result: MyPriceItem[] = MOCK_PRICES.filter(
    (p) => p.user_id === userId
  ).map((p) => ({
    ...p,
    gym_name:
      MOCK_GYMS.find((g) => g.id === p.gym_id)?.name ?? "알 수 없는 헬스장",
  }));
  return delay(result);
}

export function getGymWithPricesMock(
  gymId: string
): Promise<{ gym: Gym; prices: GymPrice[]; detail: GymDetail | null }> {
  const gym = MOCK_GYMS.find((g) => g.id === gymId);
  if (!gym) {
    return Promise.reject(new Error("헬스장을 찾을 수 없습니다."));
  }
  const prices = MOCK_PRICES.filter((p) => p.gym_id === gymId);
  const detail = MOCK_DETAILS.find((d) => d.gym_id === gymId) ?? null;
  return delay({ gym, prices, detail });
}

export function getGymDetailMock(gymId: string): Promise<GymDetail | null> {
  return delay(MOCK_DETAILS.find((d) => d.gym_id === gymId) ?? null);
}

export function saveGymDetailMock(
  gymId: string,
  values: GymDetailValues
): Promise<void> {
  const index = MOCK_DETAILS.findIndex((d) => d.gym_id === gymId);
  if (index !== -1) {
    MOCK_DETAILS[index] = { ...MOCK_DETAILS[index], ...values };
  } else {
    seq += 1;
    MOCK_DETAILS.push({ id: `detail-mock-${seq}`, gym_id: gymId, ...values });
  }
  return delay(undefined);
}

export function getPriceMock(priceId: string): Promise<GymPrice> {
  const found = MOCK_PRICES.find((p) => p.id === priceId);
  if (!found) {
    return Promise.reject(new Error("가격 정보를 찾을 수 없습니다."));
  }
  return delay({ ...found });
}

export function updatePriceMock(
  priceId: string,
  values: PriceValues
): Promise<GymPrice> {
  const index = MOCK_PRICES.findIndex((p) => p.id === priceId);
  if (index === -1) {
    return Promise.reject(new Error("가격 정보를 찾을 수 없습니다."));
  }
  const before = MOCK_PRICES[index];
  const changed = before.price !== values.price || before.label !== values.label;

  // 라벨/가격을 바꾸면 실제 서버(트리거)와 동일하게 다시 심사받도록 되돌린다.
  MOCK_PRICES[index] = {
    ...before,
    ...values,
    status: changed ? "pending" : before.status,
  };
  return delay({ ...MOCK_PRICES[index] });
}

export function deletePriceMock(priceId: string): Promise<void> {
  const index = MOCK_PRICES.findIndex((p) => p.id === priceId);
  if (index !== -1) MOCK_PRICES.splice(index, 1);
  return delay(undefined);
}

/** 이름으로 이미 등록된 헬스장 검색 목(mock) — api.ts의 searchGyms와 동일한 대소문자 무시 부분일치 */
export function searchGymsMock(keyword: string): Promise<Gym[]> {
  const q = keyword.trim().toLowerCase();
  if (q === "") return delay([]);
  return delay(MOCK_GYMS.filter((g) => g.name.toLowerCase().includes(q)));
}

/** 이름으로 헬스장 검색 + 1개월 최저가 포함 목(mock) — api.ts의 searchGymsWithPrice와 동일 */
export function searchGymsWithPriceMock(keyword: string): Promise<GymWithPrice[]> {
  const q = keyword.trim().toLowerCase();
  if (q === "") return delay([]);
  return delay(attachLowestPricesMock(MOCK_GYMS.filter((g) => g.name.toLowerCase().includes(q))));
}

export function registerGymMock(
  data: Omit<Gym, "id" | "created_at">
): Promise<Gym> {
  seq += 1;
  const created: Gym = {
    ...data,
    id: `gym-mock-${seq}`,
    created_at: new Date().toISOString(),
  };
  MOCK_GYMS.push(created);
  return delay(created);
}

/** 한 번의 등록에서 여러 항목(예: "1개월" + "PT 10회")을 함께 제출할 수 있어 배열로 받는다. */
export function submitPricesMock(
  items: Omit<GymPrice, "id" | "created_at" | "status">[]
): Promise<GymPrice[]> {
  const now = new Date().toISOString();
  const created: GymPrice[] = items.map((item) => {
    seq += 1;
    return {
      ...item,
      id: `price-mock-${seq}`,
      status: "pending", // 실제 서버와 동일하게 심사 대기 상태로 시작
      created_at: now,
    };
  });
  MOCK_PRICES.push(...created);
  return delay(created);
}
