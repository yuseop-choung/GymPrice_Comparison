import * as Location from "expo-location";
import { DEFAULT_COORDS } from "../constants/config";
import { useLocationStore } from "./locationStore";

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { High: 6 },
}));

const requestForegroundPermissionsAsyncMock =
  Location.requestForegroundPermissionsAsync as jest.Mock;
const getCurrentPositionAsyncMock = Location.getCurrentPositionAsync as jest.Mock;

describe("useLocationStore", () => {
  beforeEach(() => {
    requestForegroundPermissionsAsyncMock.mockReset();
    getCurrentPositionAsyncMock.mockReset();
    useLocationStore.setState({
      coords: { ...DEFAULT_COORDS },
      isLoading: true,
      error: null,
      hasRequested: false,
    });
  });

  it("권한이 허용되면 GPS 좌표로 갱신하고 isLoading을 false로 바꾼다", async () => {
    requestForegroundPermissionsAsyncMock.mockResolvedValue({ status: "granted" });
    getCurrentPositionAsyncMock.mockResolvedValue({
      coords: { latitude: 37.1, longitude: 127.1 },
    });

    await useLocationStore.getState().load();

    expect(useLocationStore.getState().coords).toEqual({ lat: 37.1, lng: 127.1 });
    expect(useLocationStore.getState().isLoading).toBe(false);
    expect(useLocationStore.getState().error).toBeNull();
  });

  it("권한이 거부되면 DEFAULT_COORDS를 유지하고 안내 메시지를 채운다", async () => {
    requestForegroundPermissionsAsyncMock.mockResolvedValue({ status: "denied" });

    await useLocationStore.getState().load();

    expect(useLocationStore.getState().coords).toEqual(DEFAULT_COORDS);
    expect(useLocationStore.getState().error).toBe(
      "위치 권한이 없어 기본 위치를 표시합니다."
    );
    expect(useLocationStore.getState().isLoading).toBe(false);
    expect(getCurrentPositionAsyncMock).not.toHaveBeenCalled();
  });

  it("GPS 조회 중 예외가 나면 에러 메시지를 채운다", async () => {
    requestForegroundPermissionsAsyncMock.mockResolvedValue({ status: "granted" });
    getCurrentPositionAsyncMock.mockRejectedValue(new Error("GPS timeout"));

    await useLocationStore.getState().load();

    expect(useLocationStore.getState().error).toBe("GPS timeout");
    expect(useLocationStore.getState().isLoading).toBe(false);
  });

  it("이미 요청했으면(hasRequested) 다시 부르는 GPS API를 다시 호출하지 않는다 " +
    "— 여러 화면이 동시에 위치를 써도 중복 요청을 막는다", async () => {
    requestForegroundPermissionsAsyncMock.mockResolvedValue({ status: "granted" });
    getCurrentPositionAsyncMock.mockResolvedValue({
      coords: { latitude: 37.1, longitude: 127.1 },
    });

    await Promise.all([
      useLocationStore.getState().load(),
      useLocationStore.getState().load(),
      useLocationStore.getState().load(),
    ]);

    expect(requestForegroundPermissionsAsyncMock).toHaveBeenCalledTimes(1);
  });
});
