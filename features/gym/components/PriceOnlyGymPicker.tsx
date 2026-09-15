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
  /** 검색 결과가 없을 때 "헬스장 등록"으로 바로 넘어가도록 유도하는 버튼의 콜백 */
  onRegisterNew: () => void;
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
  onRegisterNew,
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
        <View style={styles.emptyBox}>
          <Text style={styles.empty}>
            검색 결과가 없어요. 이름을 다시 확인하거나, 아직 등록되지 않은
            헬스장이면 새로 등록해보세요.
          </Text>
          <Button title="새 헬스장으로 등록하기" onPress={onRegisterNew} />
        </View>
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
    emptyBox: {
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    empty: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
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
