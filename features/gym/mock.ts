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
const MOCK_PRICES: GymPrice[] = [
  {
    id: "price-1",
    gym_id: "gym-1",
    user_id: "user-1",
    price_1m: 60000,
    price_3m: 165000,
    price_6m: 300000,
    price_12m: 540000,
    memo: "PT 10회 포함 시 +30만",
    created_at: "2026-02-01T00:00:00Z",
  },
  {
    id: "price-2",
    gym_id: "gym-1",
    user_id: "user-2",
    price_1m: 55000,
    price_3m: null,
    price_6m: 280000,
    price_12m: null,
    memo: null,
    created_at: "2026-03-01T00:00:00Z",
  },
  {
    id: "price-3",
    gym_id: "gym-2",
    user_id: "user-1",
    price_1m: 49000,
    price_3m: 132000,
    price_6m: null,
    price_12m: 420000,
    memo: "학생 할인 가능",
    created_at: "2026-02-15T00:00:00Z",
  },
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

export function getNearbyGymsMock(): Promise<GymWithPrice[]> {
  const result: GymWithPrice[] = MOCK_GYMS.map((gym) => {
    const gymPrices = MOCK_PRICES.filter((p) => p.gym_id === gym.id);
    // 같은 유저의 중복 제보는 최신 1건만 최저가 계산에 반영한다 (api.ts와 동일 로직).
    const latestPrices = latestByGroup(gymPrices, (p) => p.user_id);
    const monthly = latestPrices
      .map((p) => p.price_1m)
      .filter((value): value is number => value !== null);
    return {
      ...gym,
      lowest_price_1m: monthly.length > 0 ? Math.min(...monthly) : null,
    };
  });
  return delay(result);
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
  MOCK_PRICES[index] = { ...MOCK_PRICES[index], ...values };
  return delay({ ...MOCK_PRICES[index] });
}

export function deletePriceMock(priceId: string): Promise<void> {
  const index = MOCK_PRICES.findIndex((p) => p.id === priceId);
  if (index !== -1) MOCK_PRICES.splice(index, 1);
  return delay(undefined);
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

export function submitPriceMock(
  data: Omit<GymPrice, "id" | "created_at">
): Promise<GymPrice> {
  seq += 1;
  const created: GymPrice = {
    ...data,
    id: `price-mock-${seq}`,
    created_at: new Date().toISOString(),
  };
  MOCK_PRICES.push(created);
  return delay(created);
}
