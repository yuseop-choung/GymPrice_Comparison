import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ColorTheme } from "../../../constants/colors";
import { fontSize, radius, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";
import type { ThemeMode } from "../../../store/themeStore";

const OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: "system", label: "시스템" },
  { mode: "light", label: "라이트" },
  { mode: "dark", label: "다크" },
];

/**
 * 라이트/다크/시스템 테마 선택 세그먼트 (UI 전담)
 */
interface ThemeModeSwitchProps {
  mode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}

export function ThemeModeSwitch({ mode, onChange }: ThemeModeSwitchProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <Text style={styles.label}>테마</Text>
      <View style={styles.segment}>
        {OPTIONS.map((option) => {
          const active = option.mode === mode;
          return (
            <Pressable
              key={option.mode}
              onPress={() => onChange(option.mode)}
              style={[styles.option, active ? styles.optionActive : null]}
            >
              <Text style={[styles.optionText, active ? styles.optionTextActive : null]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
    },
    label: {
      fontSize: fontSize.md,
      color: colors.text,
      fontWeight: "600",
    },
    segment: {
      flexDirection: "row",
      backgroundColor: colors.surfaceElevated,
      borderRadius: radius.sm,
      padding: 2,
    },
    option: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.sm,
    },
    optionActive: {
      backgroundColor: colors.primary,
    },
    optionText: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
    },
    optionTextActive: {
      color: colors.white,
      fontWeight: "600",
    },
  });
}
