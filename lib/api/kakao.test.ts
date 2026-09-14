import { isIrrelevantPlace, searchPlaces, toKakaoPlace } from "./kakao";

describe("toKakaoPlace", () => {
  it("카카오 API 응답을 앱에서 쓰는 형태로 변환한다 (road_address_name 우선)", () => {
    const place = toKakaoPlace({
      id: "1",
      place_name: "강철짐 강남점",
      category_name: "스포츠,레저 > 스포츠시설 > 헬스클럽",
      address_name: "서울 강남구 역삼동 123",
      road_address_name: "서울 강남구 테헤란로 1",
      x: "127.0276",
      y: "37.4979",
      distance: "350",
    });

    expect(place).toEqual({
      id: "1",
      name: "강철짐 강남점",
      address: "서울 강남구 테헤란로 1",
      lat: 37.4979,
      lng: 127.0276,
      distanceM: 350,
    });
  });

  it("road_address_name이 없으면 address_name을 쓰고, distance가 없으면 null이다", () => {
    const place = toKakaoPlace({
      id: "2",
      place_name: "헬스장",
      category_name: "스포츠,레저 > 스포츠시설 > 헬스클럽",
      address_name: "서울 강남구 역삼동 123",
      road_address_name: "",
      x: "127.0",
      y: "37.5",
      distance: "",
    });

    expect(place.address).toBe("서울 강남구 역삼동 123");
    expect(place.distanceM).toBeNull();
  });
});

describe("isIrrelevantPlace", () => {
  it("주차장/출입구 등 건물 부속 시설은 제외 대상으로 판단한다", () => {
    expect(
      isIrrelevantPlace({
        id: "1",
        place_name: "강철짐 주차장",
        category_name: "교통,수송 > 주차장",
        address_name: "",
        road_address_name: "",
        x: "0",
        y: "0",
        distance: "",
      })
    ).toBe(true);

    expect(
      isIrrelevantPlace({
        id: "2",
        place_name: "강남빌딩 출입구",
        category_name: "",
        address_name: "",
        road_address_name: "",
        x: "0",
        y: "0",
        distance: "",
      })
    ).toBe(true);
  });

  it("일반 헬스장은 제외 대상이 아니다", () => {
    expect(
      isIrrelevantPlace({
        id: "3",
        place_name: "강철짐 강남점",
        category_name: "스포츠,레저 > 스포츠시설 > 헬스클럽",
        address_name: "",
        road_address_name: "",
        x: "0",
        y: "0",
        distance: "",
      })
    ).toBe(false);
  });
});

describe("searchPlaces", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("검색어가 비어있으면 네트워크 요청 없이 빈 배열을 반환한다", async () => {
    const result = await searchPlaces("   ", { lat: 37.5, lng: 127.0 });

    expect(result).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("REST 키가 없으면(테스트 환경 기본값) 네트워크 요청 없이 빈 배열을 반환한다", async () => {
    const result = await searchPlaces("강철짐", { lat: 37.5, lng: 127.0 });

    expect(result).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("searchPlaces - REST 키가 있을 때 결과 필터링", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock("../../constants/config", () => ({ KAKAO_REST_KEY: "test-key" }));
  });

  it("주차장/출입구 등 무관한 결과는 최종 목록에서 제외된다", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        documents: [
          {
            id: "1",
            place_name: "강철짐 강남점",
            category_name: "스포츠,레저 > 스포츠시설 > 헬스클럽",
            address_name: "서울 강남구 역삼동",
            road_address_name: "서울 강남구 테헤란로 1",
            x: "127.0",
            y: "37.5",
            distance: "100",
          },
          {
            id: "2",
            place_name: "강철짐 주차장",
            category_name: "교통,수송 > 주차장",
            address_name: "서울 강남구 역삼동",
            road_address_name: "서울 강남구 테헤란로 1",
            x: "127.0",
            y: "37.5",
            distance: "90",
          },
        ],
      }),
    });

    const { searchPlaces: searchPlacesWithKey } =
      require("./kakao") as typeof import("./kakao");
    const result = await searchPlacesWithKey("강철짐", { lat: 37.5, lng: 127.0 });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("강철짐 강남점");
  });
});
