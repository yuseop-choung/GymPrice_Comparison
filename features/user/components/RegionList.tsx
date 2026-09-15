import { FlatList, Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../../../constants/colors";
import { fontSize, spacing } from "../../../constants/layout";

/**
 * 지역 선택용 단일 리스트 (UI 전담)
 * - 시/도 목록, 시/군/구 목록 어느 쪽에도 재사용한다.
 */
interface RegionListProps {
  items: string[];
  selected: string | null;
  onSelect: (item: string) => void;
}

export function RegionList({ items, selected, onSelect }: RegionListProps) {
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item}
      renderItem={({ item }) => (
        <Pressable style={styles.row} onPress={() => onSelect(item)}>
          <Text style={[styles.text, item === selected ? styles.selectedText : null]}>
            {item}
          </Text>
          {item === selected ? <Text style={styles.check}>✓</Text> : null}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  text: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  selectedText: {
    color: colors.primary,
    fontWeight: "600",
  },
  check: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: "700",
  },
});
