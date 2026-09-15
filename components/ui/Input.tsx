import { useMemo, useState } from "react";
import type { TextInputProps } from "react-native";
import { StyleSheet, Text, TextInput, View } from "react-native";
import type { ColorTheme } from "../../constants/colors";
import { fontSize, radius, spacing } from "../../constants/layout";
import { useThemeColors } from "../../hooks/useThemeColors";

/**
 * 공통 입력 컴포넌트
 * - 비즈니스 로직 없음. 라벨/에러 표시 + RN TextInput props 패스스루만 담당.
 * - 포커스 시 테두리를 강조해 현재 입력 중인 항목을 알려준다.
 */
interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
}

export function Input({ label, error, style, onFocus, onBlur, ...rest }: InputProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[
          styles.input,
          isFocused ? styles.inputFocused : null,
          error ? styles.inputError : null,
          style,
        ]}
        placeholderTextColor={colors.textSecondary}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    container: {
      marginBottom: spacing.md,
    },
    label: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: fontSize.md,
      color: colors.text,
    },
    inputFocused: {
      borderColor: colors.primary,
    },
    inputError: {
      borderColor: colors.error,
    },
    errorText: {
      fontSize: fontSize.sm,
      color: colors.error,
      marginTop: spacing.xs,
    },
  });
}
