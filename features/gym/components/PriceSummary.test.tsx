import { render } from "@testing-library/react-native";
import type { GymPrice } from "../../../types";
import { PriceSummary } from "./PriceSummary";

/** userId를 지정하지 않으면 서로 다른 유저의 제보로 취급되도록 price_1m 기반 고유값을 쓴다. */
function makePrice(price_1m: number | null, userId = `u-${price_1m}`): GymPrice {
  return {
    id: `p-${price_1m}`,
    gym_id: "g",
    user_id: userId,
    price_1m,
    price_3m: null,
    price_6m: null,
    price_12m: null,
    memo: null,
    created_at: "2026-01-01T00:00:00Z",
  };
}

describe("PriceSummary", () => {
  it("최저가를 계산해 표시한다", async () => {
    // 서로 다른 유저 2명이 각각 제보한 가격 중 최저가를 보여준다.
    const { getByText } = await render(
      <PriceSummary prices={[makePrice(60000), makePrice(50000)]} />
    );

    expect(getByText("가격 요약")).toBeTruthy();
    expect(getByText("50,000원")).toBeTruthy(); // 1개월 최저가
  });

  it("데이터 없는 기간은 '-' 로 표시한다", async () => {
    const { getAllByText } = await render(
      <PriceSummary prices={[makePrice(null)]} />
    );
    // 1/3/6/12개월 최저가·평균가 모두 '-'
    expect(getAllByText("-").length).toBeGreaterThan(0);
  });
});
