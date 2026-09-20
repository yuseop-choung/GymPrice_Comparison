import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, StyleSheet } from "react-native";
import type { ColorTheme } from "../../../constants/colors";
import { radius, spacing, elevation } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";

interface MapRecenterButtonProps {
  onPress: () => void;
}

/**
 * 지도 우측 하단 "내 위치로" 버튼 (UI 전담)
 * - 다른 곳을 둘러보다가 누르면 지도가 현재 내 GPS 위치로 다시 이동한다.
 * - 실제 이동 로직은 부모(홈 화면)가 KakaoMap.recenter()를 호출해 처리한다.
 */
export function MapRecenterButton({ onPress }: MapRecenterButtonProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
    >
      <Ionicons name="locate" size={20} color={colors.primary} />
    </Pressable>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    button: {
      position: "absolute",
      right: spacing.md,
      bottom: spacing.md,
      width: 40,
      height: 40,
      borderRadius: radius.lg,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceElevated,
      ...elevation(colors.shadow, "md"),
    },
    pressed: {
      opacity: 0.7,
    },
  });
}
