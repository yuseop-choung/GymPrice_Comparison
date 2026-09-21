import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { StateView } from "../../components/ui/StateView";
import type { ColorTheme } from "../../constants/colors";
import { fontSize, spacing } from "../../constants/layout";
import { GymSearchResults } from "../../features/gym/components/GymSearchResults";
import { useGymDetailGate } from "../../features/gym/hooks";
import { GymResultRow } from "../../features/search/components/GymResultRow";
import { useUnifiedSearch } from "../../features/search/hooks";
import { useThemeColors } from "../../hooks/useThemeColors";
import type { KakaoPlace } from "../../lib/api/kakao";

/**
 * 통합 검색 화면
 * - 헬스장 이름(반경 제한 없이 전체 DB)과 장소/지역(카카오)을 한 번에 검색한다.
 * - 헬스장 결과를 누르면 상세로 이동, 장소 결과를 누르면 홈 지도를 그 위치로 이동시킨다.
 */
export default function SearchScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { openGymDetail } = useGymDetailGate();
  const [query, setQuery] = useState("");
  const { gymResults, placeResults, isSearching, hasSearched, error, search } =
    useUnifiedSearch();

  function handleSelectPlace(place: KakaoPlace): void {
    // 홈 탭으로 이동하며 검색한 위치를 넘긴다 — 홈 화면이 이 값을 받아 지도를 옮긴다.
    router.push({
      pathname: "/",
      params: {
        focusLat: String(place.lat),
        focusLng: String(place.lng),
        focusName: place.name,
      },
    });
  }

  const noResults =
    hasSearched &&
    !isSearching &&
    gymResults.length === 0 &&
    placeResults.length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Input
          label="헬스장 또는 지역 검색"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => search(query)}
          placeholder="예: 강철짐, 강남역, 서초구"
          returnKeyType="search"
        />
        <Button title="검색" onPress={() => search(query)} loading={isSearching} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView
        style={styles.results}
        contentContainerStyle={styles.resultsContent}
        keyboardShouldPersistTaps="handled"
      >
        {noResults ? <StateView message="검색 결과가 없어요." /> : null}

        {gymResults.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>헬스장</Text>
            {gymResults.map((gym) => (
              <GymResultRow
                key={gym.id}
                gym={gym}
                onPress={() => openGymDetail(gym.id)}
              />
            ))}
          </>
        ) : null}

        {placeResults.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>장소·지역</Text>
            <GymSearchResults results={placeResults} onSelect={handleSelectPlace} />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    searchBox: {
      padding: spacing.lg,
      gap: spacing.sm,
    },
    error: {
      fontSize: fontSize.sm,
      color: colors.error,
      paddingHorizontal: spacing.lg,
    },
    results: {
      flex: 1,
    },
    resultsContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
    },
    sectionTitle: {
      fontSize: fontSize.md,
      fontWeight: "600",
      color: colors.text,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
  });
}
