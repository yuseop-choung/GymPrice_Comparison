import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ColorTheme } from "../../constants/colors";
import { fontSize, radius, spacing } from "../../constants/layout";
import { useThemeColors } from "../../hooks/useThemeColors";

/**
 * 공통 체크박스 (라벨 + 박스)
 * - 비즈니스 로직 없음. 체크 여부 표시 + 탭 시 토글 콜백 호출만 담당.
 */
interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Checkbox({ label, checked, onChange }: CheckboxProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      style={styles.row}
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View style={[styles.box, checked ? styles.boxChecked : null]}>
        {checked ? <Text style={styles.check}>✓</Text> : null}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    box: {
      width: 20,
      height: 20,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing.sm,
    },
    boxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    check: {
      color: colors.white,
      fontSize: fontSize.sm,
      fontWeight: "700",
      lineHeight: fontSize.sm,
    },
    label: {
      fontSize: fontSize.sm,
      color: colors.text,
    },
  });
}
