import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Input } from "../../../components/ui/Input";
import type { ColorTheme } from "../../../constants/colors";
import { fontSize, radius, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";

export type SortKey = "distance" | "price";

/**
 * 리스트 화면 상단의 검색어 입력 + 정렬(거리순/최저가순) 선택 (UI 전담)
 */
interface GymListFiltersProps {
  keyword: string;
  onKeywordChange: (text: string) => void;
  sortKey: SortKey;
  onSortKeyChange: (key: SortKey) => void;
}

export function GymListFilters({
  keyword,
  onKeywordChange,
  sortKey,
  onSortKeyChange,
}: GymListFiltersProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Input
        value={keyword}
        onChangeText={onKeywordChange}
        placeholder="헬스장 이름 / 지역 검색"
      />
      <View style={styles.sortRow}>
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
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    container: {
      padding: spacing.lg,
      paddingBottom: spacing.sm,
    },
    sortRow: {
      flexDirection: "row",
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
