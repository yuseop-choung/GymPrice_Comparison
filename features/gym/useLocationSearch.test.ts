import { act, renderHook } from "@testing-library/react-native";
import { searchLocations } from "../../lib/api/kakao";
import { useLocationSearch } from "./useLocationSearch";

jest.mock("../../lib/api/kakao", () => ({
  searchLocations: jest.fn(),
}));

const searchLocationsMock = searchLocations as jest.Mock;

describe("useLocationSearch", () => {
  beforeEach(() => searchLocationsMock.mockReset());

  it("검색어가 비어있으면 API를 호출하지 않고 결과를 비운다", async () => {
    const { result } = await renderHook(() => useLocationSearch());

    await act(async () => {
      await result.current.search("   ");
    });

    expect(searchLocationsMock).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
  });

  it("검색에 성공하면 결과를 채운다", async () => {
    const places = [
      { id: "1", name: "강남역", address: "서울 강남구", lat: 37.5, lng: 127.0, distanceM: null },
    ];
    searchLocationsMock.mockResolvedValue(places);
    const { result } = await renderHook(() => useLocationSearch());

    await act(async () => {
      await result.current.search("강남역");
    });

    expect(searchLocationsMock).toHaveBeenCalledWith("강남역");
    expect(result.current.results).toEqual(places);
    expect(result.current.error).toBeNull();
  });

  it("검색 실패 시 에러 메시지를 설정하고 결과는 비운다", async () => {
    searchLocationsMock.mockRejectedValue(new Error("네트워크 오류"));
    const { result } = await renderHook(() => useLocationSearch());

    await act(async () => {
      await result.current.search("강남역");
    });

    expect(result.current.error).toBe("네트워크 오류");
    expect(result.current.results).toEqual([]);
  });

  it("reset을 호출하면 결과와 에러를 비운다", async () => {
    searchLocationsMock.mockResolvedValue([
      { id: "1", name: "강남역", address: "서울", lat: 37.5, lng: 127.0, distanceM: null },
    ]);
    const { result } = await renderHook(() => useLocationSearch());

    await act(async () => {
      await result.current.search("강남역");
    });
    expect(result.current.results).toHaveLength(1);

    await act(async () => {
      result.current.reset();
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
