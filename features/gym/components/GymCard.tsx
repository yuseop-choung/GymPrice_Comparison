import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ColorTheme } from "../../../constants/colors";
import { elevation, fontSize, radius, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";
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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <Text style={styles.name} numberOfLines={1}>
        {gym.name}
      </Text>
      {gym.address ? (
        <Text style={styles.address} numberOfLines={1}>
          {gym.address}
        </Text>
      ) : null}

      <View style={styles.priceRow}>
        {gym.lowest_price_1m !== null ? (
          <>
            <Text style={styles.priceLabel}>최저가</Text>
            <Text style={styles.price}>{formatPrice(gym.lowest_price_1m)}/월</Text>
          </>
        ) : (
          <Text style={styles.noPrice}>가격 정보 없음</Text>
        )}
      </View>
    </Pressable>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      ...elevation(colors.shadow),
    },
    pressed: {
      opacity: 0.8,
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
    priceRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    priceLabel: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
    },
    price: {
      fontSize: fontSize.md,
      fontWeight: "700",
      color: colors.primary,
    },
    noPrice: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
    },
  });
}
