import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import type { ColorTheme } from "../../../constants/colors";
import { KAKAO_REST_KEY } from "../../../constants/config";
import { elevation, fontSize, radius, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";
import type { KakaoPlace } from "../../../lib/api/kakao";
import { GymSearchResults } from "./GymSearchResults";

/**
 * 헬스장 등록 화면의 장소 검색 영역 (UI 전담)
 * - 검색어 입력 + 검색 버튼. 카카오 REST 키가 없으면 안내 문구를 보여준다.
 * - 검색 결과는 하단 탭 바까지 덮는 오버레이(Modal)로 띄운다 — 검색창 바로 아래에서
 *   화면 끝까지 펼쳐지고, 바깥을 누르거나 항목을 선택하면 닫힌다.
 */
interface GymSearchBoxProps {
  query: string;
  onQueryChange: (text: string) => void;
  onSubmit: () => void;
  isSearching: boolean;
  searchError: string | null;
  results: KakaoPlace[];
  onSelectResult: (place: KakaoPlace) => void;
  onDismissResults: () => void;
}

export function GymSearchBox({
  query,
  onQueryChange,
  onSubmit,
  isSearching,
  searchError,
  results,
  onSelectResult,
  onDismissResults,
}: GymSearchBoxProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const anchorRef = useRef<View>(null);
  const [dropdownTop, setDropdownTop] = useState(0);

  // 결과가 새로 생기면 검색창 바로 아래 위치를 측정해 오버레이 시작 지점으로 쓴다.
  useEffect(() => {
    if (results.length === 0) return;
    anchorRef.current?.measureInWindow((_x, y, _width, height) => {
      setDropdownTop(y + height + spacing.xs);
    });
  }, [results]);

  return (
    <>
      <View ref={anchorRef} collapsable={false} style={styles.anchor}>
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
      </View>

      <Modal
        visible={results.length > 0}
        transparent
        animationType="fade"
        onRequestClose={onDismissResults}
      >
        <Pressable style={styles.backdrop} onPress={onDismissResults} />
        <View style={[styles.dropdown, { top: dropdownTop }]} pointerEvents="box-none">
          <ScrollView style={styles.dropdownScroll} keyboardShouldPersistTaps="handled">
            <GymSearchResults
              results={results}
              onSelect={(place) => {
                onSelectResult(place);
                onDismissResults();
              }}
            />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    anchor: {
      gap: spacing.sm,
    },
    hint: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
    },
    error: {
      fontSize: fontSize.sm,
      color: colors.error,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay,
    },
    dropdown: {
      position: "absolute",
      left: spacing.lg,
      right: spacing.lg,
      bottom: 0,
    },
    dropdownScroll: {
      flexGrow: 0,
      maxHeight: "100%",
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      ...elevation(colors.shadow, "md"),
    },
  });
}
