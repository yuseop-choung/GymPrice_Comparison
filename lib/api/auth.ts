import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import type { Provider } from "@supabase/supabase-js";
import { USE_MOCK } from "../../constants/config";
import type { User } from "../../types";
import { supabase } from "../supabase";

/**
 * 인증/유저 세션 API
 * - 모든 인증 관련 호출은 이 파일을 통한다. (CLAUDE.md 규칙)
 * - 이메일/비밀번호 + SNS(Google/Naver) 로그인 지원.
 */

// OAuth 리다이렉트 후 브라우저 세션을 정리한다.
WebBrowser.maybeCompleteAuthSession();

/** 앱에서 지원하는 SNS 로그인 종류 */
export type SnsProvider = "google" | "naver";

/** 목 모드에서 사용할 더미 유저 (mock.ts의 user-1과 동일) */
const MOCK_USER: User = {
  uid: "user-1",
  email: "tester@example.com",
  nickname: "테스터",
  is_admin: false,
  is_suspended: false,
  created_at: "2026-01-01T00:00:00Z",
};

/** users 테이블에서 프로필 조회 (없으면 null) */
async function fetchProfile(uid: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("uid", uid)
    .returns<User[]>()
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

/** 현재 로그인 유저 조회 (세션 없으면 null) */
export async function getCurrentUser(): Promise<User | null> {
  if (USE_MOCK) return null; // 목 모드는 비로그인 상태로 시작 → 로그인 흐름 확인 가능

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  if (!session) return null;

  return fetchProfile(session.user.id);
}

/** 이메일/비밀번호 로그인 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<User> {
  if (USE_MOCK) return MOCK_USER;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error(error.message);

  const profile = await fetchProfile(data.user.id);
  if (!profile) throw new Error("프로필을 찾을 수 없습니다.");
  return profile;
}

/**
 * 이메일/비밀번호 회원가입
 * - 프로필(public.users)은 DB 트리거(handle_new_user)가 자동 생성한다.
 * - nickname은 metadata로 전달하면 트리거가 사용한다.
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  nickname: string
): Promise<User> {
  if (USE_MOCK) return { ...MOCK_USER, email, nickname };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nickname } },
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("회원가입에 실패했습니다.");

  // 세션이 있으면 트리거가 만든 프로필을 조회, 없으면(이메일 확인 대기) 입력값으로 구성.
  const profile = await fetchProfile(data.user.id);
  return (
    profile ?? {
      uid: data.user.id,
      email,
      nickname,
      is_admin: false,
      is_suspended: false,
      created_at: data.user.created_at,
    }
  );
}

/**
 * SNS(Google/Naver) 로그인
 * - 브라우저로 OAuth 진행 후 코드 교환 → 세션 생성 → 프로필 확보(없으면 생성).
 * - ⚠️ Naver는 Supabase 기본 provider가 아니므로, 실제 연결 시 커스텀 OAuth 설정이 필요하다.
 */
export async function signInWithOAuth(provider: SnsProvider): Promise<User> {
  if (USE_MOCK) return MOCK_USER;

  const redirectTo = Linking.createURL("auth-callback");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as Provider, // naver는 커스텀 provider 가정
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw new Error(error.message);
  if (!data.url) throw new Error("OAuth 주소를 생성하지 못했습니다.");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") throw new Error("로그인이 취소되었습니다.");

  const { params, errorCode } = QueryParams.getQueryParams(result.url);
  if (errorCode) throw new Error(errorCode);

  const { error: sessionError } = await supabase.auth.exchangeCodeForSession(
    params.code
  );
  if (sessionError) throw new Error(sessionError.message);

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("세션 생성에 실패했습니다.");

  // 프로필은 DB 트리거가 생성한다. 조회해서 반환.
  const profile = await fetchProfile(session.user.id);
  if (!profile) throw new Error("프로필을 찾을 수 없습니다.");
  return profile;
}

/** 내 동네(위치) 저장 — 위치기반 알림 대상 계산에 사용 */
export async function updateUserLocation(
  userId: string,
  lat: number,
  lng: number
): Promise<void> {
  if (USE_MOCK) return;

  const { error } = await supabase
    .from("users")
    .update({ home_lat: lat, home_lng: lng })
    .eq("uid", userId);
  if (error) throw new Error(error.message);
}

/**
 * 비밀번호 재설정 이메일 요청
 * - Supabase Auth가 자체적으로 재설정 링크 이메일을 보낸다(기본(커스텀 SMTP 없이도
 *   쓸 수 있는) 템플릿 그대로 사용 — 별도 이메일 발송 서비스 연동이 필요 없다).
 * - redirectTo는 앱 딥링크(reset-password 화면)로 지정한다. 메일의 링크를 누르면
 *   Supabase 서버가 토큰을 검증한 뒤 이 딥링크로(access_token/refresh_token을
 *   URL에 담아) 리다이렉트하고, 앱은 그 URL을 restorePasswordResetSession으로
 *   받아 세션을 복원한다.
 *   ⚠️ Supabase 대시보드 Authentication > URL Configuration의 Redirect URLs에
 *   이 딥링크를 등록해둬야 실제로 동작한다.
 * - 계정 존재 여부를 노출하지 않기 위해 이메일이 없어도 에러를 던지지 않는다
 *   (Supabase 쪽 기본 동작).
 */
export async function requestPasswordReset(email: string): Promise<void> {
  if (USE_MOCK) return;

  const redirectTo = Linking.createURL("reset-password");
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (error) throw new Error(error.message);
}

/**
 * 재설정 링크 파라미터에 담긴 에러를 사람이 읽을 메시지로 해석한다 (에러가 없으면 null).
 * - 링크가 만료됐거나 이미 사용된 경우 Supabase가 access_token 대신 error/error_code/
 *   error_description을 담아 리다이렉트한다. 순수 함수라 supabase 호출 없이 바로 테스트한다.
 */
export function interpretResetLinkError(params: Record<string, string>): string | null {
  if (!params.error) return null;
  if (params.error_code === "otp_expired") {
    return "재설정 링크가 만료됐습니다. 다시 요청해주세요.";
  }
  return params.error_description ?? "재설정 링크를 사용할 수 없습니다. 다시 요청해주세요.";
}

/**
 * 재설정 이메일 링크(딥링크)로 전달된 URL에서 세션을 복원한다.
 * - 기본 Reset Password 템플릿의 링크를 열면 Supabase 서버가 토큰을 검증한 뒤
 *   access_token/refresh_token을 담아 앱으로 리다이렉트한다(OAuth 로그인과 동일하게
 *   QueryParams.getQueryParams로 쿼리+해시를 함께 파싱한다).
 * - 이 세션이 있어야 updatePassword(비밀번호 변경)를 호출할 수 있다.
 * - 링크가 없거나(토큰 없음) 만료·이미 사용된 경우 에러를 던진다.
 */
export async function restorePasswordResetSession(url: string): Promise<void> {
  if (USE_MOCK) return;

  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);

  const linkError = interpretResetLinkError(params);
  if (linkError) throw new Error(linkError);

  const { access_token, refresh_token } = params;
  if (!access_token || !refresh_token) {
    throw new Error("재설정 링크가 올바르지 않습니다.");
  }

  const { error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  if (error) throw new Error(error.message);
}

/** 새 비밀번호로 변경 (restorePasswordResetSession으로 만든 세션이 있어야 한다) */
export async function updatePassword(newPassword: string): Promise<void> {
  if (USE_MOCK) return;

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

/**
 * 로그아웃
 * - scope "global"(기본): 서버에도 세션 무효화를 요청하는 일반적인 로그아웃.
 * - scope "local": 서버 요청 없이 기기에 저장된 세션만 지운다. "로그인 상태 유지"를
 *   선택하지 않은 유저가 앱을 재실행했을 때, 오프라인이어도 곧바로 로그아웃 상태로
 *   전환하기 위해 사용한다(authStore.initialize 참고).
 */
export async function signOut(scope: "global" | "local" = "global"): Promise<void> {
  if (USE_MOCK) return;
  const { error } = await supabase.auth.signOut({ scope });
  if (error) throw new Error(error.message);
}
