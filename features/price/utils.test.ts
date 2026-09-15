import type { GymPrice } from "../../types";
import {
  formatPrice,
  latestByGroup,
  summarizePrices,
  validatePriceItem,
} from "./utils";

/** 테스트용 가격 항목 생성 헬퍼 (기본 status는 "approved" — 별도 지정 시 override) */
function makePrice(values: Partial<GymPrice> & Pick<GymPrice, "label" | "price">): GymPrice {
  return {
    id: "p",
    gym_id: "g",
    user_id: "u",
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

describe("validatePriceItem", () => {
  it("라벨이 비어있으면 에러 메시지를 반환한다", () => {
    expect(validatePriceItem({ label: "  ", price: 50000 })).not.toBeNull();
  });

  it("가격이 범위 밖이면 에러 메시지를 반환한다", () => {
    expect(validatePriceItem({ label: "1개월", price: 0 })).not.toBeNull();
    expect(validatePriceItem({ label: "1개월", price: -1000 })).not.toBeNull();
    expect(
      validatePriceItem({ label: "1개월", price: 999_000_000 })
    ).not.toBeNull();
  });

  it("라벨과 가격이 유효하면 null(에러 없음)을 반환한다", () => {
    expect(validatePriceItem({ label: "PT 10회", price: 500000 })).toBeNull();
  });
});

describe("latestByGroup", () => {
  it("그룹별로 created_at이 가장 최근인 항목만 남긴다", () => {
    const items = [
      { id: "a", key: "k1", created_at: "2026-01-01T00:00:00Z" },
      { id: "b", key: "k1", created_at: "2026-02-01T00:00:00Z" },
      { id: "c", key: "k2", created_at: "2026-01-15T00:00:00Z" },
    ];
    const result = latestByGroup(items, (item) => item.key);

    expect(result).toHaveLength(2);
    expect(result.find((item) => item.key === "k1")?.id).toBe("b");
    expect(result.find((item) => item.key === "k2")?.id).toBe("c");
  });

  it("빈 배열이면 빈 배열을 반환한다", () => {
    expect(latestByGroup([], (item: { created_at: string }) => item.created_at)).toEqual([]);
  });
});

describe("summarizePrices", () => {
  it("빈 배열이면 빈 배열을 반환한다", () => {
    expect(summarizePrices([])).toEqual([]);
  });

  it("라벨별 최저가/평균가/제보수를 계산한다 (서로 다른 유저)", () => {
    const prices = [
      makePrice({ user_id: "u1", label: "1개월", price: 60000 }),
      makePrice({ user_id: "u2", label: "1개월", price: 50000 }),
      makePrice({ user_id: "u1", label: "3개월", price: 150000 }),
    ];
    const stats = summarizePrices(prices);

    const oneMonth = stats.find((s) => s.label === "1개월");
    expect(oneMonth).toEqual({ label: "1개월", min: 50000, avg: 55000, count: 2 });

    const threeMonth = stats.find((s) => s.label === "3개월");
    expect(threeMonth).toEqual({ label: "3개월", min: 150000, avg: 150000, count: 1 });
  });

  it("승인(approved)되지 않은 가격(pending/rejected)은 제외한다", () => {
    const prices = [
      makePrice({ user_id: "u1", label: "1개월", price: 30000, status: "pending" }),
      makePrice({ user_id: "u2", label: "1개월", price: 20000, status: "rejected" }),
      makePrice({ user_id: "u3", label: "1개월", price: 55000, status: "approved" }),
    ];
    const stats = summarizePrices(prices);
    expect(stats).toEqual([{ label: "1개월", min: 55000, avg: 55000, count: 1 }]);
  });

  it("같은 유저가 같은 라벨로 중복 제보하면 최신 1건만 반영한다", () => {
    const prices = [
      makePrice({
        user_id: "u1",
        label: "1개월",
        price: 80000,
        created_at: "2026-01-01T00:00:00Z",
      }),
      makePrice({
        user_id: "u1",
        label: "1개월",
        price: 40000,
        created_at: "2026-03-01T00:00:00Z", // 같은 유저의 더 최신 제보
      }),
    ];
    const stats = summarizePrices(prices);
    expect(stats).toEqual([{ label: "1개월", min: 40000, avg: 40000, count: 1 }]);
  });

  it("PT 횟수권 등 커스텀 라벨도 계산되고, 기본 4항목 뒤에 정렬된다", () => {
    const prices = [
      makePrice({ user_id: "u1", label: "PT 10회", price: 500000 }),
      makePrice({ user_id: "u2", label: "12개월", price: 540000 }),
      makePrice({ user_id: "u3", label: "1개월", price: 60000 }),
    ];
    const stats = summarizePrices(prices);
    expect(stats.map((s) => s.label)).toEqual(["1개월", "12개월", "PT 10회"]);
  });
});
