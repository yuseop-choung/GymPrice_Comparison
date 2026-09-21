import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Input } from "../../../components/ui/Input";
import type { ColorTheme } from "../../../constants/colors";
import { fontSize, radius, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";

export type SortKey = "distance" | "price";

/** 가격대 필터 선택지 — maxPrice는 원 단위, null은 "전체"(필터 없음) */
const PRICE_BANDS: { key: string; label: string; maxPrice: number | null }[] = [
  { key: "all", label: "전체", maxPrice: null },
  { key: "5", label: "5만원 이하", maxPrice: 50000 },
  { key: "10", label: "10만원 이하", maxPrice: 100000 },
  { key: "15", label: "15만원 이하", maxPrice: 150000 },
  { key: "20", label: "20만원 이하", maxPrice: 200000 },
];

/**
 * 리스트 화면 상단의 검색어 입력 + 정렬(거리순/최저가순) + 가격대 필터 (UI 전담)
 * - 검색어는 입력하는 동안 "내 주변" 목록을 즉시 필터링하고, 제출(Enter)하면
 *   반경 제한 없이 전체에서 검색한다(실제 전환은 상위 훅이 담당).
 */
interface GymListFiltersProps {
  keyword: string;
  onKeywordChange: (text: string) => void;
  onSubmit: () => void;
  sortKey: SortKey;
  onSortKeyChange: (key: SortKey) => void;
  maxPrice: number | null;
  onMaxPriceChange: (price: number | null) => void;
}

export function GymListFilters({
  keyword,
  onKeywordChange,
  onSubmit,
  sortKey,
  onSortKeyChange,
  maxPrice,
  onMaxPriceChange,
}: GymListFiltersProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Input
        value={keyword}
        onChangeText={onKeywordChange}
        onSubmitEditing={onSubmit}
        placeholder="헬스장 이름 검색 (Enter: 전체에서 검색)"
        returnKeyType="search"
      />
      <View style={styles.chipRow}>
        {(["distance", "price"] as const).map((key) => (
          <Pressable
            key={key}
            onPress={() => onSortKeyChange(key)}
            style={[styles.chip, sortKey === key ? styles.chipActive : null]}
          >
            <Text
              style={[styles.chipText, sortKey === key ? styles.chipTextActive : null]}
            >
              {key === "distance" ? "거리순" : "최저가순"}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.chipRow}>
        {PRICE_BANDS.map((band) => (
          <Pressable
            key={band.key}
            onPress={() => onMaxPriceChange(band.maxPrice)}
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
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    container: {
      padding: spacing.lg,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
    },
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
