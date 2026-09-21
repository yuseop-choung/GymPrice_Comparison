import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { useAuthStore } from "../../store/authStore";
import type { Gym, GymDetail, GymWithPrice, User } from "../../types";
import {
  getGymDetail,
  getNearbyGyms,
  registerGym,
  saveGymDetail,
  searchGyms,
} from "./api";
import {
  useEditGymDetail,
  useGymDetailGate,
  useMapFocus,
  useNearbyGyms,
  useRegisterGym,
  useSearchGyms,
} from "./hooks";

// api 모듈을 목으로 대체 (실제 supabase 로드 방지)
jest.mock("./api", () => ({
  getGymDetail: jest.fn(),
  saveGymDetail: jest.fn(),
  getNearbyGyms: jest.fn(),
  getGymWithPrices: jest.fn(),
  registerGym: jest.fn(),
  searchGyms: jest.fn(),
}));

const mockPush = jest.fn();
const mockUseLocalSearchParams = jest.fn(() => ({}) as Record<string, string | undefined>);
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

// useAuthStore가 내부적으로 로드하는 lib/api/auth → lib/supabase가 테스트 환경(.env
// 없음)에서 바로 에러를 던지므로, 이 훅들이 실제로 쓰는 export만 목으로 대체한다.
jest.mock("../../lib/api/auth", () => ({
  getCurrentUser: jest.fn(),
  signOut: jest.fn(),
}));

const getGymDetailMock = getGymDetail as jest.Mock;
const saveGymDetailMock = saveGymDetail as jest.Mock;
const getNearbyGymsMock = getNearbyGyms as jest.Mock;
const registerGymMock = registerGym as jest.Mock;
const searchGymsMock = searchGyms as jest.Mock;

const DETAIL: GymDetail = {
  id: "d1",
  gym_id: "g1",
  equipment_brand: "테크노짐",
  cleanliness: 5,
  trainer_count: 3,
  memo: "깨끗해요",
};

const SUSPENDED_USER: User = {
  uid: "u1",
  email: "suspended@example.com",
  nickname: "정지유저",
  is_admin: false,
  is_suspended: true,
  created_at: "2026-01-01T00:00:00Z",
};

const NORMAL_USER: User = {
  uid: "u2",
  email: "normal@example.com",
  nickname: "일반유저",
  is_admin: false,
  is_suspended: false,
  created_at: "2026-01-01T00:00:00Z",
};

describe("useEditGymDetail", () => {
  beforeEach(() => {
    getGymDetailMock.mockReset();
    saveGymDetailMock.mockReset().mockResolvedValue(undefined);
    useAuthStore.setState({ user: null });
  });

  it("기존 값이 있으면 그대로 initial에 반영하고 loadError는 없다", async () => {
    getGymDetailMock.mockResolvedValue(DETAIL);
    const onDone = jest.fn();

    const { result } = await renderHook(() => useEditGymDetail("g1", onDone));

    await waitFor(() =>
      expect(result.current.initial).toEqual({
        equipment_brand: "테크노짐",
        cleanliness: 5,
        trainer_count: 3,
        memo: "깨끗해요",
      })
    );
    expect(result.current.loadError).toBeNull();
  });

  it("등록된 부가정보가 없으면(null) 빈 값으로 initial을 채우고 loadError는 없다", async () => {
    getGymDetailMock.mockResolvedValue(null);
    const onDone = jest.fn();

    const { result } = await renderHook(() => useEditGymDetail("g1", onDone));

    await waitFor(() =>
      expect(result.current.initial).toEqual({
        equipment_brand: null,
        cleanliness: null,
        trainer_count: null,
        memo: null,
      })
    );
    expect(result.current.loadError).toBeNull();
  });

  it("조회 자체가 실패하면(네트워크/권한/서버 오류) initial은 null로 남고 loadError가 채워진다 " +
    "— 실패를 빈 값으로 취급해 실제 데이터를 덮어쓰는 걸 막는다", async () => {
    getGymDetailMock.mockRejectedValue(new Error("네트워크 오류"));
    const onDone = jest.fn();

    const { result } = await renderHook(() => useEditGymDetail("g1", onDone));

    await waitFor(() => expect(result.current.loadError).toBe("네트워크 오류"));
    expect(result.current.initial).toBeNull();
  });

  it("정지된 계정이면 저장을 시도하지 않고 안내 메시지를 낸다", async () => {
    getGymDetailMock.mockResolvedValue(DETAIL);
    useAuthStore.setState({ user: SUSPENDED_USER });
    const onDone = jest.fn();

    const { result } = await renderHook(() => useEditGymDetail("g1", onDone));
    await waitFor(() => expect(result.current.initial).not.toBeNull());

    await act(async () => {
      await result.current.save({
        equipment_brand: "새 브랜드",
        cleanliness: 4,
        trainer_count: 2,
        memo: null,
      });
    });

    expect(saveGymDetailMock).not.toHaveBeenCalled();
    expect(result.current.error).toContain("정지된 계정");
    expect(onDone).not.toHaveBeenCalled();
  });
});

