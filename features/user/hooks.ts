import { useState } from "react";
import {
  signInWithEmail,
  signInWithOAuth,
  signUpWithEmail,
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
