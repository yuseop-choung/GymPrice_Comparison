import { useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { StateView } from "../../components/ui/StateView";
import type { ColorTheme } from "../../constants/colors";
import { SEARCH_RADIUS_KM } from "../../constants/config";
import { fontSize, spacing } from "../../constants/layout";
import { GymCard } from "../../features/gym/components/GymCard";
import { HomeMapSection } from "../../features/gym/components/HomeMapSection";
import type { MapBounds } from "../../features/gym/components/kakaoMapHtml";
import { useGymDetailGate, useMapFocus, useNearbyGyms } from "../../features/gym/hooks";
import { isWithinBounds } from "../../features/gym/utils";
import { formatPrice } from "../../features/price/utils";
import { useSyncUserLocation } from "../../features/user/hooks";
import { useLocation } from "../../hooks/useLocation";
import { useThemeColors } from "../../hooks/useThemeColors";

/**
 * 홈 화면 — 지도 중심.
 * 지도는 화면 상단에 고정되고(그 위에 동네 검색 바), 아래 "내 주변 헬스장" 목록만
 * 스크롤된다. 목록에는 지도에 현재 보이는 영역(뷰포트) 안의 헬스장만 표시한다.
 */
export default function HomeScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { openGymDetail } = useGymDetailGate();
  const { coords, isLoading: isLocating } = useLocation();

  // 지도 위 동네 검색으로 다른 위치를 선택하면 GPS 대신 그 위치를 기준으로 쓴다.
  const { effectiveCoords, isSearchFocused, focusOn, clearFocus } = useMapFocus(coords);

  const { gyms, isLoading, error, refetch } = useNearbyGyms(
    effectiveCoords.lat,
    effectiveCoords.lng,
    SEARCH_RADIUS_KM,
    !isLocating // GPS가 아직 확정되지 않았으면(DEFAULT_COORDS 상태) 조회를 미룬다
  );
  useSyncUserLocation(coords, isLocating); // 내 동네 저장 (위치기반 알림용, GPS 확정 후에만)

  // 지도에 현재 보이는 영역 — 최초 idle 이벤트 전에는 null(전체 목록을 보여준다)
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);

  // gyms가 바뀔 때만 새로 만들어야 지도가 불필요하게 리로드되지 않는다.
  const markers = useMemo(
    () =>
      gyms.map((g) => ({
        id: g.id,
        name: g.name,
        lat: g.lat,
        lng: g.lng,
        label:
          g.lowest_price_1m !== null
            ? `${formatPrice(g.lowest_price_1m)}/월`
            : "가격 미정",
      })),
    [gyms]
  );

  // 지도 영역이 확정된 뒤에는 그 영역 안의 헬스장만 목록에 보여준다.
  const visibleGyms = useMemo(() => {
    if (mapBounds === null) return gyms;
    return gyms.filter((g) => isWithinBounds({ lat: g.lat, lng: g.lng }, mapBounds));
  }, [gyms, mapBounds]);

  return (
    <View style={styles.container}>
      <HomeMapSection
        gpsCoords={coords}
        effectiveCoords={effectiveCoords}
        isSearchFocused={isSearchFocused}
        onFocusPlace={focusOn}
        onClearFocus={clearFocus}
        markers={markers}
        onMarkerPress={openGymDetail}
        onBoundsChange={setMapBounds}
      />

      <Text style={styles.sectionTitle}>내 주변 헬스장</Text>

      {isLoading && gyms.length === 0 ? (
        <StateView loading />
      ) : error ? (
        <StateView message={error} />
      ) : (
        <FlatList
          data={visibleGyms}
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
          ListEmptyComponent={
            <StateView
              message={
                gyms.length === 0
                  ? "주변에 등록된 헬스장이 없어요."
                  : "지도에 보이는 영역에 헬스장이 없어요. 지도를 움직여보세요."
              }
            />
          }
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
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: "600",
      color: colors.text,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
    },
  });
}
