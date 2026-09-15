import { act, renderHook } from "@testing-library/react-native";
import type { GymPrice } from "../../types";
import { submitPrices } from "../gym/api";
import { useSubmitPrice } from "./hooks";

// api 모듈을 목으로 대체 (실제 supabase 로드 방지)
jest.mock("../gym/api", () => ({
  submitPrices: jest.fn(),
  getMyPrices: jest.fn(),
  getPrice: jest.fn(),
  updatePrice: jest.fn(),
  deletePrice: jest.fn(),
}));

const submitPricesMock = submitPrices as jest.Mock;

const baseItem = {
  gym_id: "g",
  user_id: "u",
  memo: null,
};

describe("useSubmitPrice", () => {
  beforeEach(() => submitPricesMock.mockReset());

  it("항목이 하나도 없으면 에러를 내고 API를 호출하지 않는다", async () => {
    const onSuccess = jest.fn();
    const { result } = await renderHook(() => useSubmitPrice({ onSuccess }));

    await act(async () => {
      await result.current.submit([]);
    });

    expect(result.current.error).toBe("최소 1개 이상의 가격을 입력해주세요.");
    expect(submitPricesMock).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("가격이 음수/비정상 범위면 에러를 내고 API를 호출하지 않는다", async () => {
    const onSuccess = jest.fn();
    const { result } = await renderHook(() => useSubmitPrice({ onSuccess }));

    await act(async () => {
      await result.current.submit([{ ...baseItem, label: "1개월", price: -5000 }]);
    });

    expect(result.current.error).not.toBeNull();
    expect(submitPricesMock).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("라벨이 비어있으면 에러를 내고 API를 호출하지 않는다", async () => {
    const { result } = await renderHook(() => useSubmitPrice());

    await act(async () => {
      await result.current.submit([{ ...baseItem, label: "  ", price: 50000 }]);
    });

    expect(result.current.error).not.toBeNull();
    expect(submitPricesMock).not.toHaveBeenCalled();
  });

  it("유효하면 submitPrices를 배열로 호출하고 성공 시 onSuccess를 부른다", async () => {
    const created = [{ id: "p1", created_at: "x" } as GymPrice];
    submitPricesMock.mockResolvedValue(created);
    const onSuccess = jest.fn();
    const { result } = await renderHook(() => useSubmitPrice({ onSuccess }));

    const items = [
      { ...baseItem, label: "1개월", price: 50000 },
      { ...baseItem, label: "PT 10회", price: 500000 },
    ];

    await act(async () => {
      await result.current.submit(items);
    });

    expect(submitPricesMock).toHaveBeenCalledWith(items);
    expect(onSuccess).toHaveBeenCalledWith(created);
    expect(result.current.error).toBeNull();
  });
});
