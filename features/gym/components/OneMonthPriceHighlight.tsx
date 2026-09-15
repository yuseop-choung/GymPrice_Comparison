import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ColorTheme } from "../../../constants/colors";
import { fontSize, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";
import { formatPrice } from "../../price/utils";

/**
 * 1개월 최저가 강조 표시 (UI 전담)
 * - 누구나 무료로 바로 볼 수 있는 유일한 값이라 별도 컴포넌트로 분리했다.
 * - 1개월 가격이 없으면(다른 기간 가격만 등록된 경우) 안내 문구로 대체한다.
 */
interface OneMonthPriceHighlightProps {
  /** 1개월 최저가. 등록된 1개월 가격이 없으면 null. */
  minPrice: number | null;
}

export function OneMonthPriceHighlight({ minPrice }: OneMonthPriceHighlightProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (minPrice === null) {
    return <Text style={styles.empty}>1개월 가격 정보는 아직 없어요.</Text>;
  }

  return (
    <View style={styles.highlight}>
      <Text style={styles.highlightLabel}>1개월 최저가</Text>
      <Text style={styles.highlightPrice}>{formatPrice(minPrice)}</Text>
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    highlight: {
      alignItems: "center",
      marginBottom: spacing.md,
    },
    highlightLabel: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
    },
    highlightPrice: {
      fontSize: fontSize.xxl,
      fontWeight: "700",
      color: colors.primary,
      marginTop: spacing.xs,
    },
    empty: {
      fontSize: fontSize.md,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.xl,
    },
  });
}
