import { deleteAccount, interpretResetLinkError } from "./auth";

// auth.ts가 최상단에서 import하는 lib/supabase.ts는 실제 환경변수가 없으면 즉시
// 에러를 던지도록 설계돼 있다(환경변수 누락을 조기에 알리기 위함). deleteAccount
// 테스트에는 functions.invoke/auth.signOut까지 필요해 최소한으로 목을 채운다.
const mockInvoke = jest.fn();
const mockSignOut = jest.fn();
jest.mock("../supabase", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    auth: { signOut: (...args: unknown[]) => mockSignOut(...args) },
  },
}));

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

describe("deleteAccount", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockSignOut.mockReset().mockResolvedValue({ error: null });
  });

  it("성공하면 기기에 남은 세션(local)만 지운다", async () => {
    mockInvoke.mockResolvedValue({ data: { deleted: true }, error: null });

    await expect(deleteAccount()).resolves.toBeUndefined();

    expect(mockInvoke).toHaveBeenCalledWith("delete-account");
    expect(mockSignOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("실패하면 서버가 응답 본문에 담아 보낸 에러 메시지를 그대로 던진다", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: new Error("http error"),
      response: { json: async () => ({ error: "이미 삭제된 계정입니다." }) },
    });

    await expect(deleteAccount()).rejects.toThrow("이미 삭제된 계정입니다.");
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("에러 응답 본문을 못 읽으면 일반 안내 메시지로 대체한다", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: new Error("http error"),
      response: undefined,
    });

    await expect(deleteAccount()).rejects.toThrow("계정 삭제에 실패했습니다.");
  });
});
