import { useMemo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import type { ColorTheme } from "../../../constants/colors";
import { fontSize, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";
import type { MyPriceItem } from "../../../types";
import { PriceCard } from "../../gym/components/PriceCard";

/**
 * 내가 등록한 가격 1건 (UI 전담)
 * - 헬스장 이름(누르면 수정/삭제 화면으로 이동) + 가격 카드.
 */
interface MyPriceCardProps {
  item: MyPriceItem;
  onPress: () => void;
}

export function MyPriceCard({ item, onPress }: MyPriceCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <>
      <Pressable onPress={onPress} hitSlop={4}>
        {({ pressed }) => (
          <Text style={[styles.gymName, pressed ? styles.pressed : null]}>
            {item.gym_name}
          </Text>
        )}
      </Pressable>
      <PriceCard price={item} />
    </>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    gymName: {
      fontSize: fontSize.md,
      fontWeight: "600",
      color: colors.primary,
      marginBottom: spacing.xs,
    },
    pressed: {
      opacity: 0.7,
    },
  });
}
