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
 */
export function summarizePrices(prices: GymPrice[]): PriceStat[] {
  return PERIOD_FIELDS.map(({ key, label }) => {
    const values = prices
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
