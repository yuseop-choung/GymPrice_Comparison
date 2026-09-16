import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import type { ColorTheme } from "../../../constants/colors";
import { fontSize, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";

/**
 * 로그인 화면의 "비밀번호를 잊으셨나요?" 링크 (UI 전담)
 * - 누르면 비밀번호 재설정 이메일 요청 화면으로 이동한다.
 */
export function ForgotPasswordLink() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push("/forgot-password")}
      hitSlop={8}
      style={styles.row}
    >
      {({ pressed }) => (
        <Text style={[styles.text, pressed ? styles.textPressed : null]}>
          비밀번호를 잊으셨나요?
        </Text>
      )}
    </Pressable>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    row: {
      alignSelf: "flex-end",
      marginBottom: spacing.md,
    },
    text: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
    },
    textPressed: {
      opacity: 0.6,
    },
  });
}
