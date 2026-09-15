import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { StateView } from "../../components/ui/StateView";
import type { ColorTheme } from "../../constants/colors";
import { SEARCH_RADIUS_KM } from "../../constants/config";
import { spacing } from "../../constants/layout";
import { GymCard } from "../../features/gym/components/GymCard";
import { GymListFilters, type SortKey } from "../../features/gym/components/GymListFilters";
import { useNearbyGyms } from "../../features/gym/hooks";
import { distanceKm } from "../../features/gym/utils";
import { useLocation } from "../../hooks/useLocation";
import { useThemeColors } from "../../hooks/useThemeColors";

/** 리스트 화면 — 검색 + 정렬(거리순/최저가순). UI 전담, 필터 입력은 GymListFilters에 위임 */
export default function ListScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("distance");
  const { coords, isLoading: isLocating } = useLocation();
  const { gyms, isLoading, error, refetch } = useNearbyGyms(
    coords.lat,
    coords.lng,
    SEARCH_RADIUS_KM,
    !isLocating // GPS가 아직 확정되지 않았으면(DEFAULT_COORDS 상태) 조회를 미룬다
  );

  // 키워드 필터 → 정렬 순으로 가공 (가격 없는 곳은 최저가순에서 뒤로)
  const visibleGyms = useMemo(() => {
    const q = keyword.trim();
    const filtered =
      q === ""
        ? gyms
        : gyms.filter((g) => g.name.includes(q) || (g.address ?? "").includes(q));

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
      <GymListFilters
        keyword={keyword}
        onKeywordChange={setKeyword}
        sortKey={sortKey}
        onSortKeyChange={setSortKey}
      />

      {isLoading && gyms.length === 0 ? (
        <StateView loading fill />
      ) : error ? (
        <StateView message={error} fill />
      ) : (
        <FlatList
          data={visibleGyms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <GymCard gym={item} onPress={() => router.push(`/gym/${item.id}`)} />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={<StateView message="검색 결과가 없어요." />}
        />
      )}
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
    },
  });
}
