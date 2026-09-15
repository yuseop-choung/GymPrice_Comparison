import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ColorTheme } from "../../../constants/colors";
import { fontSize, radius, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";
import type { GymPrice } from "../../../types";
import { dedupePrices, formatPrice, summarizePrices } from "../../price/utils";

/** ISO 날짜 문자열을 "YYYY.MM.DD"로 표시 */
function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

/**
 * 등록된 가격 상세 내역 (UI 전담)
 * - 승인된 가격을 최신순으로 보여준다. 각 라벨의 최저가 항목에는 "최저가" 배지를 단다.
 * - PriceSummary와 동일한 기준(dedupePrices)으로 걸러낸 데이터를 보여줘서 숫자가 항상 일치한다.
 */
interface PriceDetailListProps {
  prices: GymPrice[];
}

export function PriceDetailList({ prices }: PriceDetailListProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const deduped = dedupePrices(prices);
  const minByLabel = new Map(summarizePrices(prices).map((stat) => [stat.label, stat.min]));
  const sorted = [...deduped].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  if (sorted.length === 0) return null;

  return (
    <View>
      {sorted.map((price) => {
        const isLowest = minByLabel.get(price.label) === price.price;
        return (
          <View
            key={price.id}
            style={[styles.card, isLowest ? styles.cardLowest : null]}
          >
            <View style={styles.headerRow}>
              <Text style={styles.label}>{price.label}</Text>
              {isLowest ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>최저가</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.price}>{formatPrice(price.price)}</Text>
            {price.memo ? <Text style={styles.memo}>{price.memo}</Text> : null}
            <Text style={styles.date}>{formatDate(price.created_at)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: "transparent",
    },
    cardLowest: {
      borderColor: colors.primary,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    label: {
      fontSize: fontSize.md,
      fontWeight: "600",
      color: colors.text,
    },
    badge: {
      backgroundColor: colors.primary,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
    },
    badgeText: {
      fontSize: fontSize.sm,
      fontWeight: "700",
      color: colors.white,
    },
    price: {
      fontSize: fontSize.lg,
      fontWeight: "700",
      color: colors.text,
      marginTop: spacing.xs,
    },
    memo: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    date: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
  });
}
