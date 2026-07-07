import { useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../../constants/colors";
import { SEARCH_RADIUS_KM } from "../../constants/config";
import { fontSize, radius, spacing } from "../../constants/layout";
import { GymCard } from "../../features/gym/components/GymCard";
import { KakaoMap } from "../../features/gym/components/KakaoMap";
import { useNearbyGyms } from "../../features/gym/hooks";
import { useLocation } from "../../hooks/useLocation";

/** 홈 화면 — 지도 중심. 지도 영역 + 내 주변 헬스장 미리보기 (UI 전담) */
export default function HomeScreen() {
  const router = useRouter();
  const { coords } = useLocation();
  const { gyms, isLoading, error } = useNearbyGyms(
    coords.lat,
    coords.lng,
    SEARCH_RADIUS_KM
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.mapBox}>
        <KakaoMap
          center={coords}
          markers={gyms.map((g) => ({
            id: g.id,
            name: g.name,
            lat: g.lat,
            lng: g.lng,
          }))}
          onMarkerPress={(id) => router.push(`/gym/${id}`)}
        />
      </View>

      <Text style={styles.sectionTitle}>내 주변 헬스장</Text>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      ) : error ? (
        <Text style={styles.message}>{error}</Text>
      ) : gyms.length === 0 ? (
        <Text style={styles.message}>주변에 등록된 헬스장이 없어요.</Text>
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

const styles = StyleSheet.create({
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
  loading: {
    marginTop: spacing.lg,
  },
  message: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});
