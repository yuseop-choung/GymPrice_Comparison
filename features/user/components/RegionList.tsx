import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text } from "react-native";
import type { ColorTheme } from "../../../constants/colors";
import { fontSize, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";

/**
 * 지역 선택용 단일 리스트 (UI 전담)
 * - 시/도 목록, 시/군/구 목록 어느 쪽에도 재사용한다.
 * - disabledItems: 이미 관심 지역으로 추가된 항목 — 다시 선택 못 하도록 막고
 *   파란색으로 표시해 "이미 선택됨"을 알려준다.
 */
interface RegionListProps {
  items: string[];
  selected: string | null;
  disabledItems?: string[];
  onSelect: (item: string) => void;
}

export function RegionList({
  items,
  selected,
  disabledItems = [],
  onSelect,
}: RegionListProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item}
      renderItem={({ item }) => {
        const isAdded = disabledItems.includes(item);
        return (
          <Pressable
            disabled={isAdded}
            style={({ pressed }) => [
              styles.row,
              item === selected ? styles.selectedRow : null,
              isAdded ? styles.addedRow : null,
              pressed ? styles.pressed : null,
            ]}
            onPress={() => onSelect(item)}
          >
            <Text
              style={[
                styles.text,
                item === selected ? styles.selectedText : null,
                isAdded ? styles.addedText : null,
              ]}
            >
              {item}
            </Text>
            {item === selected ? <Text style={styles.check}>✓</Text> : null}
            {isAdded ? <Text style={styles.addedLabel}>추가됨</Text> : null}
          </Pressable>
        );
      }}
    />
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    selectedRow: {
      backgroundColor: colors.primaryMuted,
    },
    addedRow: {
      backgroundColor: colors.primaryMuted,
    },
    pressed: {
      opacity: 0.7,
    },
    text: {
      fontSize: fontSize.md,
      color: colors.text,
    },
    selectedText: {
      color: colors.primary,
      fontWeight: "600",
    },
    addedText: {
      color: colors.primary,
      fontWeight: "600",
    },
    check: {
      fontSize: fontSize.md,
      color: colors.primary,
      fontWeight: "700",
    },
    addedLabel: {
      fontSize: fontSize.sm,
      color: colors.primary,
      fontWeight: "700",
    },
  });
}