describe("useRegisterGym", () => {
  beforeEach(() => {
    registerGymMock.mockReset();
    useAuthStore.setState({ user: null });
  });

  it("위경도가 유효 범위(위도 -90~90, 경도 -180~180)를 벗어나면 등록하지 않는다", async () => {
    useAuthStore.setState({ user: NORMAL_USER });
    const onSuccess = jest.fn();
    const { result } = await renderHook(() => useRegisterGym({ onSuccess }));

    await act(async () => {
      await result.current.submit({
        name: "강철짐",
        address: null,
        lat: 999,
        lng: 127.0,
        phone: null,
      });
    });

    expect(registerGymMock).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.error).toContain("위치");
  });

  it("이름과 위경도가 유효하면 등록하고 onSuccess를 부른다", async () => {
    useAuthStore.setState({ user: NORMAL_USER });
    const created: Gym = {
      id: "g1",
      name: "강철짐",
      address: null,
      lat: 37.5,
      lng: 127.0,
      phone: null,
      created_at: "2026-01-01T00:00:00Z",
    };
    registerGymMock.mockResolvedValue(created);
    const onSuccess = jest.fn();

    const { result } = await renderHook(() => useRegisterGym({ onSuccess }));

    await act(async () => {
      await result.current.submit({
        name: "강철짐",
        address: null,
        lat: 37.5,
        lng: 127.0,
        phone: null,
      });
    });

    expect(registerGymMock).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith(created);
    expect(result.current.error).toBeNull();
  });

  it("로그인하지 않았으면 입력이 유효해도 등록을 시도하지 않는다", async () => {
    const { result } = await renderHook(() => useRegisterGym());

    await act(async () => {
      await result.current.submit({
        name: "강철짐",
        address: null,
        lat: 37.5,
        lng: 127.0,
        phone: null,
      });
    });

    expect(registerGymMock).not.toHaveBeenCalled();
    expect(result.current.error).toBe("로그인이 필요합니다.");
  });

  it("정지된 계정이면 입력이 유효해도 등록을 시도하지 않는다", async () => {
    useAuthStore.setState({ user: SUSPENDED_USER });
    const { result } = await renderHook(() => useRegisterGym());

    await act(async () => {
      await result.current.submit({
        name: "강철짐",
        address: null,
        lat: 37.5,
        lng: 127.0,
        phone: null,
      });
    });

    expect(registerGymMock).not.toHaveBeenCalled();
    expect(result.current.error).toContain("정지된 계정");
  });
});

