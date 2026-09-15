import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ColorTheme } from "../../../constants/colors";
import { fontSize, radius, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";
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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
      onPress={onPress}
    >
      <View style={styles.textCol}>
        <Text style={styles.label}>
          관심 지역 ({regions.length}/{maxCount})
        </Text>
        <Text style={styles.value} numberOfLines={1}>
          {regions.length === 0
            ? "설정 안 함"
            : regions.map((r) => `${r.sido} ${r.sigungu}`).join(", ")}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
    },
    pressed: {
      opacity: 0.7,
    },
    textCol: {
      flex: 1,
    },
    label: {
      fontSize: fontSize.md,
      color: colors.text,
      fontWeight: "600",
    },
    value: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });
}
