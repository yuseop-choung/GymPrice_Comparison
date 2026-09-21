import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ColorTheme } from "../../../constants/colors";
import { fontSize, spacing } from "../../../constants/layout";
import { REGIONS } from "../../../constants/regions";
import { useThemeColors } from "../../../hooks/useThemeColors";
import { RegionList } from "../../user/components/RegionList";
import type { RegionFilter } from "../hooks";

interface GymRegionFilterPickerProps {
  onSelect: (region: RegionFilter) => void;
  /** "필터" 모달의 첫 화면으로 돌아간다 (지역 선택을 취소) */
  onBack: () => void;
}

/**
 * 리스트 필터 모달의 지역 선택 단계 — 시/도 → 시/군/구 2단계 (UI 전담)
 * - 관심 지역 설정(interest-region.tsx)과 같은 2단계 선택 패턴을 쓰지만, 여기는
 *   "추가"가 아니라 "이 지역으로 필터링"이라 하나만 고르면 바로 확정된다.
 * - 시/군/구 단계에서 "전체"를 고르면 그 시/도 전체를 대상으로 한다(sigungu: null).
 */
export function GymRegionFilterPicker({ onSelect, onBack }: GymRegionFilterPickerProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [pendingSido, setPendingSido] = useState<string | null>(null);

  const currentGroup = pendingSido
    ? REGIONS.find((group) => group.sido === pendingSido)
    : null;

  if (pendingSido && currentGroup) {
    return (
      <View style={styles.wrap}>
        <Pressable onPress={() => setPendingSido(null)} hitSlop={8} style={styles.backRow}>
          <Text style={styles.backText}>‹ 시/도 다시 선택</Text>
        </Pressable>
        <Pressable
          style={styles.allRow}
          onPress={() => onSelect({ sido: pendingSido, sigungu: null })}
        >
          <Text style={styles.allRowText}>{pendingSido} 전체</Text>
        </Pressable>
        <RegionList
          items={currentGroup.sigungu}
          selected={null}
          onSelect={(sigungu) => onSelect({ sido: pendingSido, sigungu })}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Pressable onPress={onBack} hitSlop={8} style={styles.backRow}>
        <Text style={styles.backText}>‹ 필터로 돌아가기</Text>
      </Pressable>
      <RegionList
        items={REGIONS.map((group) => group.sido)}
        selected={null}
        onSelect={setPendingSido}
      />
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
    },
    backRow: {
      paddingBottom: spacing.md,
    },
    backText: {
      fontSize: fontSize.md,
      color: colors.primary,
      fontWeight: "600",
    },
    allRow: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    allRowText: {
      fontSize: fontSize.md,
      color: colors.primary,
      fontWeight: "600",
    },
  });
}
