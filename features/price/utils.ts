import type { GymPrice } from "../../types";

/**
 * 가격 관련 유틸
 */

/** 가격 4종(1/3/6/12개월) 중 최소 1개가 입력됐는지 검사 */
export function hasAnyPrice(
  values: Pick<GymPrice, "price_1m" | "price_3m" | "price_6m" | "price_12m">
): boolean {
  return [
    values.price_1m,
    values.price_3m,
    values.price_6m,
    values.price_12m,
  ].some((value) => value !== null);
}

/**
 * 가격 필드별 허용 범위(원)
 * - 음수/0/비정상적으로 큰 값(오입력·장난·허위 제보)을 걸러낸다.
 * - supabase/schema.sql의 gym_prices CHECK 제약(price_range)과 동일한 값을 유지한다.
 */
const PRICE_RANGE: Record<
  "price_1m" | "price_3m" | "price_6m" | "price_12m",
  { min: number; max: number }
> = {
  price_1m: { min: 1000, max: 5_000_000 },
  price_3m: { min: 1000, max: 15_000_000 },
  price_6m: { min: 1000, max: 30_000_000 },
  price_12m: { min: 1000, max: 60_000_000 },
};

/**
 * 가격 입력값 검증
 * - 최소 1개 이상 입력됐는지 + 입력된 값들이 합리적 범위인지 확인한다.
 * - 문제가 있으면 사용자에게 보여줄 한국어 에러 메시지를, 없으면 null을 반환한다.
 */
export function validatePriceValues(
  values: Pick<GymPrice, "price_1m" | "price_3m" | "price_6m" | "price_12m">
): string | null {
  if (!hasAnyPrice(values)) {
    return "최소 1개 이상의 가격을 입력해주세요.";
  }

  for (const key of Object.keys(PRICE_RANGE) as (keyof typeof PRICE_RANGE)[]) {
    const value = values[key];
    if (value === null) continue;
    const { min, max } = PRICE_RANGE[key];
    if (value < min || value > max) {
      return `가격은 ${formatPrice(min)} ~ ${formatPrice(max)} 사이로 입력해주세요.`;
    }
  }

  return null;
}

/**
 * 그룹(주로 유저)별로 created_at이 가장 최근인 항목 1건만 남긴다.
 * - 같은 유저가 같은 헬스장에 여러 번 제보해도, 최신 제보만 최저가/평균가 계산에
 *   반영되도록 해 중복 제보로 인한 통계 왜곡을 막는다.
 */
export function latestByGroup<T extends { created_at: string }>(
  items: T[],
  groupKey: (item: T) => string
): T[] {
  const latest = new Map<string, T>();
  for (const item of items) {
    const key = groupKey(item);
    const current = latest.get(key);
    if (!current || item.created_at > current.created_at) {
      latest.set(key, item);
    }
  }
  return [...latest.values()];
}

/** 기간별 가격 통계 */
export interface PriceStat {
  label: string; // 기간 라벨 (예: "1개월")
  min: number | null; // 최저가
  avg: number | null; // 평균가
  count: number; // 제보 수
}

/** 통계를 계산할 가격 필드 정의 */
const PERIOD_FIELDS: {
  key: keyof Pick<
    GymPrice,
    "price_1m" | "price_3m" | "price_6m" | "price_12m"
  >;
  label: string;
}[] = [
  { key: "price_1m", label: "1개월" },
  { key: "price_3m", label: "3개월" },
  { key: "price_6m", label: "6개월" },
  { key: "price_12m", label: "12개월" },
];

/**
 * 등록된 가격들로부터 기간별 최저가/평균가를 계산한다.
 * - null(미입력) 값은 통계에서 제외한다.
 * - 같은 유저의 중복 제보는 최신 1건만 반영한다(latestByGroup).
 */
export function summarizePrices(prices: GymPrice[]): PriceStat[] {
  const deduped = latestByGroup(prices, (price) => price.user_id);

  return PERIOD_FIELDS.map(({ key, label }) => {
    const values = deduped
      .map((price) => price[key])
      .filter((value): value is number => value !== null);

    if (values.length === 0) {
      return { label, min: null, avg: null, count: 0 };
    }

    const sum = values.reduce((acc, value) => acc + value, 0);
    return {
      label,
      min: Math.min(...values),
      avg: Math.round(sum / values.length),
      count: values.length,
    };
  });
}

/**
 * 가격(원) 표시용 포맷
 * - null 이면 "-" 반환, 값이 있으면 천 단위 콤마 + "원" 부착.
 * - RN(Hermes)의 Intl 미지원 환경을 고려해 정규식으로 직접 포맷한다.
 */
export function formatPrice(value: number | null): string {
  if (value === null) return "-";
  const withComma = value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${withComma}원`;
}
