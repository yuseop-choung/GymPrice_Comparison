import { useRouter } from "expo-router";
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
import { PriceViewLimitModal } from "../../price/components/PriceViewLimitModal";
import { useDetailPriceAccess } from "../../price/hooks";
import { summarizePrices } from "../../price/utils";
import { OneMonthPriceHighlight } from "./OneMonthPriceHighlight";
import { PriceDetailList } from "./PriceDetailList";
import { PriceSummary } from "./PriceSummary";

// 안드로이드에서는 LayoutAnimation을 쓰려면 명시적으로 활성화해야 한다.
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ONE_MONTH_LABEL = "1개월";

/**
 * 헬스장 상세 화면의 가격 섹션 (UI 전담)
 * - 1개월 최저가는 누구나 무료로 바로 볼 수 있다.
 * - 3개월/6개월/12개월 등 다른 기간과 개별 등록 내역은 "다른 기간 가격 보기"를
 *   눌러야 보인다 — 이때 useDetailPriceAccess가 하루 무료 열람 한도(3곳,
 *   기여자는 무제한)를 서버에 확인한다. 한도를 넘으면 안내 모달을 띄운다.
 */
interface GymPriceSectionProps {
  gymId: string;
  prices: GymPrice[];
}

export function GymPriceSection({ gymId, prices }: GymPriceSectionProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [showDetail, setShowDetail] = useState(false);
  const { isChecking, limitReached, requestAccess, dismissLimitModal } =
    useDetailPriceAccess(gymId);

  const approvedPrices = prices.filter((price) => price.status === "approved");
  const oneMonthStat = summarizePrices(approvedPrices).find(
    (stat) => stat.label === ONE_MONTH_LABEL
  );
  const otherPrices = approvedPrices.filter((price) => price.label !== ONE_MONTH_LABEL);

  async function toggleDetail() {
    if (showDetail) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowDetail(false);
      return;
    }
    const allowed = await requestAccess();
    if (!allowed) return; // 한도 초과 — limitReached가 true가 되어 모달이 뜬다
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowDetail(true);
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
      <OneMonthPriceHighlight minPrice={oneMonthStat?.min ?? null} />

      <Pressable onPress={toggleDetail} hitSlop={8} disabled={isChecking}>
        <Text style={styles.toggle}>
          {isChecking
            ? "확인 중..."
            : showDetail
              ? "상세 내역 숨기기 ▲"
              : "다른 기간 가격 보기 ▼"}
        </Text>
      </Pressable>

      {showDetail ? (
        <View style={styles.detailWrap}>
          {otherPrices.length > 0 ? <PriceSummary prices={otherPrices} /> : null}
          <PriceDetailList prices={approvedPrices} />
        </View>
      ) : null}

      <PriceViewLimitModal
        visible={limitReached}
        onClose={dismissLimitModal}
        onRegisterPress={() => {
          dismissLimitModal();
          router.push(`/gym/${gymId}/price-submit`);
        }}
      />
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
