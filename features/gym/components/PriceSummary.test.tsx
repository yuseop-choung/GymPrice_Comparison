import { render } from "@testing-library/react-native";
import type { GymPrice } from "../../../types";
import { PriceSummary } from "./PriceSummary";

/** userId를 지정하지 않으면 서로 다른 유저의 제보로 취급되도록 고유값을 쓴다. */
function makePrice(label: string, price: number, userId = `u-${label}-${price}`): GymPrice {
  return {
    id: `p-${label}-${price}`,
    gym_id: "g",
    user_id: userId,
    label,
    price,
    memo: null,
    status: "approved",
    created_at: "2026-01-01T00:00:00Z",
  };
}

describe("PriceSummary", () => {
  it("최저가를 계산해 표시한다", async () => {
    // 서로 다른 유저 2명이 각각 제보한 가격 중 최저가를 보여준다.
    const { getByText } = await render(
      <PriceSummary prices={[makePrice("1개월", 60000), makePrice("1개월", 50000)]} />
    );

    expect(getByText("가격 요약")).toBeTruthy();
    expect(getByText("1개월")).toBeTruthy();
    expect(getByText("50,000원")).toBeTruthy(); // 1개월 최저가
  });

  it("제보가 없으면 항목 없이 카드 제목만 표시된다", async () => {
    const { getByText, queryByText } = await render(<PriceSummary prices={[]} />);
    expect(getByText("가격 요약")).toBeTruthy();
    expect(queryByText("1개월")).toBeNull();
  });

  it("PT 횟수권 등 커스텀 라벨도 표시된다", async () => {
    const { getByText, getAllByText } = await render(
      <PriceSummary prices={[makePrice("PT 10회", 500000)]} />
    );
    expect(getByText("PT 10회")).toBeTruthy();
    // 제보가 1건뿐이면 최저가=평균가라 "500,000원"이 두 칸(최저가/평균가)에 뜬다.
    expect(getAllByText("500,000원")).toHaveLength(2);
  });
});
