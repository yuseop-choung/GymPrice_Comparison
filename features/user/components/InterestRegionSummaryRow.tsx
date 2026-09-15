import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../../../constants/colors";
import { fontSize, radius, spacing } from "../../../constants/layout";
import type { InterestRegion } from "../../../types";

/**
 * 내 정보 탭에 보여줄 관심 지역 요약 행 (UI 전담)
 * - 누르면 관심 지역 설정 화면으로 이동한다.
 */
interface InterestRegionSummaryRowProps {
  regions: InterestRegion[];
  maxCount: number;
  onPress: () => void;
}

export function InterestRegionSummaryRow({
  regions,
  maxCount,
  onPress,
}: InterestRegionSummaryRowProps) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Text style={styles.label}>
        관심 지역 ({regions.length}/{maxCount})
      </Text>
      <Text style={styles.value} numberOfLines={1}>
        {regions.length === 0
          ? "설정 안 함"
          : regions.map((r) => `${r.sido} ${r.sigungu}`).join(", ")}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  value: {
    flexShrink: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "right",
    marginLeft: spacing.sm,
  },
});
