import { act, renderHook } from "@testing-library/react-native";
import { updateInterestRegion, updateUserLocation } from "../../lib/api/auth";
import { useAuthStore } from "../../store/authStore";
import type { User } from "../../types";
import { useInterestRegion, useSyncUserLocation } from "./hooks";

// api 모듈을 목으로 대체 (실제 supabase 로드 방지)
jest.mock("../../lib/api/auth", () => ({
  signInWithEmail: jest.fn(),
  signInWithOAuth: jest.fn(),
  signUpWithEmail: jest.fn(),
  updateUserLocation: jest.fn().mockResolvedValue(undefined),
  updateInterestRegion: jest.fn().mockResolvedValue(undefined),
}));

const updateUserLocationMock = updateUserLocation as jest.Mock;
const updateInterestRegionMock = updateInterestRegion as jest.Mock;

const USER: User = {
  uid: "user-1",
  email: "tester@example.com",
  nickname: "테스터",
  interest_sido: null,
  interest_sigungu: null,
  created_at: "2026-01-01T00:00:00Z",
};

interface SyncProps {
  coords: { lat: number; lng: number };
  isLocating: boolean;
}

describe("useSyncUserLocation", () => {
  beforeEach(() => {
    updateUserLocationMock.mockClear();
    useAuthStore.setState({ user: null });
  });

  it("GPS 확인 중(isLocating=true)에는 폴백 좌표로 동기화하지 않는다", async () => {
    useAuthStore.setState({ user: USER });

    const { rerender } = await renderHook(
      ({ coords, isLocating }: SyncProps) =>
        useSyncUserLocation(coords, isLocating),
      {
        initialProps: {
          coords: { lat: 37.5145, lng: 127.0596 }, // DEFAULT_COORDS(폴백)
          isLocating: true,
        },
      }
    );

    expect(updateUserLocationMock).not.toHaveBeenCalled();

    // GPS가 확정되어 isLocating이 false가 되고 실제 좌표로 바뀌면 그때 동기화한다.
    await rerender({ coords: { lat: 37.1234, lng: 127.9876 }, isLocating: false });

    expect(updateUserLocationMock).toHaveBeenCalledTimes(1);
    expect(updateUserLocationMock).toHaveBeenCalledWith(
      "user-1",
      37.1234,
      127.9876
    );
  });

  it("이미 한 번 동기화한 뒤에는 좌표가 다시 바뀌어도 재호출하지 않는다 (기존 동작 유지)", async () => {
    useAuthStore.setState({ user: USER });

    const { rerender } = await renderHook(
      ({ coords, isLocating }: SyncProps) =>
        useSyncUserLocation(coords, isLocating),
      {
        initialProps: {
          coords: { lat: 37.1, lng: 127.1 },
          isLocating: false,
        },
      }
    );
    expect(updateUserLocationMock).toHaveBeenCalledTimes(1);

    await rerender({ coords: { lat: 37.9, lng: 127.9 }, isLocating: false });
    expect(updateUserLocationMock).toHaveBeenCalledTimes(1);
  });

  it("로그인하지 않은 상태면 동기화하지 않는다", async () => {
    await renderHook(
      ({ coords, isLocating }: SyncProps) =>
        useSyncUserLocation(coords, isLocating),
      {
        initialProps: {
          coords: { lat: 37.1, lng: 127.1 },
          isLocating: false,
        },
      }
    );

    expect(updateUserLocationMock).not.toHaveBeenCalled();
  });
});

describe("useInterestRegion", () => {
  beforeEach(() => {
    updateInterestRegionMock.mockClear();
    useAuthStore.setState({ user: USER });
  });

  it("현재 유저의 관심 지역을 반환한다", async () => {
    useAuthStore.setState({
      user: { ...USER, interest_sido: "서울특별시", interest_sigungu: "강남구" },
    });

    const { result } = await renderHook(() => useInterestRegion());

    expect(result.current.sido).toBe("서울특별시");
    expect(result.current.sigungu).toBe("강남구");
  });

  it("save 호출 시 API를 호출하고 authStore의 유저 정보를 갱신한다", async () => {
    const { result } = await renderHook(() => useInterestRegion());

    await act(async () => {
      await result.current.save("서울특별시", "강남구");
    });

    expect(updateInterestRegionMock).toHaveBeenCalledWith(
      "user-1",
      "서울특별시",
      "강남구"
    );
    expect(useAuthStore.getState().user?.interest_sido).toBe("서울특별시");
    expect(useAuthStore.getState().user?.interest_sigungu).toBe("강남구");
  });

  it("clear 호출 시 관심 지역을 null로 저장한다", async () => {
    useAuthStore.setState({
      user: { ...USER, interest_sido: "서울특별시", interest_sigungu: "강남구" },
    });

    const { result } = await renderHook(() => useInterestRegion());

    await act(async () => {
      await result.current.clear();
    });

    expect(updateInterestRegionMock).toHaveBeenCalledWith("user-1", null, null);
    expect(useAuthStore.getState().user?.interest_sido).toBeNull();
  });

  it("API 실패 시 에러 메시지를 노출한다", async () => {
    updateInterestRegionMock.mockRejectedValueOnce(new Error("저장 실패"));

    const { result } = await renderHook(() => useInterestRegion());

    await act(async () => {
      await result.current.save("서울특별시", "강남구");
    });

    expect(result.current.error).toBe("저장 실패");
  });
});
