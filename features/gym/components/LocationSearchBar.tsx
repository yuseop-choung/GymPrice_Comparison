import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, TextInput, View } from "react-native";
import type { ColorTheme } from "../../../constants/colors";
import { elevation, fontSize, radius, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";
import type { KakaoPlace } from "../../../lib/api/kakao";
import { GymSearchResults } from "./GymSearchResults";

interface LocationSearchBarProps {
  query: string;
  onQueryChange: (text: string) => void;
  onSubmit: () => void;
  results: KakaoPlace[];
  onSelectResult: (place: KakaoPlace) => void;
  onDismissResults: () => void;
}

/**
 * 홈 화면 지도 위에 떠 있는 "동네 검색" 바 (UI 전담)
 * - 지도 상단에 고정, 결과는 그 아래 오버레이 드롭다운으로 보여준다.
 */
export function LocationSearchBar({
  query,
  onQueryChange,
  onSubmit,
  results,
  onSelectResult,
  onDismissResults,
}: LocationSearchBarProps) {
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
      <View ref={anchorRef} collapsable={false} style={styles.bar}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          onSubmitEditing={onSubmit}
          placeholder="동네 검색 (예: 강남역)"
          placeholderTextColor={colors.textSecondary}
          returnKeyType="search"
          style={styles.input}
        />
      </View>

      <Modal
        visible={results.length > 0}
        transparent
        animationType="fade"
        onRequestClose={onDismissResults}
      >
        <Pressable style={styles.backdrop} onPress={onDismissResults} />
        <View style={[styles.dropdown, { top: dropdownTop }]}>
          <GymSearchResults
            results={results}
            onSelect={(place) => {
              onSelectResult(place);
              onDismissResults();
            }}
          />
        </View>
      </Modal>
    </>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    bar: {
      position: "absolute",
      top: spacing.sm,
      left: spacing.sm,
      right: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: colors.surfaceElevated,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      ...elevation(colors.shadow, "md"),
    },
    input: {
      flex: 1,
      fontSize: fontSize.md,
      color: colors.text,
      padding: 0,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay,
    },
    dropdown: {
      position: "absolute",
      left: spacing.lg,
      right: spacing.lg,
      maxHeight: 320,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      overflow: "hidden",
      ...elevation(colors.shadow, "md"),
    },
  });
}
