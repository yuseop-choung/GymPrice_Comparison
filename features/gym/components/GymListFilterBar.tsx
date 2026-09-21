import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Input } from "../../../components/ui/Input";
import type { ColorTheme } from "../../../constants/colors";
import { fontSize, radius, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";
import type { GymSortKey, RegionFilter } from "../hooks";
import { GymListFilterModal } from "./GymListFilterModal";
import { PRICE_BANDS } from "./GymPriceBandChips";
import { GymSortChips } from "./GymSortChips";

interface GymListFilterBarProps {
  keyword: string;
  onKeywordChange: (text: string) => void;
  sortKey: GymSortKey;
  onSortKeyChange: (key: GymSortKey) => void;
  maxPrice: number | null;
  onMaxPriceChange: (price: number | null) => void;
  region: RegionFilter | null;
  onRegionChange: (region: RegionFilter | null) => void;
}

/**
 * 리스트 화면 상단 — 검색어 입력 + 정렬(거리순/최저가순) + "필터" 버튼 (UI 전담)
 * - 가격대/지역 필터는 별도 모달(GymListFilterModal)로 빼고, 여기서는 선택된
 *   필터만 뱃지로 보여준다. 뱃지를 누르면 그 필터만 바로 해제된다.
 */
export function GymListFilterBar({
  keyword,
  onKeywordChange,
  sortKey,
  onSortKeyChange,
  maxPrice,
  onMaxPriceChange,
  region,
  onRegionChange,
}: GymListFilterBarProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [modalVisible, setModalVisible] = useState(false);

  const activeFilterCount = (maxPrice !== null ? 1 : 0) + (region !== null ? 1 : 0);
  const priceBandLabel = PRICE_BANDS.find((band) => band.maxPrice === maxPrice)?.label;

  return (
    <View style={styles.container}>
      <Input
        value={keyword}
        onChangeText={onKeywordChange}
        placeholder="헬스장 이름 / 지역 검색"
      />

      <GymSortChips sortKey={sortKey} onChange={onSortKeyChange} />

      <View style={styles.filterRow}>
        <Pressable style={styles.filterButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.filterButtonText}>
            필터{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </Text>
        </Pressable>

        {maxPrice !== null && priceBandLabel ? (
          <Pressable style={styles.badge} onPress={() => onMaxPriceChange(null)}>
            <Text style={styles.badgeText}>{priceBandLabel}</Text>
            <Text style={styles.badgeRemove}>×</Text>
          </Pressable>
        ) : null}

        {region !== null ? (
          <Pressable style={styles.badge} onPress={() => onRegionChange(null)}>
            <Text style={styles.badgeText}>
              {region.sido} {region.sigungu ?? "전체"}
            </Text>
            <Text style={styles.badgeRemove}>×</Text>
          </Pressable>
        ) : null}
      </View>

      <GymListFilterModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        maxPrice={maxPrice}
        onMaxPriceChange={onMaxPriceChange}
        region={region}
        onRegionChange={onRegionChange}
      />
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
    filterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      alignItems: "center",
    },
    filterButton: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.primaryMuted,
    },
    filterButtonText: {
      fontSize: fontSize.sm,
      fontWeight: "700",
      color: colors.primary,
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.primary,
    },
    badgeText: {
      fontSize: fontSize.sm,
      color: colors.white,
      fontWeight: "600",
    },
    badgeRemove: {
      fontSize: fontSize.md,
      color: colors.white,
      fontWeight: "700",
    },
  });
}
