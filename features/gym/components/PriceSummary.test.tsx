import { render } from "@testing-library/react-native";
import type { GymPrice } from "../../../types";
import { PriceSummary } from "./PriceSummary";

function makePrice(price_1m: number | null): GymPrice {
  return {
    id: `p-${price_1m}`,
    gym_id: "g",
    user_id: "u",
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
