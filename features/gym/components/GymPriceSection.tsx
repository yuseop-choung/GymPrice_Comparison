import { useMemo, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import type { ColorTheme } from "../../../constants/colors";
import { fontSize, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";
import type { GymPrice } from "../../../types";
import { PriceDetailList } from "./PriceDetailList";
import { PriceSummary } from "./PriceSummary";

// 안드로이드에서는 LayoutAnimation을 쓰려면 명시적으로 활성화해야 한다.
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * 헬스장 상세 화면의 가격 섹션 (UI 전담)
 * - 승인된 가격이 있으면 요약 + "상세 내역 보기" 토글(누르면 개별 등록 내역이
 *   최저가 배지와 함께 날짜순으로 펼쳐진다), 없으면 안내 문구를 보여준다.
 * - 펼침/접힘은 LayoutAnimation으로 부드럽게 전환된다.
 */
interface GymPriceSectionProps {
  prices: GymPrice[];
}

export function GymPriceSection({ prices }: GymPriceSectionProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showDetail, setShowDetail] = useState(false);
  const approvedPrices = prices.filter((price) => price.status === "approved");

  function toggleDetail() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowDetail((v) => !v);
  }

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
      <Pressable onPress={toggleDetail} hitSlop={8}>
        <Text style={styles.toggle}>
          {showDetail ? "상세 내역 숨기기 ▲" : "등록된 가격 상세 보기 ▼"}
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

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
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
}
