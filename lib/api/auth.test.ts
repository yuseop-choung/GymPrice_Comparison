import { interpretResetLinkError } from "./auth";

// auth.ts가 최상단에서 import하는 lib/supabase.ts는 실제 환경변수가 없으면 즉시
// 에러를 던지도록 설계돼 있다(환경변수 누락을 조기에 알리기 위함). 순수 함수 하나만
// 테스트하는 이 파일에서도 모듈 로드 자체가 막히지 않도록 목으로 대체한다.
jest.mock("../supabase", () => ({ supabase: {} }));

describe("interpretResetLinkError", () => {
  it("error 파라미터가 없으면 null을 반환한다(정상 링크)", () => {
    expect(interpretResetLinkError({})).toBeNull();
  });

  it("error_code가 otp_expired면 만료 안내 메시지를 반환한다", () => {
    expect(
      interpretResetLinkError({ error: "access_denied", error_code: "otp_expired" })
    ).toBe("재설정 링크가 만료됐습니다. 다시 요청해주세요.");
  });

  it("그 외 에러는 Supabase가 보낸 error_description을 그대로 보여준다", () => {
    expect(
      interpretResetLinkError({
        error: "access_denied",
        error_code: "something_else",
        error_description: "Custom reason",
      })
    ).toBe("Custom reason");
  });

  it("error_description도 없으면 일반 안내 메시지로 대체한다", () => {
    expect(interpretResetLinkError({ error: "access_denied" })).toBe(
      "재설정 링크를 사용할 수 없습니다. 다시 요청해주세요."
    );
  });
});
