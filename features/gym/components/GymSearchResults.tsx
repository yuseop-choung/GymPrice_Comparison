import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../../constants/colors";
import { fontSize, radius, spacing } from "../../../constants/layout";
import type { KakaoPlace } from "../../../lib/api/kakao";
import { formatDistance } from "../utils";

/**
 * 장소 검색 결과 목록 (UI 전담)
 * - 거리순으로 정렬된 카카오 장소 검색 결과를 보여주고, 선택 시 onSelect 호출.
 */
interface GymSearchResultsProps {
  results: KakaoPlace[];
  onSelect: (place: KakaoPlace) => void;
}

export function GymSearchResults({ results, onSelect }: GymSearchResultsProps) {
  if (results.length === 0) return null;

  return (
    <View style={styles.list}>
      {results.map((place) => (
        <Pressable
          key={place.id}
          style={({ pressed }) => [styles.item, pressed ? styles.pressed : null]}
          onPress={() => onSelect(place)}
        >
          <Text style={styles.name} numberOfLines={1}>
            {place.name}
          </Text>
          <Text style={styles.address} numberOfLines={1}>
            {place.address}
          </Text>
          {place.distanceM !== null ? (
            <Text style={styles.distance}>
              {formatDistance(place.distanceM / 1000)}
            </Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  item: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.text,
  },
  address: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  distance: {
    fontSize: fontSize.sm,
    color: colors.primary,
    marginTop: spacing.xs,
  },
});
