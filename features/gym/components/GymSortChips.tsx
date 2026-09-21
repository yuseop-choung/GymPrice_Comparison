import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ColorTheme } from "../../../constants/colors";
import { fontSize, radius, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";
import type { GymSortKey } from "../hooks";

interface GymSortChipsProps {
  sortKey: GymSortKey;
  onChange: (key: GymSortKey) => void;
}

/** 정렬(거리순/최저가순) 칩 (UI 전담) — 리스트 화면 필터 바에서 쓴다. */
export function GymSortChips({ sortKey, onChange }: GymSortChipsProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.chipRow}>
      {(["distance", "price"] as const).map((key) => (
        <Pressable
          key={key}
          onPress={() => onChange(key)}
          style={[styles.chip, sortKey === key ? styles.chipActive : null]}
        >
          <Text style={[styles.chipText, sortKey === key ? styles.chipTextActive : null]}>
            {key === "distance" ? "거리순" : "최저가순"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    chip: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
    },
    chipTextActive: {
      color: colors.white,
      fontWeight: "600",
    },
  });
}
