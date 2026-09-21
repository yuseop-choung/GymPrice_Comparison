import { useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { radius, spacing } from "../../../constants/layout";
import { useLocationSearch } from "../useLocationSearch";
import type { KakaoPlace } from "../../../lib/api/kakao";
import { KakaoMap, type KakaoMapHandle } from "./KakaoMap";
import type { MapBounds, MapMarker } from "./kakaoMapHtml";
import { LocationSearchBar } from "./LocationSearchBar";
import { MapRecenterButton } from "./MapRecenterButton";

interface HomeMapSectionProps {
  gpsCoords: { lat: number; lng: number };
  effectiveCoords: { lat: number; lng: number };
  isSearchFocused: boolean;
  onFocusPlace: (coords: { lat: number; lng: number }) => void;
  onClearFocus: () => void;
  markers: MapMarker[];
  onMarkerPress: (id: string) => void;
  onBoundsChange: (bounds: MapBounds) => void;
}

/**
 * 홈 화면 지도 영역 — 지도 + 동네 검색 바 + "내 위치로" 버튼을 한데 묶는다.
 * - 기준 좌표(GPS vs 검색 위치) 결정은 부모(useMapFocus)가 하고, 이 컴포넌트는
 *   동네 검색 UI/입력만 전담한다.
 */
export function HomeMapSection({
  gpsCoords,
  effectiveCoords,
  isSearchFocused,
  onFocusPlace,
  onClearFocus,
  markers,
  onMarkerPress,
  onBoundsChange,
}: HomeMapSectionProps) {
  const styles = useMemo(() => createStyles(), []);
  const mapRef = useRef<KakaoMapHandle>(null);
  const [query, setQuery] = useState("");
  const { results, search, reset } = useLocationSearch();

  // 검색 위치를 보고 있었다면 해제(GPS로 리로드), 아니면 패닝만 한다.
  function handleRecenter(): void {
    if (isSearchFocused) {
      onClearFocus();
      return;
    }
    mapRef.current?.recenter(gpsCoords.lat, gpsCoords.lng);
  }

  function handleSelectPlace(place: KakaoPlace): void {
    onFocusPlace({ lat: place.lat, lng: place.lng });
    setQuery(place.name);
  }

  return (
    <View style={styles.mapBox}>
      <KakaoMap
        ref={mapRef}
        center={effectiveCoords}
        markers={markers}
        onMarkerPress={onMarkerPress}
        onBoundsChange={onBoundsChange}
      />
      <LocationSearchBar
        query={query}
        onQueryChange={setQuery}
        onSubmit={() => search(query)}
        results={results}
        onSelectResult={handleSelectPlace}
        onDismissResults={reset}
      />
      <MapRecenterButton onPress={handleRecenter} />
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    mapBox: {
      height: 220,
      borderRadius: radius.lg,
      overflow: "hidden",
      margin: spacing.lg,
      marginBottom: spacing.md,
    },
  });
}
