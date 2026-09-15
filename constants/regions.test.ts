import { REGIONS } from "./regions";

describe("REGIONS", () => {
  it("모든 시/도는 이름이 유일하고 시/군/구를 최소 1개 이상 가진다", () => {
    const sidoNames = REGIONS.map((group) => group.sido);
    expect(new Set(sidoNames).size).toBe(sidoNames.length);

    for (const group of REGIONS) {
      expect(group.sigungu.length).toBeGreaterThan(0);
    }
  });

  it("같은 시/도 안에서 시/군/구 이름이 중복되지 않는다", () => {
    for (const group of REGIONS) {
      expect(new Set(group.sigungu).size).toBe(group.sigungu.length);
    }
  });
});
