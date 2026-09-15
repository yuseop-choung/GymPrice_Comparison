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

/** 로그아웃 */
export async function signOut(): Promise<void> {
  if (USE_MOCK) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}
