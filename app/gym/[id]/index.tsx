import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { StateView } from "../../../components/ui/StateView";
import { colors } from "../../../constants/colors";
import { fontSize, spacing } from "../../../constants/layout";
import { GymActions } from "../../../features/gym/components/GymActions";
import { GymDetailInfo } from "../../../features/gym/components/GymDetailInfo";
import { PriceCard } from "../../../features/gym/components/PriceCard";
import { PriceSummary } from "../../../features/gym/components/PriceSummary";
import { useGymDetail } from "../../../features/gym/hooks";
import { distanceKm, formatDistance } from "../../../features/gym/utils";
import { useLocation } from "../../../hooks/useLocation";

/** 헬스장 상세 화면 — UI 전담, 데이터 조회는 useGymDetail 훅에 위임 */
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
  const distance = formatDistance(
    distanceKm(coords.lat, coords.lng, gym.lat, gym.lng)
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={prices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PriceCard price={item} />}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
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

            {prices.length > 0 ? (
              <View style={styles.summaryWrap}>
                <PriceSummary prices={prices} />
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>
              등록된 가격 ({prices.length})
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            아직 등록된 가격이 없어요. 첫 가격을 등록해보세요!
          </Text>
        }
      />

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
  header: {
    marginBottom: spacing.lg,
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
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.lg,
  },
  empty: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});
