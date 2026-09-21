import { useMemo } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { StateView } from "../../components/ui/StateView";
import type { ColorTheme } from "../../constants/colors";
import { spacing } from "../../constants/layout";
import { GymCard } from "../../features/gym/components/GymCard";
import { GymListFilters } from "../../features/gym/components/GymListFilters";
import { useGymDetailGate, useGymListing } from "../../features/gym/hooks";
import { useLocation } from "../../hooks/useLocation";
import { useThemeColors } from "../../hooks/useThemeColors";

/** 리스트 화면 — 검색(전체 대상) + 정렬(거리순/최저가순) + 가격대 필터. UI 전담, 로직은 useGymListing에 위임 */
export default function ListScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { openGymDetail } = useGymDetailGate();
  const { coords, isLoading: isLocating } = useLocation();
  const {
    keyword,
    setKeyword,
    submitSearch,
    sortKey,
    setSortKey,
    maxPrice,
    setMaxPrice,
    gyms,
    isLoading,
    error,
    refetch,
  } = useGymListing(coords, isLocating);

  return (
    <View style={styles.container}>
      <GymListFilters
        keyword={keyword}
        onKeywordChange={setKeyword}
        onSubmit={submitSearch}
        sortKey={sortKey}
        onSortKeyChange={setSortKey}
        maxPrice={maxPrice}
        onMaxPriceChange={setMaxPrice}
      />

      {isLoading && gyms.length === 0 ? (
        <StateView loading fill />
      ) : error ? (
        <StateView message={error} fill />
      ) : (
        <FlatList
          data={gyms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <GymCard gym={item} onPress={() => openGymDetail(item.id)} />
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
