import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ColorTheme } from "../../../constants/colors";
import { elevation, fontSize, radius, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";
import type { GymPrice } from "../../../types";
import { formatPrice, summarizePrices } from "../../price/utils";

/**
 * 기간별 최저가/평균가 요약 카드 (UI 전담)
 * - 등록된 가격들을 집계해 한눈에 비교할 수 있게 보여준다.
 */
interface PriceSummaryProps {
  prices: GymPrice[];
}

export function PriceSummary({ prices }: PriceSummaryProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const stats = summarizePrices(prices);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>가격 요약</Text>

      <View style={styles.headerRow}>
        <Text style={[styles.cell, styles.period]}>항목</Text>
        <Text style={[styles.cell, styles.value]}>최저가</Text>
        <Text style={[styles.cell, styles.value]}>평균가</Text>
      </View>

      {stats.map((stat) => (
        <View key={stat.label} style={styles.row}>
          <Text style={[styles.cell, styles.period]}>{stat.label}</Text>
          <Text style={[styles.cell, styles.value, styles.min]}>
            {formatPrice(stat.min)}
          </Text>
          <Text style={[styles.cell, styles.value]}>
            {formatPrice(stat.avg)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.lg,
      ...elevation(colors.shadow),
    },
    title: {
      fontSize: fontSize.lg,
      fontWeight: "700",
      color: colors.text,
      marginBottom: spacing.md,
    },
    headerRow: {
      flexDirection: "row",
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    row: {
      flexDirection: "row",
      paddingVertical: spacing.sm,
    },
    cell: {
      fontSize: fontSize.md,
    },
    period: {
      flex: 1,
      color: colors.textSecondary,
    },
    value: {
      flex: 1.3,
      textAlign: "right",
      color: colors.text,
    },
    min: {
      color: colors.primary,
      fontWeight: "700",
    },
  });
}
