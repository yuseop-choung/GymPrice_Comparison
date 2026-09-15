import { useColorScheme } from "react-native";
import { type ColorTheme, darkColors, lightColors } from "../constants/colors";
import { useThemeStore } from "../store/themeStore";

/**
 * 현재 적용해야 할 테마 팔레트를 반환하는 훅.
 * - 유저가 설정에서 라이트/다크를 직접 고르지 않았으면("system") 기기 설정을 따른다.
 * - 화면/컴포넌트는 constants/colors의 colors를 직접 import하지 말고 이 훅을 쓴다.
 */
export function useThemeColors(): ColorTheme {
  const mode = useThemeStore((state) => state.mode);
  const systemScheme = useColorScheme();
  const resolved = mode === "system" ? (systemScheme ?? "light") : mode;
  return resolved === "dark" ? darkColors : lightColors;
}

/** 현재 다크 모드가 적용 중인지 여부 (아이콘/상태바 스타일 분기 등에 사용) */
export function useIsDarkMode(): boolean {
  const mode = useThemeStore((state) => state.mode);
  const systemScheme = useColorScheme();
  return (mode === "system" ? systemScheme : mode) === "dark";
}
