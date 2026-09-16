import { useEffect, useRef, useState } from "react";
import {
  getCurrentUser,
  requestPasswordReset,
  restorePasswordResetSession,
  signInWithEmail,
  signInWithOAuth,
  signUpWithEmail,
  updatePassword,
  updateUserLocation,
} from "../../lib/api/auth";
import {
  addInterestRegion,
  getInterestRegions,
  removeInterestRegion,
} from "../../lib/api/interestRegions";
import { useAuthStore } from "../../store/authStore";
import type { InterestRegion, User } from "../../types";

/** 유저당 최대 관심 지역 개수 (DB 트리거의 제한과 동일하게 맞춰 클라이언트에서도 미리 막는다) */
export const MAX_INTEREST_REGIONS = 5;

interface UseAuthResult {
  isLoading: boolean;
  error: string | null;
  loginWithEmail: (
    email: string,
    password: string,
    keepLoggedIn: boolean
  ) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    nickname: string,
    keepLoggedIn: boolean
  ) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithNaver: () => Promise<void>;
}

/**
 * 인증 훅 (비즈니스 로직 전담)
 * - 로그인/회원가입/SNS 로그인 실행 + 로딩/에러 상태 관리.
 * - 성공 시 authStore에 유저를 반영하면, 루트 레이아웃이 화면을 전환한다.
 * - keepLoggedIn: "로그인 상태 유지" 체크 여부. false면 다음 앱 실행 시
 *   기기에 남은 세션을 지우고 다시 로그인하게 한다 (authStore.initialize 참고).
 */
export function useAuth(): UseAuthResult {
  const setUser = useAuthStore((state) => state.setUser);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 공통 실행 래퍼: 로딩/에러 처리 + 성공 시 유저 반영
  async function run(task: () => Promise<User>, keepLoggedIn: boolean): Promise<void> {
    setIsLoading(true);
    setError(null);
    try {
      const user = await task();
      setUser(user, keepLoggedIn);
    } catch (e) {
      setError(e instanceof Error ? e.message : "인증에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  function requireEmail(email: string, password: string): boolean {
    if (email.trim() === "" || password.trim() === "") {
      setError("이메일과 비밀번호를 입력해주세요.");
      return false;
    }
    return true;
  }

  return {
    isLoading,
    error,
    loginWithEmail: async (email, password, keepLoggedIn) => {
      if (!requireEmail(email, password)) return;
      await run(() => signInWithEmail(email, password), keepLoggedIn);
    },
    signUp: async (email, password, nickname, keepLoggedIn) => {
      if (!requireEmail(email, password)) return;
      if (nickname.trim() === "") {
        setError("닉네임을 입력해주세요.");
        return;
      }
      await run(() => signUpWithEmail(email, password, nickname), keepLoggedIn);
    },
    // SNS 로그인은 이 체크박스의 대상이 아니므로 항상 기존 동작(유지)을 따른다.
    loginWithGoogle: () => run(() => signInWithOAuth("google"), true),
    loginWithNaver: () => run(() => signInWithOAuth("naver"), true),
  };
}

interface UseForgotPasswordResult {
  isLoading: boolean;
  error: string | null;
  /** 요청이 성공적으로 접수됐는지 (계정 존재 여부는 노출하지 않고 항상 같은 안내를 보여준다) */
  success: boolean;
  submit: (email: string) => Promise<void>;
}

/**
 * 비밀번호 재설정 이메일 요청 훅 (비즈니스 로직 전담)
 * - 계정 존재 여부를 노출하지 않기 위해, 성공/실패와 무관하게 동일한 성공 안내를
 *   보여준다(요청 자체가 실패한 네트워크 오류 등은 예외적으로 에러로 알려준다).
 */
export function useForgotPassword(): UseForgotPasswordResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(email: string): Promise<void> {
    if (email.trim() === "") {
      setError("이메일을 입력해주세요.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await requestPasswordReset(email.trim());
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "요청에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return { isLoading, error, success, submit };
}

/** 재설정 화면의 단계: 링크 검증 중 / 검증 완료(새 비밀번호 입력 가능) / 링크가 유효하지 않음 */
type ResetPasswordStage = "verifying" | "ready" | "invalid";

interface UseResetPasswordResult {
  stage: ResetPasswordStage;
  isSaving: boolean;
  error: string | null;
  submit: (password: string, confirm: string) => Promise<void>;
}

/**
 * 비밀번호 재설정 링크로 들어온 뒤 새 비밀번호를 설정하는 훅 (비즈니스 로직 전담)
 * - 마운트 시 딥링크 URL로 세션을 복원(restorePasswordResetSession)하고,
 *   성공해야만 새 비밀번호를 입력받는다.
 * - 비밀번호 변경(updatePassword)까지 성공해야 authStore에 로그인 상태를 반영한다
 *   — 링크만 열고 비밀번호를 바꾸지 않은 상태로는 앱에 로그인되지 않는다(루트
 *   레이아웃이 로그인 여부로 화면을 전환하므로, 로그인 반영 시점에 자연스럽게 홈으로 넘어간다).
 */
export function useResetPassword(url: string | null): UseResetPasswordResult {
  const setUser = useAuthStore((state) => state.setUser);
  const [stage, setStage] = useState<ResetPasswordStage>("verifying");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setStage("invalid");
      setError("재설정 링크가 올바르지 않습니다. 다시 요청해주세요.");
      return;
    }
    restorePasswordResetSession(url)
      .then(() => setStage("ready"))
      .catch((e) => {
        setStage("invalid");
        setError(
          e instanceof Error
            ? e.message
            : "링크가 만료되었거나 이미 사용됐습니다. 다시 요청해주세요."
        );
      });
  }, [url]);

  async function submit(password: string, confirm: string): Promise<void> {
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await updatePassword(password);
      const profile = await getCurrentUser();
      setUser(profile, true); // 재설정 완료 후 곧바로 로그인 상태로 전환
    } catch (e) {
      setError(e instanceof Error ? e.message : "비밀번호 변경에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return { stage, isSaving, error, submit };
}

/**
 * 내 동네(위치) 동기화 훅
 * - 로그인 상태에서 "실제 GPS 좌표"가 확정되면 한 번 서버에 저장한다(위치기반 알림용).
 * - isLocating이 true인 동안의 coords는 아직 폴백(DEFAULT_COORDS)일 수 있으므로,
 *   GPS 조회가 끝날 때까지 동기화를 미룬다 (그렇지 않으면 폴백 좌표가 영구 저장됨).
 */
export function useSyncUserLocation(
  coords: { lat: number; lng: number },
  isLocating: boolean
): void {
  const user = useAuthStore((state) => state.user);
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!user || isLocating || syncedRef.current) return;
    syncedRef.current = true;
    updateUserLocation(user.uid, coords.lat, coords.lng).catch(() => {
      // 위치 저장 실패는 앱 사용에 영향 없도록 무시한다.
    });
  }, [user, isLocating, coords.lat, coords.lng]);
}

