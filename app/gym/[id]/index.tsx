import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { StateView } from "../../../components/ui/StateView";
import type { ColorTheme } from "../../../constants/colors";
import { fontSize, spacing } from "../../../constants/layout";
import { useTrackGymView } from "../../../features/analytics/hooks";
import { GymActions } from "../../../features/gym/components/GymActions";
import { GymDetailInfo } from "../../../features/gym/components/GymDetailInfo";
import { GymPriceSection } from "../../../features/gym/components/GymPriceSection";
import { useGymDetail } from "../../../features/gym/hooks";
import { distanceKm, formatDistance } from "../../../features/gym/utils";
import { useLocation } from "../../../hooks/useLocation";
import { useThemeColors } from "../../../hooks/useThemeColors";
import { useAuthStore } from "../../../store/authStore";

/**
 * 헬스장 상세 화면 — UI 전담, 데이터 조회는 useGymDetail 훅에 위임
 * - 가격 표시(요약/상세 토글)는 GymPriceSection에 위임한다.
 */
export default function GymDetailScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id: gymId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, error, refetch } = useGymDetail(gymId);
  const { coords } = useLocation();
  const user = useAuthStore((state) => state.user);
  useTrackGymView(user?.uid, gymId); // 관리자 대시보드 "오늘 조회" 지표용

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
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.name}>{gym.name}</Text>
        {gym.address ? <Text style={styles.address}>{gym.address}</Text> : null}
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

        <GymPriceSection gymId={gymId} prices={prices} />
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

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.lg,
    },
    footer: {
      padding: spacing.lg,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
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
  });
}
