import { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import type { ColorTheme } from "../../constants/colors";
import { fontSize, radius, spacing } from "../../constants/layout";
import { useThemeColors } from "../../hooks/useThemeColors";

/**
 * 공통 버튼 컴포넌트
 * - 비즈니스 로직 없음. 로딩/비활성 상태 표시와 onPress 전달만 담당.
 * - 누를 때 살짝 눌리는 느낌(스케일+투명도)으로 눌림 피드백을 준다.
 */
interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        isDisabled ? styles.disabled : null,
        pressed && !isDisabled ? styles.pressed : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </Pressable>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    button: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: "center",
      justifyContent: "center",
    },
    disabled: {
      backgroundColor: colors.disabled,
    },
    pressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    text: {
      color: colors.white,
      fontSize: fontSize.md,
      fontWeight: "600",
    },
  });
}