interface UseInterestRegionsResult {
  regions: InterestRegion[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  add: (sido: string, sigungu: string) => Promise<void>;
  remove: (regionId: string) => Promise<void>;
}

/**
 * 관심 지역(시/도 + 시/군/구) 목록 훅 — 최대 MAX_INTEREST_REGIONS개까지.
 * - 로그인 유저 기준으로 목록을 불러오고, 추가/삭제 후 로컬 상태를 갱신한다.
 * - 개수 제한은 DB 트리거가 최종 방어선이지만, 왕복 없이 바로 알려주기 위해
 *   여기서도 먼저 검사한다.
 */
export function useInterestRegions(): UseInterestRegionsResult {
  const user = useAuthStore((state) => state.user);
  const [regions, setRegions] = useState<InterestRegion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setRegions([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    getInterestRegions(user.uid)
      .then(setRegions)
      .catch((e) => {
        setError(e instanceof Error ? e.message : "관심 지역을 불러오지 못했습니다.");
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  async function add(sido: string, sigungu: string): Promise<void> {
    if (!user) return;
    if (regions.length >= MAX_INTEREST_REGIONS) {
      setError(`관심 지역은 최대 ${MAX_INTEREST_REGIONS}개까지 설정할 수 있어요.`);
      return;
    }
    if (regions.some((r) => r.sido === sido && r.sigungu === sigungu)) {
      setError("이미 추가된 지역이에요.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const region = await addInterestRegion(user.uid, sido, sigungu);
      setRegions((prev) => [...prev, region]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "관심 지역 추가에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function remove(regionId: string): Promise<void> {
    setIsSaving(true);
    setError(null);
    try {
      await removeInterestRegion(regionId);
      setRegions((prev) => prev.filter((r) => r.id !== regionId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "관심 지역 삭제에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return { regions, isLoading, isSaving, error, add, remove };
}
