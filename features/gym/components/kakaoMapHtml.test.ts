import { buildHtml, parseMapMessage } from "./kakaoMapHtml";

describe("buildHtml", () => {
  it("마커 이름에 </script>가 포함돼도 스크립트 태그를 조기 종료시키지 않는다", () => {
    const malicious = "짐</script><script>alert(1)</script>";
    const html = buildHtml({ lat: 37.5, lng: 127.0 }, [
      { id: "g1", name: malicious, lat: 37.5, lng: 127.0, label: "1,000원" },
    ]);

    // 정상적으로 존재해야 하는 </script> 태그는 2개
    // (카카오 SDK 로더 script + 마커 렌더링 script) 뿐이어야 한다.
    const closingScriptCount = (html.match(/<\/script>/gi) ?? []).length;
    expect(closingScriptCount).toBe(2);

    // 주입 시도한 </script>는 이스케이프된 형태로만 존재해야 한다.
    expect(html).toContain("\\u003c/script");
  });

  it("<!-- 도 스크립트 파싱에 영향을 주지 않도록 이스케이프한다", () => {
    const html = buildHtml({ lat: 37.5, lng: 127.0 }, [
      { id: "g1", name: "짐<!--", lat: 37.5, lng: 127.0, label: "-" },
    ]);
    expect(html).toContain("\\u003c!--");
  });

  it("정상적인 이름은 그대로 표시된다", () => {
    const html = buildHtml({ lat: 37.5, lng: 127.0 }, [
      { id: "g1", name: "일반 헬스장", lat: 37.5, lng: 127.0, label: "50,000원" },
    ]);
    expect(html).toContain("일반 헬스장");
  });
});

describe("parseMapMessage", () => {
  it("마커 클릭 메시지를 해석한다", () => {
    const message = parseMapMessage(JSON.stringify({ type: "marker", id: "gym-1" }));
    expect(message).toEqual({ type: "marker", id: "gym-1" });
  });

  it("지도 영역 변경 메시지를 해석한다", () => {
    const message = parseMapMessage(
      JSON.stringify({ type: "bounds", swLat: 37.1, swLng: 127.0, neLat: 37.2, neLng: 127.1 })
    );
    expect(message).toEqual({
      type: "bounds",
      swLat: 37.1,
      swLng: 127.0,
      neLat: 37.2,
      neLng: 127.1,
    });
  });

  it("JSON이 아니거나 형식이 다른 메시지는 null을 반환한다(무시하도록)", () => {
    expect(parseMapMessage("gym-1")).toBeNull(); // 이전 형식(순수 문자열 id)
    expect(parseMapMessage("{}")).toBeNull();
    expect(parseMapMessage(JSON.stringify({ type: "marker", id: 123 }))).toBeNull();
    expect(
      parseMapMessage(JSON.stringify({ type: "bounds", swLat: "37.1" }))
    ).toBeNull();
    expect(parseMapMessage("not json at all")).toBeNull();
  });
});
