import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Input } from "../../components/ui/Input";
import { colors } from "../../constants/colors";
import { SEARCH_RADIUS_KM } from "../../constants/config";
import { fontSize, radius, spacing } from "../../constants/layout";
import { GymCard } from "../../features/gym/components/GymCard";
import { useNearbyGyms } from "../../features/gym/hooks";
import { distanceKm } from "../../features/gym/utils";
import { useLocation } from "../../hooks/useLocation";

type SortKey = "distance" | "price";

/** 리스트 화면 — 검색 + 정렬(거리순/최저가순). UI 전담 */
export default function ListScreen() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("distance");
  const { coords } = useLocation();
  const { gyms, isLoading, error } = useNearbyGyms(
    coords.lat,
    coords.lng,
    SEARCH_RADIUS_KM
  );

  // 키워드 필터 → 정렬 순으로 가공 (가격 없는 곳은 최저가순에서 뒤로)
  const visibleGyms = useMemo(() => {
    const q = keyword.trim();
    const filtered =
      q === ""
        ? gyms
        : gyms.filter((g) => g.name.includes(q) || g.address.includes(q));

    return [...filtered].sort((a, b) => {
      if (sortKey === "price") {
        if (a.lowest_price_1m === null) return 1;
        if (b.lowest_price_1m === null) return -1;
        return a.lowest_price_1m - b.lowest_price_1m;
      }
      return (
        distanceKm(coords.lat, coords.lng, a.lat, a.lng) -
        distanceKm(coords.lat, coords.lng, b.lat, b.lng)
      );
    });
  }, [gyms, keyword, sortKey, coords.lat, coords.lng]);

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Input
          value={keyword}
          onChangeText={setKeyword}
          placeholder="헬스장 이름 / 지역 검색"
        />
        <View style={styles.sortRow}>
          {(["distance", "price"] as const).map((key) => (
            <Pressable
              key={key}
              onPress={() => setSortKey(key)}
              style={[styles.chip, sortKey === key ? styles.chipActive : null]}
            >
              <Text
                style={[
                  styles.chipText,
                  sortKey === key ? styles.chipTextActive : null,
                ]}
              >
                {key === "distance" ? "거리순" : "최저가순"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      ) : error ? (
        <Text style={styles.message}>{error}</Text>
      ) : (
        <FlatList
          data={visibleGyms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <GymCard gym={item} onPress={() => router.push(`/gym/${item.id}`)} />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.message}>검색 결과가 없어요.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchBox: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sortRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  loading: {
    marginTop: spacing.xl,
  },
  message: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});
