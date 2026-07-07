import type { GymPrice } from "../../types";
import { formatPrice, hasAnyPrice, summarizePrices } from "./utils";

/** 테스트용 가격 객체 생성 헬퍼 */
function makePrice(values: Partial<GymPrice>): GymPrice {
  return {
    id: "p",
    gym_id: "g",
    user_id: "u",
    price_1m: null,
    price_3m: null,
    price_6m: null,
    price_12m: null,
    memo: null,
    created_at: "2026-01-01T00:00:00Z",
    ...values,
  };
}

describe("formatPrice", () => {
  it("null이면 '-' 를 반환한다", () => {
    expect(formatPrice(null)).toBe("-");
  });

  it("천 단위 콤마와 '원'을 붙인다", () => {
    expect(formatPrice(50000)).toBe("50,000원");
    expect(formatPrice(1000000)).toBe("1,000,000원");
  });

  it("0원도 표시한다", () => {
    expect(formatPrice(0)).toBe("0원");
  });
});

describe("hasAnyPrice", () => {
  it("모두 null이면 false", () => {
    expect(
      hasAnyPrice({
        price_1m: null,
        price_3m: null,
        price_6m: null,
        price_12m: null,
      })
    ).toBe(false);
  });

  it("하나라도 값이 있으면 true (0 포함)", () => {
    expect(
      hasAnyPrice({
        price_1m: null,
        price_3m: 0,
        price_6m: null,
        price_12m: null,
      })
    ).toBe(true);
  });
});

describe("summarizePrices", () => {
  it("빈 배열이면 모든 기간이 null, count 0", () => {
    const stats = summarizePrices([]);
    expect(stats).toHaveLength(4);
    expect(stats[0]).toEqual({ label: "1개월", min: null, avg: null, count: 0 });
  });

  it("기간별 최저가/평균가/제보수를 계산하고 null은 제외한다", () => {
    const prices = [
      makePrice({ price_1m: 60000 }),
      makePrice({ price_1m: 50000 }),
      makePrice({ price_1m: null }),
    ];
    const oneMonth = summarizePrices(prices)[0];
    expect(oneMonth.min).toBe(50000);
    expect(oneMonth.avg).toBe(55000);
    expect(oneMonth.count).toBe(2);
  });

  it("평균가는 반올림한다", () => {
    const prices = [makePrice({ price_3m: 100 }), makePrice({ price_3m: 101 })];
    const threeMonth = summarizePrices(prices)[1];
    expect(threeMonth.avg).toBe(101); // 100.5 → 101
  });
});
