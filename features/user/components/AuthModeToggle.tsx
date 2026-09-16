import { useMemo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import type { ColorTheme } from "../../../constants/colors";
import { fontSize, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";

/**
 * 로그인 화면의 "로그인 ↔ 회원가입" 전환 문구 (UI 전담)
 * - 눌림 피드백(hitSlop + 투명도)이 있는 Pressable로 감싸 탭하기 쉽게 한다.
 */
interface AuthModeToggleProps {
  isSignUp: boolean;
  onToggle: () => void;
}

export function AuthModeToggle({ isSignUp, onToggle }: AuthModeToggleProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable onPress={onToggle} hitSlop={8}>
      {({ pressed }) => (
        <Text style={[styles.toggle, pressed ? styles.togglePressed : null]}>
          {isSignUp ? "이미 계정이 있나요? 로그인" : "계정이 없나요? 회원가입"}
        </Text>
      )}
    </Pressable>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    toggle: {
      fontSize: fontSize.sm,
      color: colors.primary,
      textAlign: "center",
      marginVertical: spacing.lg,
    },
    togglePressed: {
      opacity: 0.6,
    },
  });
}
