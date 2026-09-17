import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { getCurrentUser, signOut as apiSignOut } from "../lib/api/auth";
import type { User } from "../types";

const KEEP_LOGGED_IN_KEY = "keep_logged_in";

/**
 * 인증 전역 상태 (Zustand)
 * - 로그인 세션/유저 정보를 보관한다.
 * - 실제 인증 호출은 /lib/api/auth.ts 를 통해서만 한다.
 * - "로그인 상태 유지" 체크 여부를 AsyncStorage에 저장해, 다음 앱 실행 시
 *   체크하지 않았던 로그인이면 기기에 남은 세션을 지우고 다시 로그인하게 한다.
 */
interface AuthState {
  user: User | null;
  /** 앱 시작 시 세션 복구가 끝났는지 여부 */
  isInitialized: boolean;
  /**
   * 로그인 성공 시 호출. keepLoggedIn을 넘기면(로그인/회원가입 시) 그 선택을
   * 기기에 저장해 다음 실행 때 참고한다. 세션 복구(initialize) 시처럼 선택을
   * 다시 저장할 필요가 없을 때는 생략한다.
   */
  setUser: (user: User | null, keepLoggedIn?: boolean) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isInitialized: false,

  setUser: (user, keepLoggedIn) => {
    set({ user });
    if (user !== null && keepLoggedIn !== undefined) {
      AsyncStorage.setItem(KEEP_LOGGED_IN_KEY, String(keepLoggedIn)).catch(() => {
        // 저장 실패해도 이번 세션 로그인 자체는 정상 진행한다.
      });
    }
  },

  initialize: async () => {
    try {
      let keepLoggedIn = true;
      try {
        // 저장된 값이 없으면(과거 로그인 등) 기존 동작대로 세션을 유지한다.
        keepLoggedIn = (await AsyncStorage.getItem(KEEP_LOGGED_IN_KEY)) !== "false";
      } catch {
        keepLoggedIn = true;
      }

      if (!keepLoggedIn) {
        // 로그인 상태 유지를 선택하지 않았던 세션 → 기기에 남은 로그인 정보를 지운다.
        // 네트워크 없이도 즉시 로그아웃 상태가 되도록 scope는 local로 지운다.
        await apiSignOut("local");
        set({ user: null, isInitialized: true });
        return;
      }

      const user = await getCurrentUser();
      set({ user, isInitialized: true });
    } catch (e) {
      // 세션 복구 실패 시에도 앱은 진입 가능하도록 비로그인 처리.
      // ⚠️ 원인 파악이 안 되는 걸 막기 위해 콘솔에는 실제 에러를 남긴다.
      console.error("[auth] 세션 복구 실패:", e);
      set({ user: null, isInitialized: true });
    }
  },

  signOut: async () => {
    await apiSignOut();
    set({ user: null });
  },
}));
