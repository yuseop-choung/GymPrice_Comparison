import { searchPlaces, toKakaoPlace } from "./kakao";

describe("toKakaoPlace", () => {
  it("카카오 API 응답을 앱에서 쓰는 형태로 변환한다 (road_address_name 우선)", () => {
    const place = toKakaoPlace({
      id: "1",
      place_name: "강철짐 강남점",
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
