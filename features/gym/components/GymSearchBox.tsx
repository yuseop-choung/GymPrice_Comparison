import { useMemo } from "react";
import { StyleSheet, Text } from "react-native";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import type { ColorTheme } from "../../../constants/colors";
import { KAKAO_REST_KEY } from "../../../constants/config";
import { fontSize, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";
import type { KakaoPlace } from "../../../lib/api/kakao";
import { GymSearchResults } from "./GymSearchResults";

/**
 * 헬스장 등록 화면의 장소 검색 영역 (UI 전담)
 * - 검색어 입력 + 검색 버튼 + 결과 목록. 카카오 REST 키가 없으면 안내 문구를 보여준다.
 */
interface GymSearchBoxProps {
  query: string;
  onQueryChange: (text: string) => void;
  onSubmit: () => void;
  isSearching: boolean;
  searchError: string | null;
  results: KakaoPlace[];
  onSelectResult: (place: KakaoPlace) => void;
}

export function GymSearchBox({
  query,
  onQueryChange,
  onSubmit,
  isSearching,
  searchError,
  results,
  onSelectResult,
}: GymSearchBoxProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <>
      <Input
        label="헬스장 검색"
        value={query}
        onChangeText={onQueryChange}
        onSubmitEditing={onSubmit}
        placeholder="이름 또는 주소로 검색"
        returnKeyType="search"
      />
      <Button title="검색" onPress={onSubmit} loading={isSearching} />
      {!KAKAO_REST_KEY ? (
        <Text style={styles.hint}>
          검색 기능을 사용하려면 카카오 REST API 키(EXPO_PUBLIC_KAKAO_REST_KEY)가
          필요합니다. 없으면 아래 항목을 직접 입력해주세요.
        </Text>
      ) : null}
      {searchError ? <Text style={styles.error}>{searchError}</Text> : null}

      <GymSearchResults results={results} onSelect={onSelectResult} />
    </>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    hint: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    error: {
      fontSize: fontSize.sm,
      color: colors.error,
      marginBottom: spacing.md,
    },
  });
}
