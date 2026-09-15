import { useEffect, useRef, useState } from "react";
import {
  signInWithEmail,
  signInWithOAuth,
  signUpWithEmail,
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
