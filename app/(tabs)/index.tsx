import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StateView } from "../../components/ui/StateView";
import type { ColorTheme } from "../../constants/colors";
import { SEARCH_RADIUS_KM } from "../../constants/config";
import { fontSize, radius, spacing } from "../../constants/layout";
import { GymCard } from "../../features/gym/components/GymCard";
import { KakaoMap } from "../../features/gym/components/KakaoMap";
import { useNearbyGyms } from "../../features/gym/hooks";
import { formatPrice } from "../../features/price/utils";
import { useSyncUserLocation } from "../../features/user/hooks";
import { useLocation } from "../../hooks/useLocation";
import { useThemeColors } from "../../hooks/useThemeColors";

/** 홈 화면 — 지도 중심. 지도 영역 + 내 주변 헬스장 미리보기 (UI 전담) */
export default function HomeScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { coords, isLoading: isLocating } = useLocation();
  const { gyms, isLoading, error, refetch } = useNearbyGyms(
    coords.lat,
    coords.lng,
    SEARCH_RADIUS_KM
  );
  useSyncUserLocation(coords, isLocating); // 내 동네 저장 (위치기반 알림용, GPS 확정 후에만)

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refetch}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <View style={styles.mapBox}>
        <KakaoMap
          center={coords}
          markers={gyms.map((g) => ({
            id: g.id,
            name: g.name,
            lat: g.lat,
            lng: g.lng,
            label:
              g.lowest_price_1m !== null
                ? formatPrice(g.lowest_price_1m)
                : "가격 미정",
          }))}
          onMarkerPress={(id) => router.push(`/gym/${id}`)}
        />
      </View>

      <Text style={styles.sectionTitle}>내 주변 헬스장</Text>

      {isLoading && gyms.length === 0 ? (
        <StateView loading />
      ) : error ? (
        <StateView message={error} />
      ) : gyms.length === 0 ? (
        <StateView message="주변에 등록된 헬스장이 없어요." />
      ) : (
        gyms.map((gym) => (
          <GymCard
            key={gym.id}
            gym={gym}
            onPress={() => router.push(`/gym/${gym.id}`)}
          />
        ))
      )}
    </ScrollView>
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
    mapBox: {
      height: 220,
      borderRadius: radius.lg,
      overflow: "hidden",
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: "600",
      color: colors.text,
      marginBottom: spacing.md,
    },
  });
}
