import { useMemo, useState } from "react";
import type { TextInputProps } from "react-native";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { ColorTheme } from "../../constants/colors";
import { fontSize, radius, spacing } from "../../constants/layout";
import { useThemeColors } from "../../hooks/useThemeColors";

/**
 * 공통 입력 컴포넌트
 * - 비즈니스 로직 없음. 라벨/에러 표시 + RN TextInput props 패스스루만 담당.
 * - 포커스 시 테두리를 강조해 현재 입력 중인 항목을 알려준다.
 * - secureTextEntry(비밀번호)로 쓰이면 입력값을 확인할 수 있도록 표시/숨김 토글을 붙여준다.
 */
interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
}

export function Input({
  label,
  error,
  style,
  onFocus,
  onBlur,
  secureTextEntry,
  ...rest
}: InputProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isFocused, setIsFocused] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const isPasswordField = secureTextEntry === true;

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            isPasswordField ? styles.inputWithToggle : null,
            isFocused ? styles.inputFocused : null,
            error ? styles.inputError : null,
            style,
          ]}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={isPasswordField && !isRevealed}
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
        {isPasswordField ? (
          <Pressable
            onPress={() => setIsRevealed((v) => !v)}
            hitSlop={8}
            style={styles.toggleButton}
            accessibilityRole="button"
            accessibilityLabel={isRevealed ? "비밀번호 숨기기" : "비밀번호 표시"}
          >
            <Text style={styles.toggleText}>{isRevealed ? "숨김" : "보기"}</Text>
          </Pressable>
        ) : null}
      </View>
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
    inputRow: {
      justifyContent: "center",
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
    inputWithToggle: {
      paddingRight: spacing.xl + spacing.md,
    },
    inputFocused: {
      borderColor: colors.primary,
    },
    inputError: {
      borderColor: colors.error,
    },
    toggleButton: {
      position: "absolute",
      right: spacing.sm,
      padding: spacing.xs,
    },
    toggleText: {
      fontSize: fontSize.sm,
      fontWeight: "600",
      color: colors.primary,
    },
    errorText: {
      fontSize: fontSize.sm,
      color: colors.error,
      marginTop: spacing.xs,
    },
  });
}
