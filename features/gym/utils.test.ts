import { distanceKm, formatDistance, isValidCoordinate, isWithinBounds } from "./utils";

describe("distanceKm", () => {
  it("같은 좌표는 0", () => {
    expect(distanceKm(37.5, 127, 37.5, 127)).toBe(0);
  });

  it("위도 1도 차이는 약 111km", () => {
    expect(distanceKm(0, 0, 1, 0)).toBeCloseTo(111.19, 0);
  });

  it("대칭이다 (A→B == B→A)", () => {
    const ab = distanceKm(37.5, 127, 37.6, 127.1);
    const ba = distanceKm(37.6, 127.1, 37.5, 127);
    expect(ab).toBeCloseTo(ba, 6);
  });
});

describe("formatDistance", () => {
  it("1km 미만은 m 단위로 반올림", () => {
    expect(formatDistance(0.35)).toBe("350m");
    expect(formatDistance(0.999)).toBe("999m");
  });

  it("1km 이상은 소수 1자리 km", () => {
    expect(formatDistance(1)).toBe("1.0km");
    expect(formatDistance(1.234)).toBe("1.2km");
  });
});

describe("isWithinBounds", () => {
  const bounds = { swLat: 37.0, swLng: 127.0, neLat: 37.5, neLng: 127.5 };

  it("영역 안쪽 좌표는 true", () => {
    expect(isWithinBounds({ lat: 37.25, lng: 127.25 }, bounds)).toBe(true);
  });

  it("경계선 위(포함) 좌표도 true", () => {
    expect(isWithinBounds({ lat: 37.0, lng: 127.0 }, bounds)).toBe(true);
    expect(isWithinBounds({ lat: 37.5, lng: 127.5 }, bounds)).toBe(true);
  });

  it("영역 바깥 좌표는 false", () => {
    expect(isWithinBounds({ lat: 36.9, lng: 127.25 }, bounds)).toBe(false);
    expect(isWithinBounds({ lat: 37.25, lng: 127.6 }, bounds)).toBe(false);
  });
});

describe("isValidCoordinate", () => {
  it("정상 범위의 위경도는 true", () => {
    expect(isValidCoordinate(37.5, 127.0)).toBe(true);
    expect(isValidCoordinate(-90, -180)).toBe(true); // 경계값(포함)
    expect(isValidCoordinate(90, 180)).toBe(true); // 경계값(포함)
  });

  it("위도/경도 범위를 벗어나면 false", () => {
    expect(isValidCoordinate(999, 127.0)).toBe(false);
    expect(isValidCoordinate(37.5, -500)).toBe(false);
    expect(isValidCoordinate(-91, 0)).toBe(false);
    expect(isValidCoordinate(0, 181)).toBe(false);
  });

  it("NaN/Infinity는 false", () => {
    expect(isValidCoordinate(NaN, 127.0)).toBe(false);
    expect(isValidCoordinate(37.5, Infinity)).toBe(false);
  });
});
