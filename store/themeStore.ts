import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const STORAGE_KEY = "theme_mode";

/** 유저가 고를 수 있는 테마 모드. "system"이면 기기 설정을 따른다. */
export type ThemeMode = "system" | "light" | "dark";

interface ThemeState {
  mode: ThemeMode;
  isLoaded: boolean;
  load: () => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
}

/**
 * 테마 모드 전역 상태 (Zustand + AsyncStorage)
 * - 기본값은 "system"(기기 설정을 따름). 유저가 라이트/다크로 고정할 수도 있다.
 */
export const useThemeStore = create<ThemeState>((set) => ({
  mode: "system",
  isLoaded: false,

  load: async () => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEY);
      const mode: ThemeMode = value === "light" || value === "dark" ? value : "system";
      set({ mode, isLoaded: true });
    } catch {
      set({ mode: "system", isLoaded: true });
    }
  },

  setMode: async (mode) => {
    set({ mode });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // 저장 실패해도 이번 세션 안에서는 선택한 모드로 계속 동작한다.
    }
  },
}));
