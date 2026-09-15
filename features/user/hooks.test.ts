import { act, renderHook, waitFor } from "@testing-library/react-native";
import { updateUserLocation } from "../../lib/api/auth";
import {
  addInterestRegion,
  getInterestRegions,
  removeInterestRegion,
} from "../../lib/api/interestRegions";
import { useAuthStore } from "../../store/authStore";
import type { InterestRegion, User } from "../../types";
import { useInterestRegions, useSyncUserLocation } from "./hooks";

// api 모듈을 목으로 대체 (실제 supabase 로드 방지)
jest.mock("../../lib/api/auth", () => ({
  signInWithEmail: jest.fn(),
  signInWithOAuth: jest.fn(),
  signUpWithEmail: jest.fn(),
  updateUserLocation: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../lib/api/interestRegions", () => ({
  getInterestRegions: jest.fn().mockResolvedValue([]),
  addInterestRegion: jest.fn(),
  removeInterestRegion: jest.fn().mockResolvedValue(undefined),
}));

const updateUserLocationMock = updateUserLocation as jest.Mock;
const getInterestRegionsMock = getInterestRegions as jest.Mock;
const addInterestRegionMock = addInterestRegion as jest.Mock;
const removeInterestRegionMock = removeInterestRegion as jest.Mock;

const USER: User = {
  uid: "user-1",
  email: "tester@example.com",
  nickname: "테스터",
  created_at: "2026-01-01T00:00:00Z",
};

function makeRegion(sido: string, sigungu: string, id = `${sido}-${sigungu}`): InterestRegion {
  return { id, user_id: "user-1", sido, sigungu, created_at: "2026-01-01T00:00:00Z" };
}

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

describe("useInterestRegions", () => {
  beforeEach(() => {
    getInterestRegionsMock.mockReset().mockResolvedValue([]);
    addInterestRegionMock.mockReset();
    removeInterestRegionMock.mockReset().mockResolvedValue(undefined);
    useAuthStore.setState({ user: USER });
  });

  it("로그인 유저의 관심 지역 목록을 불러온다", async () => {
    getInterestRegionsMock.mockResolvedValue([makeRegion("서울특별시", "강남구")]);

    const { result } = await renderHook(() => useInterestRegions());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.regions).toEqual([makeRegion("서울특별시", "강남구")]);
  });

  it("add 호출 시 API를 호출하고 목록에 추가한다", async () => {
    const newRegion = makeRegion("서울특별시", "강남구");
    addInterestRegionMock.mockResolvedValue(newRegion);

    const { result } = await renderHook(() => useInterestRegions());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.add("서울특별시", "강남구");
    });

    expect(addInterestRegionMock).toHaveBeenCalledWith("user-1", "서울특별시", "강남구");
    expect(result.current.regions).toEqual([newRegion]);
  });

  it("이미 5개면 API를 호출하지 않고 에러를 낸다", async () => {
    getInterestRegionsMock.mockResolvedValue([
      makeRegion("a", "1"),
      makeRegion("a", "2"),
      makeRegion("a", "3"),
      makeRegion("a", "4"),
      makeRegion("a", "5"),
    ]);

    const { result } = await renderHook(() => useInterestRegions());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.add("서울특별시", "강남구");
    });

    expect(addInterestRegionMock).not.toHaveBeenCalled();
    expect(result.current.error).toBe("관심 지역은 최대 5개까지 설정할 수 있어요.");
  });

  it("이미 추가된 지역이면 API를 호출하지 않는다", async () => {
    getInterestRegionsMock.mockResolvedValue([makeRegion("서울특별시", "강남구")]);

    const { result } = await renderHook(() => useInterestRegions());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.add("서울특별시", "강남구");
    });

    expect(addInterestRegionMock).not.toHaveBeenCalled();
    expect(result.current.error).toBe("이미 추가된 지역이에요.");
  });

  it("remove 호출 시 API를 호출하고 목록에서 제거한다", async () => {
    const region = makeRegion("서울특별시", "강남구", "region-1");
    getInterestRegionsMock.mockResolvedValue([region]);

    const { result } = await renderHook(() => useInterestRegions());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.remove("region-1");
    });

    expect(removeInterestRegionMock).toHaveBeenCalledWith("region-1");
    expect(result.current.regions).toEqual([]);
  });
});
