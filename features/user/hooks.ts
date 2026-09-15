import { useEffect, useRef, useState } from "react";
import {
  signInWithEmail,
  signInWithOAuth,
  signUpWithEmail,
  updateInterestRegion,
  updateUserLocation,
} from "../../lib/api/auth";
import { useAuthStore } from "../../store/authStore";
import type { User } from "../../types";

interface UseAuthResult {
  isLoading: boolean;
  error: string | null;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nickname: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithNaver: () => Promise<void>;
}

/**
 * 인증 훅 (비즈니스 로직 전담)
 * - 로그인/회원가입/SNS 로그인 실행 + 로딩/에러 상태 관리.
 * - 성공 시 authStore에 유저를 반영하면, 루트 레이아웃이 화면을 전환한다.
 */
export function useAuth(): UseAuthResult {
  const setUser = useAuthStore((state) => state.setUser);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 공통 실행 래퍼: 로딩/에러 처리 + 성공 시 유저 반영
  async function run(task: () => Promise<User>): Promise<void> {
    setIsLoading(true);
    setError(null);
    try {
      const user = await task();
      setUser(user);
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
    loginWithEmail: async (email, password) => {
      if (!requireEmail(email, password)) return;
      await run(() => signInWithEmail(email, password));
    },
    signUp: async (email, password, nickname) => {
      if (!requireEmail(email, password)) return;
      if (nickname.trim() === "") {
        setError("닉네임을 입력해주세요.");
        return;
      }
      await run(() => signUpWithEmail(email, password, nickname));
    },
    loginWithGoogle: () => run(() => signInWithOAuth("google")),
    loginWithNaver: () => run(() => signInWithOAuth("naver")),
  };
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

interface UseInterestRegionResult {
  sido: string | null;
  sigungu: string | null;
  isSaving: boolean;
  error: string | null;
  save: (sido: string, sigungu: string) => Promise<void>;
  clear: () => Promise<void>;
}

/**
 * 관심 지역(시/도, 시/군/구) 설정 훅
 * - 현재 값은 로그인 유저 정보에서 읽고, 저장/해제는 API 호출 후 authStore에 반영한다.
 */
export function useInterestRegion(): UseInterestRegionResult {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply(sido: string | null, sigungu: string | null): Promise<void> {
    if (!user) return;
    setIsSaving(true);
    setError(null);
    try {
      await updateInterestRegion(user.uid, sido, sigungu);
      setUser({ ...user, interest_sido: sido, interest_sigungu: sigungu });
    } catch (e) {
      setError(e instanceof Error ? e.message : "관심 지역 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return {
    sido: user?.interest_sido ?? null,
    sigungu: user?.interest_sigungu ?? null,
    isSaving,
    error,
    save: (sido, sigungu) => apply(sido, sigungu),
    clear: () => apply(null, null),
  };
}
