import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../../constants/colors";
import { fontSize, radius, spacing } from "../../../constants/layout";
import type { GymWithPrice } from "../../../types";
import { formatPrice } from "../../price/utils";

/**
 * 헬스장 1건을 표시하는 리스트 카드 (UI 전담)
 * - 이름/주소 + 1개월권 최저가를 보여주고 누르면 onPress 호출.
 */
interface GymCardProps {
  gym: GymWithPrice;
  onPress: () => void;
}

export function GymCard({ gym, onPress }: GymCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <Text style={styles.name} numberOfLines={1}>
        {gym.name}
      </Text>
      <Text style={styles.address} numberOfLines={1}>
        {gym.address}
      </Text>

      {gym.lowest_price_1m !== null ? (
        <Text style={styles.price}>
          1개월 최저 {formatPrice(gym.lowest_price_1m)}
        </Text>
      ) : (
        <Text style={styles.noPrice}>가격 정보 없음</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },
  name: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.text,
  },
  address: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  price: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.primary,
    marginTop: spacing.sm,
  },
  noPrice: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
