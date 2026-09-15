import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ColorTheme } from "../../../constants/colors";
import { fontSize, radius, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";

/**
 * SNS 로그인 버튼 묶음 (UI 전담)
 * - Google / Naver 로그인 진입 버튼. 실제 동작은 onPress 콜백에 위임.
 */
interface SnsLoginButtonsProps {
  onGoogle: () => void;
  onNaver: () => void;
  disabled?: boolean;
}

export function SnsLoginButtons({
  onGoogle,
  onNaver,
  disabled = false,
}: SnsLoginButtonsProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.google,
          pressed ? styles.pressed : null,
        ]}
        onPress={onGoogle}
        disabled={disabled}
      >
        <Text style={styles.googleText}>Google로 계속하기</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.naver,
          pressed ? styles.pressed : null,
        ]}
        onPress={onNaver}
        disabled={disabled}
      >
        <Text style={styles.naverText}>네이버로 계속하기</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    container: {
      gap: spacing.sm,
    },
    button: {
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: {
      opacity: 0.85,
    },
    google: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.googleBorder,
    },
    googleText: {
      fontSize: fontSize.md,
      fontWeight: "600",
      color: colors.text,
    },
    naver: {
      backgroundColor: colors.naver,
    },
    naverText: {
      fontSize: fontSize.md,
      fontWeight: "600",
      color: colors.white,
    },
  });
}
