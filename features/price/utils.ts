import type { GymPrice } from "../../types";

/**
 * 가격 관련 유틸
 * - gym_prices는 "라벨(자유 텍스트) + 가격 1건 = 1행" 구조라, 여기의 함수들은
 *   고정된 기간 필드가 아니라 하나의 {label, price} 항목 단위로 동작한다.
 */

/** 등록 폼의 기본 4항목 (라벨 고정, "+"로 커스텀 항목을 추가할 수 있다) */
export const DEFAULT_PRICE_LABELS = ["1개월", "3개월", "6개월", "12개월"] as const;

/**
 * 가격 허용 범위(원)
 * - 음수/0/비정상적으로 큰 값(오입력·장난·허위 제보)을 걸러낸다.
 * - supabase/schema.sql의 gym_prices CHECK 제약(price_range)과 동일한 값을 유지한다.
 */
const PRICE_RANGE = { min: 1000, max: 10_000_000 };

/**
 * 가격 항목(라벨 + 가격) 1건 검증
 * - 라벨이 비어있거나 가격이 범위를 벗어나면 사용자에게 보여줄 한국어 에러 메시지를,
 *   문제 없으면 null을 반환한다.
 */
export function validatePriceItem(item: {
  label: string;
  price: number;
}): string | null {
  if (item.label.trim() === "") {
    return "가격 항목의 이름을 입력해주세요.";
  }
  if (item.price < PRICE_RANGE.min || item.price > PRICE_RANGE.max) {
    return `가격은 ${formatPrice(PRICE_RANGE.min)} ~ ${formatPrice(PRICE_RANGE.max)} 사이로 입력해주세요.`;
  }
  return null;
}

/**
 * 그룹(주로 유저)별로 created_at이 가장 최근인 항목 1건만 남긴다.
 * - 같은 유저가 같은 헬스장/같은 항목에 여러 번 제보해도, 최신 제보만 최저가/평균가
 *   계산에 반영되도록 해 중복 제보로 인한 통계 왜곡을 막는다.
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

/** 라벨별 가격 통계 */
export interface PriceStat {
  label: string; // 예: "1개월", "PT 10회"
  min: number; // 최저가
  avg: number; // 평균가
  /**
   * 중앙값. 평균은 극단적으로 비싸거나(허위 제보 등) 싼 값 하나에도 크게 흔들릴
   * 수 있어, 참고용으로 함께 제공한다. 기존 avg를 대체하지 않고 추가 정보로만
   * 노출한다(정책 변경이 아니라 참고 지표 추가).
   */
  median: number;
  count: number; // 제보 수
}

/** 숫자 배열의 중앙값 (짝수 개면 가운데 두 값의 평균, 반올림) */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

/** 정렬 우선순위: 기본 4항목(1/3/6/12개월)을 먼저, 그 외 커스텀 라벨은 뒤에 이름순 */
function labelSortKey(label: string): [number, string] {
  const index = DEFAULT_PRICE_LABELS.indexOf(
    label as (typeof DEFAULT_PRICE_LABELS)[number]
  );
  return [index === -1 ? DEFAULT_PRICE_LABELS.length : index, label];
}

/**
 * 공개(승인된) 가격 중, 같은 유저가 같은 라벨로 중복 제보한 것은 최신 1건만 남긴다.
 * - summarizePrices와 상세 목록(개별 등록 내역)이 항상 같은 기준의 데이터를
 *   보여주도록, 이 함수를 두 곳에서 공유해서 쓴다.
 */
export function dedupePrices(prices: GymPrice[]): GymPrice[] {
  const approved = prices.filter((price) => price.status === "approved");
  return latestByGroup(approved, (price) => `${price.label}:${price.user_id}`);
}

/**
 * 등록된 가격들로부터 라벨별 최저가/평균가를 계산한다.
 * - 실제로 제보가 있는 라벨만 결과에 포함된다(1/3/6/12개월 중 제보 없는 항목은 제외).
 * - 관리자가 승인(approved)한 가격만 반영한다 — RLS가 본인의 심사 대기 중인 가격도
 *   함께 내려줄 수 있어(본인 조회 허용), 공개 통계 계산에서는 여기서 한 번 더 걸러낸다.
 * - 같은 유저가 같은 라벨로 중복 제보해도 최신 1건만 반영한다(dedupePrices).
 */
export function summarizePrices(prices: GymPrice[]): PriceStat[] {
  const deduped = dedupePrices(prices);

  const byLabel = new Map<string, number[]>();
  for (const price of deduped) {
    const values = byLabel.get(price.label) ?? [];
    values.push(price.price);
    byLabel.set(price.label, values);
  }

  return [...byLabel.entries()]
    .map(([label, values]) => {
      const sum = values.reduce((acc, value) => acc + value, 0);
      return {
        label,
        min: Math.min(...values),
        avg: Math.round(sum / values.length),
        median: median(values),
        count: values.length,
      };
    })
    .sort((a, b) => {
      const [ai, al] = labelSortKey(a.label);
      const [bi, bl] = labelSortKey(b.label);
      return ai !== bi ? ai - bi : al.localeCompare(bl);
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

/**
 * 등록된 지 이 기간(일)이 지나면 "오래된 가격일 수 있음"으로 표시한다.
 * - 헬스장 가격은 시간이 지나면 실제로 바뀌었을 가능성이 있는데, 최저가/평균가
 *   계산 자체는 여전히 (재검증 없이도) 등록 당시 값을 그대로 쓴다 — 통계 로직을
 *   바꾸는 대신, 오래된 값임을 사용자에게 알려주는 쪽을 택했다(제품 정책을
 *   임의로 바꾸지 않으면서 "오래된 가격이 최신처럼 보이는" 문제를 완화).
 */
export const STALE_PRICE_DAYS = 180;

/** created_at 기준으로 STALE_PRICE_DAYS일이 지난 "오래된" 가격인지 */
export function isStalePrice(createdAt: string, now: Date = new Date()): boolean {
  const createdMs = new Date(createdAt).getTime();
  if (Number.isNaN(createdMs)) return false;
  const diffDays = (now.getTime() - createdMs) / (1000 * 60 * 60 * 24);
  return diffDays > STALE_PRICE_DAYS;
}
