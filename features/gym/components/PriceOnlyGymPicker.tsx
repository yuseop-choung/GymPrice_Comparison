import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import type { ColorTheme } from "../../../constants/colors";
import { fontSize, radius, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";
import type { Gym } from "../../../types";

interface PriceOnlyGymPickerProps {
  query: string;
  onQueryChange: (text: string) => void;
  onSubmit: () => void;
  isSearching: boolean;
  hasSearched: boolean;
  error: string | null;
  results: Gym[];
  onSelect: (gym: Gym) => void;
}

/**
 * "가격 등록" 모드의 헬스장 검색 영역 (UI 전담)
 * - 이미 등록된 헬스장을 이름으로 찾아 선택하면 곧바로 그 헬스장의 가격 등록 화면으로 이동한다.
 * - 화면 자체(스크롤 등)는 register.tsx가 담당하므로 목록은 접히지 않는 View로 그린다.
 */
export function PriceOnlyGymPicker({
  query,
  onQueryChange,
  onSubmit,
  isSearching,
  hasSearched,
  error,
  results,
  onSelect,
}: PriceOnlyGymPickerProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Input
        label="헬스장 이름 검색"
        value={query}
        onChangeText={onQueryChange}
        onSubmitEditing={onSubmit}
        placeholder="예: 강철짐 강남점"
        returnKeyType="search"
      />
      <Button title="검색" onPress={onSubmit} loading={isSearching} />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && hasSearched && !isSearching && results.length === 0 ? (
        <Text style={styles.empty}>
          검색 결과가 없어요. 이름을 다시 확인하거나, 없는 헬스장이면 &ldquo;헬스장
          등록&rdquo; 탭에서 새로 등록해주세요.
        </Text>
      ) : null}

      {results.map((gym) => (
        <Pressable key={gym.id} style={styles.row} onPress={() => onSelect(gym)}>
          <Text style={styles.name}>{gym.name}</Text>
          {gym.address ? <Text style={styles.address}>{gym.address}</Text> : null}
        </Pressable>
      ))}
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    container: {
      gap: spacing.sm,
    },
    error: {
      fontSize: fontSize.sm,
      color: colors.error,
    },
    empty: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
    row: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
    },
    name: {
      fontSize: fontSize.md,
      fontWeight: "600",
      color: colors.text,
    },
    address: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });
}
