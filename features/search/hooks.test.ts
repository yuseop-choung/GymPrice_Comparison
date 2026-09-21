import { act, renderHook } from "@testing-library/react-native";
import { searchLocations } from "../../lib/api/kakao";
import { searchGyms } from "../gym/api";
import { useUnifiedSearch } from "./hooks";

jest.mock("../gym/api", () => ({ searchGyms: jest.fn() }));
jest.mock("../../lib/api/kakao", () => ({ searchLocations: jest.fn() }));

const searchGymsMock = searchGyms as jest.Mock;
const searchLocationsMock = searchLocations as jest.Mock;

describe("useUnifiedSearch", () => {
  beforeEach(() => {
    searchGymsMock.mockReset();
    searchLocationsMock.mockReset();
  });

  it("검색어가 비어있으면 API를 호출하지 않고 결과를 비운다", async () => {
    const { result } = await renderHook(() => useUnifiedSearch());

    await act(async () => {
      await result.current.search("   ");
    });

    expect(searchGymsMock).not.toHaveBeenCalled();
    expect(searchLocationsMock).not.toHaveBeenCalled();
    expect(result.current.gymResults).toEqual([]);
    expect(result.current.placeResults).toEqual([]);
  });

  it("헬스장/장소 검색을 병렬로 실행하고 둘 다 결과에 채운다", async () => {
    const gyms = [{ id: "g1", name: "강철짐", address: "서울", lat: 37.5, lng: 127, created_at: "" }];
    const places = [{ id: "p1", name: "강남역", address: "서울", lat: 37.5, lng: 127, distanceM: null }];
    searchGymsMock.mockResolvedValue(gyms);
    searchLocationsMock.mockResolvedValue(places);

    const { result } = await renderHook(() => useUnifiedSearch());
    await act(async () => {
      await result.current.search("강남");
    });

    expect(searchGymsMock).toHaveBeenCalledWith("강남");
    expect(searchLocationsMock).toHaveBeenCalledWith("강남");
    expect(result.current.gymResults).toEqual(gyms);
    expect(result.current.placeResults).toEqual(places);
    expect(result.current.error).toBeNull();
    expect(result.current.hasSearched).toBe(true);
  });

  it("한쪽만 실패하면 성공한 쪽 결과는 그대로 보여주고 에러는 띄우지 않는다", async () => {
    searchGymsMock.mockRejectedValue(new Error("DB 오류"));
    searchLocationsMock.mockResolvedValue([
      { id: "p1", name: "강남역", address: "서울", lat: 37.5, lng: 127, distanceM: null },
    ]);

    const { result } = await renderHook(() => useUnifiedSearch());
    await act(async () => {
      await result.current.search("강남");
    });

    expect(result.current.gymResults).toEqual([]);
    expect(result.current.placeResults).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it("둘 다 실패하면 에러 메시지를 설정한다", async () => {
    searchGymsMock.mockRejectedValue(new Error("DB 오류"));
    searchLocationsMock.mockRejectedValue(new Error("네트워크 오류"));

    const { result } = await renderHook(() => useUnifiedSearch());
    await act(async () => {
      await result.current.search("강남");
    });

    expect(result.current.error).toBe("검색에 실패했습니다.");
  });

  it("reset을 호출하면 결과와 검색 여부를 모두 비운다", async () => {
    searchGymsMock.mockResolvedValue([
      { id: "g1", name: "강철짐", address: "서울", lat: 37.5, lng: 127, created_at: "" },
    ]);
    searchLocationsMock.mockResolvedValue([]);

    const { result } = await renderHook(() => useUnifiedSearch());
    await act(async () => {
      await result.current.search("강남");
    });
    expect(result.current.gymResults).toHaveLength(1);

    await act(async () => {
      result.current.reset();
    });

    expect(result.current.gymResults).toEqual([]);
    expect(result.current.hasSearched).toBe(false);
  });
});
