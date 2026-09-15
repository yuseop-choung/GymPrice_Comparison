import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../../constants/colors";
import { fontSize, radius, spacing } from "../../../constants/layout";
import type { GymPrice, PriceStatus } from "../../../types";
import { formatPrice } from "../../price/utils";

/** 심사 상태별 표시 라벨/색상 (내가 등록한 가격 목록에서 상태 확인용) */
const STATUS_LABEL: Record<PriceStatus, { text: string; color: string }> = {
  pending: { text: "심사중", color: colors.textSecondary },
  approved: { text: "승인됨", color: colors.primary },
  rejected: { text: "거절됨", color: colors.error },
};

/**
 * 가격 항목 1건(라벨 + 가격)을 표시하는 카드 (UI 전담)
 * - 메모, 심사 상태도 함께 보여준다.
 */
interface PriceCardProps {
  price: GymPrice;
}

export function PriceCard({ price }: PriceCardProps) {
  const status = STATUS_LABEL[price.status];

  return (
    <View style={styles.card}>
      <Text style={[styles.status, { color: status.color }]}>{status.text}</Text>
      <View style={styles.row}>
        <Text style={styles.label}>{price.label}</Text>
        <Text style={styles.value}>{formatPrice(price.price)}</Text>
      </View>
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
  status: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    marginBottom: spacing.xs,
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
