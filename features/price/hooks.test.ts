import { act, renderHook } from "@testing-library/react-native";
import type { GymPrice } from "../../types";
import { submitPrice } from "../gym/api";
import { useSubmitPrice } from "./hooks";

// api 모듈을 목으로 대체 (실제 supabase 로드 방지)
jest.mock("../gym/api", () => ({
  submitPrice: jest.fn(),
  getMyPrices: jest.fn(),
  getPrice: jest.fn(),
  updatePrice: jest.fn(),
  deletePrice: jest.fn(),
}));

const submitPriceMock = submitPrice as jest.Mock;

const baseInput = {
  gym_id: "g",
  user_id: "u",
  price_3m: null,
  price_6m: null,
  price_12m: null,
  memo: null,
};

describe("useSubmitPrice", () => {
  beforeEach(() => submitPriceMock.mockReset());

  it("가격을 하나도 입력하지 않으면 에러를 내고 API를 호출하지 않는다", async () => {
    const onSuccess = jest.fn();
    const { result } = await renderHook(() => useSubmitPrice({ onSuccess }));

    await act(async () => {
      await result.current.submit({ ...baseInput, price_1m: null });
    });

    expect(result.current.error).toBe("최소 1개 이상의 가격을 입력해주세요.");
    expect(submitPriceMock).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("유효하면 submitPrice 호출 후 onSuccess를 부른다", async () => {
    const created = { id: "p1", created_at: "x" } as GymPrice;
    submitPriceMock.mockResolvedValue(created);
    const onSuccess = jest.fn();
    const { result } = await renderHook(() => useSubmitPrice({ onSuccess }));

    await act(async () => {
      await result.current.submit({ ...baseInput, price_1m: 50000 });
    });

    expect(submitPriceMock).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(created);
    expect(result.current.error).toBeNull();
  });
});
