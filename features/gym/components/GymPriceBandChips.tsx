import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ColorTheme } from "../../../constants/colors";
import { fontSize, radius, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";

/** 가격대 필터 선택지 — maxPrice는 원 단위, null은 "전체"(필터 없음) */
export const PRICE_BANDS: { key: string; label: string; maxPrice: number | null }[] = [
  { key: "all", label: "전체", maxPrice: null },
  { key: "5", label: "5만원 이하", maxPrice: 50000 },
  { key: "10", label: "10만원 이하", maxPrice: 100000 },
  { key: "15", label: "15만원 이하", maxPrice: 150000 },
  { key: "20", label: "20만원 이하", maxPrice: 200000 },
];

interface GymPriceBandChipsProps {
  maxPrice: number | null;
  onChange: (price: number | null) => void;
}

/** 가격대 필터 칩 목록 (UI 전담) — 리스트 필터 모달의 "가격대" 섹션에서 쓴다. */
export function GymPriceBandChips({ maxPrice, onChange }: GymPriceBandChipsProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.chipRow}>
      {PRICE_BANDS.map((band) => (
        <Pressable
          key={band.key}
          onPress={() => onChange(band.maxPrice)}
          style={[styles.chip, maxPrice === band.maxPrice ? styles.chipActive : null]}
        >
          <Text
            style={[
              styles.chipText,
              maxPrice === band.maxPrice ? styles.chipTextActive : null,
            ]}
          >
            {band.label}
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
