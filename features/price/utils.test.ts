import type { GymPrice } from "../../types";
import {
  formatPrice,
  hasAnyPrice,
  latestByGroup,
  summarizePrices,
  validatePriceValues,
} from "./utils";

/** 테스트용 가격 객체 생성 헬퍼 (기본 status는 "approved" — 별도 지정 시 override) */
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
    status: "approved",
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
    // 서로 다른 유저의 제보 3건 (동일 유저 중복 제보 dedup과는 무관한 케이스)
    const prices = [
      makePrice({ user_id: "u1", price_1m: 60000 }),
      makePrice({ user_id: "u2", price_1m: 50000 }),
      makePrice({ user_id: "u3", price_1m: null }),
    ];
    const oneMonth = summarizePrices(prices)[0];
    expect(oneMonth.min).toBe(50000);
    expect(oneMonth.avg).toBe(55000);
    expect(oneMonth.count).toBe(2);
  });

  it("승인(approved)되지 않은 가격(pending/rejected)은 통계에서 제외한다", () => {
    const prices = [
      makePrice({ user_id: "u1", price_1m: 30000, status: "pending" }),
      makePrice({ user_id: "u2", price_1m: 20000, status: "rejected" }),
      makePrice({ user_id: "u3", price_1m: 55000, status: "approved" }),
    ];
    const oneMonth = summarizePrices(prices)[0];
    // pending/rejected인 더 싼 가격(30000/20000)은 무시되고 승인된 55000만 반영
    expect(oneMonth.min).toBe(55000);
    expect(oneMonth.count).toBe(1);
  });

  it("평균가는 반올림한다", () => {
    const prices = [
      makePrice({ user_id: "u1", price_3m: 100 }),
      makePrice({ user_id: "u2", price_3m: 101 }),
    ];
    const threeMonth = summarizePrices(prices)[1];
    expect(threeMonth.avg).toBe(101); // 100.5 → 101
  });

  it("같은 유저의 중복 제보는 최신 1건만 반영한다", () => {
    const prices = [
      makePrice({
        user_id: "u1",
        price_1m: 80000,
        created_at: "2026-01-01T00:00:00Z",
      }),
      makePrice({
        user_id: "u1",
        price_1m: 40000,
        created_at: "2026-03-01T00:00:00Z", // 같은 유저의 더 최신 제보
      }),
      makePrice({
        user_id: "u2",
        price_1m: 55000,
        created_at: "2026-02-01T00:00:00Z",
      }),
    ];
    const oneMonth = summarizePrices(prices)[0];
    // u1의 오래된 80000원은 무시되고 최신 40000원만 반영 → 최저가는 40000
    expect(oneMonth.min).toBe(40000);
    expect(oneMonth.count).toBe(2); // u1(최신 1건) + u2 = 2건
  });
});

describe("latestByGroup", () => {
  it("그룹별로 created_at이 가장 최근인 항목만 남긴다", () => {
    const items = [
      { id: "a", user_id: "u1", created_at: "2026-01-01T00:00:00Z" },
      { id: "b", user_id: "u1", created_at: "2026-02-01T00:00:00Z" },
      { id: "c", user_id: "u2", created_at: "2026-01-15T00:00:00Z" },
    ];
    const result = latestByGroup(items, (item) => item.user_id);

    expect(result).toHaveLength(2);
    expect(result.find((item) => item.user_id === "u1")?.id).toBe("b");
    expect(result.find((item) => item.user_id === "u2")?.id).toBe("c");
  });

  it("빈 배열이면 빈 배열을 반환한다", () => {
    expect(latestByGroup([], (item: { created_at: string }) => item.created_at)).toEqual([]);
  });
});

describe("validatePriceValues", () => {
  const EMPTY = {
    price_1m: null,
    price_3m: null,
    price_6m: null,
    price_12m: null,
  };

  it("모두 비어있으면 에러 메시지를 반환한다", () => {
    expect(validatePriceValues(EMPTY)).not.toBeNull();
  });

  it("음수 가격은 에러 메시지를 반환한다", () => {
    expect(
      validatePriceValues({ ...EMPTY, price_1m: -1000 })
    ).not.toBeNull();
  });

  it("0원은 에러 메시지를 반환한다", () => {
    expect(validatePriceValues({ ...EMPTY, price_1m: 0 })).not.toBeNull();
  });

  it("비정상적으로 큰 값은 에러 메시지를 반환한다", () => {
    expect(
      validatePriceValues({ ...EMPTY, price_1m: 999_000_000 })
    ).not.toBeNull();
  });

  it("합리적인 범위의 값이면 에러 없음(null)을 반환한다", () => {
    expect(validatePriceValues({ ...EMPTY, price_1m: 60000 })).toBeNull();
  });
});
