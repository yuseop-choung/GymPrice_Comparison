import { create } from "zustand";
import { getCurrentUser, signOut as apiSignOut } from "../lib/api/auth";
import type { User } from "../types";

/**
 * 인증 전역 상태 (Zustand)
 * - 로그인 세션/유저 정보를 보관한다.
 * - 실제 인증 호출은 /lib/api/auth.ts 를 통해서만 한다.
 */
interface AuthState {
  user: User | null;
  /** 앱 시작 시 세션 복구가 끝났는지 여부 */
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isInitialized: false,

  setUser: (user) => set({ user }),

  initialize: async () => {
    try {
      const user = await getCurrentUser();
      set({ user, isInitialized: true });
    } catch {
      // 세션 복구 실패 시에도 앱은 진입 가능하도록 비로그인 처리
      set({ user: null, isInitialized: true });
    }
  },

  signOut: async () => {
    await apiSignOut();
    set({ user: null });
  },
}));