describe("useSearchGyms", () => {
  beforeEach(() => {
    searchGymsMock.mockReset();
  });

  it("검색어가 비어있으면 API를 호출하지 않고 결과를 비운다", async () => {
    const { result } = await renderHook(() => useSearchGyms());

    await act(async () => {
      await result.current.search("  ");
    });

    expect(searchGymsMock).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
    expect(result.current.hasSearched).toBe(false);
  });

  it("검색에 성공하면 결과를 채우고 hasSearched를 true로 바꾼다", async () => {
    const found: Gym = {
      id: "g1",
      name: "강철짐",
      address: "서울 강남구",
      lat: 37.5,
      lng: 127.0,
      phone: null,
      created_at: "2026-01-01T00:00:00Z",
    };
    searchGymsMock.mockResolvedValue([found]);

    const { result } = await renderHook(() => useSearchGyms());
    await act(async () => {
      await result.current.search("강철짐");
    });

    expect(searchGymsMock).toHaveBeenCalledWith("강철짐");
    expect(result.current.results).toEqual([found]);
    expect(result.current.hasSearched).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("검색 실패 시 에러 메시지를 채우고 hasSearched도 true가 된다", async () => {
    searchGymsMock.mockRejectedValue(new Error("네트워크 오류"));

    const { result } = await renderHook(() => useSearchGyms());
    await act(async () => {
      await result.current.search("강철짐");
    });

    expect(result.current.error).toBe("네트워크 오류");
    expect(result.current.hasSearched).toBe(true);
  });

  it("reset()을 호출하면 결과/에러/hasSearched를 모두 초기화한다", async () => {
    searchGymsMock.mockResolvedValue([]);
    const { result } = await renderHook(() => useSearchGyms());
    await act(async () => {
      await result.current.search("강철짐");
    });
    expect(result.current.hasSearched).toBe(true);

    await act(async () => {
      result.current.reset();
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.hasSearched).toBe(false);
  });
});

describe("useGymDetailGate", () => {
  beforeEach(() => {
    mockPush.mockClear();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("로그인 상태면 곧바로 헬스장 상세로 이동한다", async () => {
    useAuthStore.setState({ user: NORMAL_USER });
    const { result } = await renderHook(() => useGymDetailGate());

    result.current.openGymDetail("g1");

    expect(mockPush).toHaveBeenCalledWith("/gym/g1");
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it("비로그인 상태면 이동하지 않고 로그인을 유도하는 안내를 보여준다", async () => {
    useAuthStore.setState({ user: null });
    const { result } = await renderHook(() => useGymDetailGate());

    result.current.openGymDetail("g1");

    expect(mockPush).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      "로그인이 필요해요",
      expect.any(String),
      expect.any(Array)
    );
  });

  it("안내에서 '로그인하기'를 누르면 로그인 화면으로 이동한다", async () => {
    useAuthStore.setState({ user: null });
    const { result } = await renderHook(() => useGymDetailGate());

    result.current.openGymDetail("g1");

    const alertMock = Alert.alert as jest.Mock;
    const buttons = alertMock.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    buttons.find((b) => b.text === "로그인하기")?.onPress?.();

    expect(mockPush).toHaveBeenCalledWith("/login");
  });
});

function makeGym(id: string): GymWithPrice {
  return {
    id,
    name: `gym-${id}`,
    address: null,
    lat: 37.5,
    lng: 127.0,
    phone: null,
    created_at: "2026-01-01T00:00:00Z",
    lowest_price_1m: null,
  };
}

describe("useNearbyGyms", () => {
  beforeEach(() => {
    getNearbyGymsMock.mockReset().mockResolvedValue([makeGym("g1")]);
  });

  it("enabled(기본값 true)면 바로 조회한다", async () => {
    const { result } = await renderHook(() => useNearbyGyms(37.5, 127.0, 3));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(getNearbyGymsMock).toHaveBeenCalledWith(37.5, 127.0, 3);
    expect(result.current.gyms).toHaveLength(1);
  });

  it("enabled=false면 GPS가 아직 확정되지 않은 것으로 보고 조회하지 않는다", async () => {
    const { result } = await renderHook(() =>
      useNearbyGyms(37.5, 127.0, 3, false)
    );

    // enabled가 false인 동안은 로딩 상태 그대로 유지되고, API도 호출되지 않는다.
    expect(getNearbyGymsMock).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(true);
  });

  it("enabled가 false에서 true로 바뀌면(GPS 확정) 그제서야 조회한다", async () => {
    const { result, rerender } = await renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useNearbyGyms(37.5, 127.0, 3, enabled),
      { initialProps: { enabled: false } }
    );
    expect(getNearbyGymsMock).not.toHaveBeenCalled();

    await rerender({ enabled: true });

    await waitFor(() => expect(getNearbyGymsMock).toHaveBeenCalledTimes(1));
    expect(result.current.isLoading).toBe(false);
  });

  it("refetch()도 enabled=false인 동안은 아무 일도 하지 않는다", async () => {
    const { result } = await renderHook(() =>
      useNearbyGyms(37.5, 127.0, 3, false)
    );

    await act(async () => {
      result.current.refetch();
    });

    expect(getNearbyGymsMock).not.toHaveBeenCalled();
  });
});

describe("useMapFocus", () => {
  beforeEach(() => {
    mockUseLocalSearchParams.mockReturnValue({});
  });

  it("focus 파라미터가 없으면 GPS 좌표를 그대로 쓴다", async () => {
    const gps = { lat: 37.5, lng: 127.0 };
    const { result } = await renderHook(() => useMapFocus(gps));

    expect(result.current.effectiveCoords).toEqual(gps);
    expect(result.current.isSearchFocused).toBe(false);
  });

  it("focusLat/focusLng가 있으면 그 위치를 기준으로 쓴다", async () => {
    mockUseLocalSearchParams.mockReturnValue({
      focusLat: "37.123",
      focusLng: "127.456",
    });
    const gps = { lat: 37.5, lng: 127.0 };
    const { result } = await renderHook(() => useMapFocus(gps));

    expect(result.current.effectiveCoords).toEqual({ lat: 37.123, lng: 127.456 });
    expect(result.current.isSearchFocused).toBe(true);
  });

  it("clearFocus를 호출하면 GPS 좌표로 되돌아간다", async () => {
    mockUseLocalSearchParams.mockReturnValue({
      focusLat: "37.123",
      focusLng: "127.456",
    });
    const gps = { lat: 37.5, lng: 127.0 };
    const { result } = await renderHook(() => useMapFocus(gps));
    expect(result.current.isSearchFocused).toBe(true);

    await act(async () => {
      result.current.clearFocus();
    });

    expect(result.current.effectiveCoords).toEqual(gps);
    expect(result.current.isSearchFocused).toBe(false);
  });
});
