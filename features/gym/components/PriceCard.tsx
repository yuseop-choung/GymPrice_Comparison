import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../../constants/colors";
import { fontSize, radius, spacing } from "../../../constants/layout";
import type { GymPrice } from "../../../types";
import { formatPrice } from "../../price/utils";

/**
 * 가격 1건을 표시하는 카드 (UI 전담)
 * - 1/3/6/12개월 가격과 메모를 보여준다.
 */
interface PriceCardProps {
  price: GymPrice;
}

export function PriceCard({ price }: PriceCardProps) {
  const rows = [
    { label: "1개월", value: price.price_1m },
    { label: "3개월", value: price.price_3m },
    { label: "6개월", value: price.price_6m },
    { label: "12개월", value: price.price_12m },
  ];

  return (
    <View style={styles.card}>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.value}>{formatPrice(row.value)}</Text>
        </View>
      ))}
      {price.memo ? <Text style={styles.memo}>{price.memo}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  label: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  value: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.text,
  },
  memo: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
