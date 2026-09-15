import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { StateView } from "../../../components/ui/StateView";
import { colors } from "../../../constants/colors";
import { fontSize, spacing } from "../../../constants/layout";
import { GymActions } from "../../../features/gym/components/GymActions";
import { GymDetailInfo } from "../../../features/gym/components/GymDetailInfo";
import { PriceSummary } from "../../../features/gym/components/PriceSummary";
import { useGymDetail } from "../../../features/gym/hooks";
import { distanceKm, formatDistance } from "../../../features/gym/utils";
import { useLocation } from "../../../hooks/useLocation";

/**
 * 헬스장 상세 화면 — UI 전담, 데이터 조회는 useGymDetail 훅에 위임
 * - 개별 제보(누가 얼마에 등록했는지)는 보여주지 않고, 관리자 승인된 가격 중
 *   기간별 최저가만 요약해서 보여준다.
 */
export default function GymDetailScreen() {
  const { id: gymId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, error, refetch } = useGymDetail(gymId);
  const { coords } = useLocation();

  // 화면 복귀 시 최신화 (가격/부가정보 수정 반영)
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  if (isLoading) return <StateView loading fill />;
  if (error || !data) {
    return <StateView message={error ?? "정보를 찾을 수 없습니다."} fill />;
  }

  const { gym, prices, detail } = data;
  const approvedPrices = prices.filter((price) => price.status === "approved");
  const distance = formatDistance(
    distanceKm(coords.lat, coords.lng, gym.lat, gym.lng)
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.name}>{gym.name}</Text>
        <Text style={styles.address}>{gym.address}</Text>
        <Text style={styles.distance}>현재 위치에서 {distance}</Text>
        {gym.phone ? <Text style={styles.phone}>{gym.phone}</Text> : null}

        <GymActions
          name={gym.name}
          lat={gym.lat}
          lng={gym.lng}
          phone={gym.phone}
        />

        <GymDetailInfo
          detail={detail}
          onEdit={() =>
            router.push({
              pathname: "/gym/[id]/detail-edit",
              params: { id: gymId },
            })
          }
        />

        {approvedPrices.length > 0 ? (
          <View style={styles.summaryWrap}>
            <PriceSummary prices={approvedPrices} />
          </View>
        ) : (
          <Text style={styles.empty}>
            아직 승인된 가격이 없어요. 첫 가격을 등록해보세요!
          </Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="가격 등록하기"
          onPress={() => router.push(`/gym/${gymId}/price-submit`)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryWrap: {
    marginTop: spacing.lg,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.text,
  },
  address: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  distance: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  phone: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  empty: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});
