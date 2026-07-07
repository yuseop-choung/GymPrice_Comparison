import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const STORAGE_KEY = "onboarding_seen";

/**
 * 온보딩 노출 여부 전역 상태 (Zustand + AsyncStorage)
 * - hasSeen: null = 아직 로드 전, true/false = 로드 완료.
 */
interface OnboardingState {
  hasSeen: boolean | null;
  load: () => Promise<void>;
  complete: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  hasSeen: null,

  load: async () => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEY);
      set({ hasSeen: value === "true" });
    } catch {
      set({ hasSeen: false });
    }
  },

  complete: async () => {
    set({ hasSeen: true });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // 저장 실패해도 이번 세션은 진행한다.
    }
  },
}));
