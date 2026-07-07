import { distanceKm, formatDistance } from "./utils";

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
