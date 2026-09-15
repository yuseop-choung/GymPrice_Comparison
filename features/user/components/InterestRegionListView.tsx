import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../../constants/colors";
import { fontSize, radius, spacing } from "../../../constants/layout";
import type { InterestRegion } from "../../../types";

/**
 * 관심 지역 목록 화면의 "목록" 단계 (UI 전담)
 * - 이미 추가한 지역들(삭제 버튼 포함) + "+ 추가" 버튼 또는 한도 안내 문구를 보여준다.
 */
interface InterestRegionListViewProps {
  regions: InterestRegion[];
  maxCount: number;
  onAdd: () => void;
  onRemove: (regionId: string) => void;
}

export function InterestRegionListView({
  regions,
  maxCount,
  onAdd,
  onRemove,
}: InterestRegionListViewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.guide}>
        관심 지역을 설정하면 해당 지역 헬스장에 새 최저가가 등록될 때 알려드려요.
      </Text>

      {regions.length === 0 ? (
        <Text style={styles.empty}>아직 설정한 관심 지역이 없어요.</Text>
      ) : (
        regions.map((region) => (
          <View key={region.id} style={styles.row}>
            <Text style={styles.rowText}>
              {region.sido} {region.sigungu}
            </Text>
            <Pressable onPress={() => onRemove(region.id)} hitSlop={8}>
              <Text style={styles.remove}>삭제</Text>
            </Pressable>
          </View>
        ))
      )}

      {regions.length < maxCount ? (
        <Pressable onPress={onAdd} style={styles.addButton}>
          <Text style={styles.addText}>+ 관심 지역 추가</Text>
        </Pressable>
      ) : (
        <Text style={styles.limitNote}>
          관심 지역은 최대 {maxCount}개까지 설정할 수 있어요.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
  guide: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  empty: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  rowText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: "600",
  },
  remove: {
    fontSize: fontSize.sm,
    color: colors.error,
  },
  addButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  addText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.primary,
  },
  limitNote: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
