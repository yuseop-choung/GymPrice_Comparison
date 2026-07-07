import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../../../constants/colors";
import { fontSize, spacing } from "../../../constants/layout";
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
  return (
    <>
      <Pressable onPress={onPress}>
        <Text style={styles.gymName}>{item.gym_name}</Text>
      </Pressable>
      <PriceCard price={item} />
    </>
  );
}

const styles = StyleSheet.create({
  gymName: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: spacing.xs,
  },
});
