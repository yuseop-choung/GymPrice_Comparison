import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../../constants/colors";
import { fontSize, spacing } from "../../../constants/layout";
import type { GymPrice } from "../../../types";
import { PriceDetailList } from "./PriceDetailList";
import { PriceSummary } from "./PriceSummary";

/**
 * 헬스장 상세 화면의 가격 섹션 (UI 전담)
 * - 승인된 가격이 있으면 요약 + "상세 내역 보기" 토글(누르면 개별 등록 내역이
 *   최저가 배지와 함께 날짜순으로 펼쳐진다), 없으면 안내 문구를 보여준다.
 */
interface GymPriceSectionProps {
  prices: GymPrice[];
}

export function GymPriceSection({ prices }: GymPriceSectionProps) {
  const [showDetail, setShowDetail] = useState(false);
  const approvedPrices = prices.filter((price) => price.status === "approved");

  if (approvedPrices.length === 0) {
    return (
      <Text style={styles.empty}>
        아직 승인된 가격이 없어요. 첫 가격을 등록해보세요!
      </Text>
    );
  }

  return (
    <View style={styles.wrap}>
      <PriceSummary prices={approvedPrices} />
      <Pressable onPress={() => setShowDetail((v) => !v)}>
        <Text style={styles.toggle}>
          {showDetail ? "상세 내역 숨기기" : "등록된 가격 상세 보기"}
        </Text>
      </Pressable>
      {showDetail ? (
        <View style={styles.detailWrap}>
          <PriceDetailList prices={approvedPrices} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.lg,
  },
  toggle: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.primary,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  detailWrap: {
    marginTop: spacing.xs,
  },
  empty: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});
