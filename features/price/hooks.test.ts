import { act, renderHook } from "@testing-library/react-native";
import { recordGymPriceView } from "../../lib/api/priceViews";
import { useAuthStore } from "../../store/authStore";
import type { GymPrice, User } from "../../types";
import { submitPrices } from "../gym/api";
import { useDetailPriceAccess, useSubmitPrice } from "./hooks";

// api 모듈을 목으로 대체 (실제 supabase 로드 방지)
jest.mock("../gym/api", () => ({
  submitPrices: jest.fn(),
  getMyPrices: jest.fn(),
  getPrice: jest.fn(),
  updatePrice: jest.fn(),
  deletePrice: jest.fn(),
}));

// useAuthStore가 내부적으로 로드하는 lib/api/auth → lib/supabase가 테스트 환경(.env
// 없음)에서 바로 에러를 던지므로, 이 훅이 실제로 쓰는 export만 목으로 대체한다.
jest.mock("../../lib/api/auth", () => ({
  getCurrentUser: jest.fn(),
  signOut: jest.fn(),
}));

// lib/api/priceViews도 같은 이유(내부적으로 lib/supabase를 로드)로 목 처리한다.
jest.mock("../../lib/api/priceViews", () => ({
  recordGymPriceView: jest.fn(),
}));

const submitPricesMock = submitPrices as jest.Mock;
const recordGymPriceViewMock = recordGymPriceView as jest.Mock;

const SUSPENDED_USER: User = {
  uid: "u",
  email: "suspended@example.com",
  nickname: "정지유저",
  is_admin: false,
  is_suspended: true,
  created_at: "2026-01-01T00:00:00Z",
};

const baseItem = {
  gym_id: "g",
  user_id: "u",
  memo: null,
};

describe("useSubmitPrice", () => {
  beforeEach(() => {
    submitPricesMock.mockReset();
    useAuthStore.setState({ user: null });
  });

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

  it("정지된 계정이면 유효한 입력이어도 API를 호출하지 않고 안내 메시지를 낸다", async () => {
    useAuthStore.setState({ user: SUSPENDED_USER });
    const { result } = await renderHook(() => useSubmitPrice());

    await act(async () => {
      await result.current.submit([{ ...baseItem, label: "1개월", price: 50000 }]);
    });

    expect(submitPricesMock).not.toHaveBeenCalled();
    expect(result.current.error).toContain("정지된 계정");
  });
});

describe("useDetailPriceAccess", () => {
  beforeEach(() => {
    recordGymPriceViewMock.mockReset();
  });

  it("허용되면(contributor/한도 내) true를 반환하고 한도 모달을 띄우지 않는다", async () => {
    recordGymPriceViewMock.mockResolvedValue({
      allowed: true,
      reason: "within_limit",
      remaining: 2,
    });
    const { result } = await renderHook(() => useDetailPriceAccess("gym-1"));

    let allowed = false;
    await act(async () => {
      allowed = await result.current.requestAccess();
    });

    expect(allowed).toBe(true);
    expect(recordGymPriceViewMock).toHaveBeenCalledWith("gym-1");
    expect(result.current.limitReached).toBe(false);
  });

  it("한도를 넘으면 false를 반환하고 limitReached를 true로 바꾼다", async () => {
    recordGymPriceViewMock.mockResolvedValue({
      allowed: false,
      reason: "daily_limit_reached",
      remaining: 0,
    });
    const { result } = await renderHook(() => useDetailPriceAccess("gym-1"));

    let allowed = true;
    await act(async () => {
      allowed = await result.current.requestAccess();
    });

    expect(allowed).toBe(false);
    expect(result.current.limitReached).toBe(true);
  });

  it("dismissLimitModal을 부르면 limitReached가 다시 false가 된다", async () => {
    recordGymPriceViewMock.mockResolvedValue({
      allowed: false,
      reason: "daily_limit_reached",
      remaining: 0,
    });
    const { result } = await renderHook(() => useDetailPriceAccess("gym-1"));

    await act(async () => {
      await result.current.requestAccess();
    });
    expect(result.current.limitReached).toBe(true);

    await act(async () => {
      result.current.dismissLimitModal();
    });
    expect(result.current.limitReached).toBe(false);
  });

  it("이미 허용된 뒤에는 다시 요청해도 서버를 다시 부르지 않는다", async () => {
    recordGymPriceViewMock.mockResolvedValue({
      allowed: true,
      reason: "within_limit",
      remaining: 2,
    });
    const { result } = await renderHook(() => useDetailPriceAccess("gym-1"));

    await act(async () => {
      await result.current.requestAccess();
    });
    await act(async () => {
      await result.current.requestAccess();
    });

    expect(recordGymPriceViewMock).toHaveBeenCalledTimes(1);
  });

  it("서버 호출이 실패하면 에러 메시지를 채우고 false를 반환한다", async () => {
    recordGymPriceViewMock.mockRejectedValue(new Error("네트워크 오류"));
    const { result } = await renderHook(() => useDetailPriceAccess("gym-1"));

    let allowed = true;
    await act(async () => {
      allowed = await result.current.requestAccess();
    });

    expect(allowed).toBe(false);
    expect(result.current.error).toBe("네트워크 오류");
  });
});
