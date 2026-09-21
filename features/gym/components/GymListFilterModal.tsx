import { useMemo, useState } from "react";
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { ColorTheme } from "../../../constants/colors";
import { fontSize, radius, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";
import type { RegionFilter } from "../hooks";
import { GymPriceBandChips } from "./GymPriceBandChips";
import { GymRegionFilterPicker } from "./GymRegionFilterPicker";

// 지역 선택 단계는 목록이 길어 스크롤 공간이 필요하므로 화면 높이의 70%로 고정한다
// ("70%" 같은 문자열 높이는 부모가 크기를 미리 정해두지 않으면 적용되지 않는다).
const REGION_STEP_HEIGHT = Dimensions.get("window").height * 0.7;

type Step = "filters" | "region";

interface GymListFilterModalProps {
  visible: boolean;
  onClose: () => void;
  maxPrice: number | null;
  onMaxPriceChange: (price: number | null) => void;
  region: RegionFilter | null;
  onRegionChange: (region: RegionFilter | null) => void;
}

/**
 * 리스트 화면의 가격대/지역 필터 모달 (UI 전담)
 * - 선택은 즉시 반영된다(별도 "적용" 버튼 없음) — 닫으면 그 상태로 목록에 반영돼 있다.
 * - 가격대 칩은 GymPriceBandChips, 지역 선택(시/도 → 시/군/구)은
 *   GymRegionFilterPicker에 위임한다.
 */
export function GymListFilterModal({
  visible,
  onClose,
  maxPrice,
  onMaxPriceChange,
  region,
  onRegionChange,
}: GymListFilterModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [step, setStep] = useState<Step>("filters");

  function handleClose(): void {
    setStep("filters");
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={[styles.sheet, step === "region" ? styles.sheetTall : null]}>
        {step === "region" ? (
          <GymRegionFilterPicker
            onSelect={(next) => {
              onRegionChange(next);
              setStep("filters");
            }}
            onBack={() => setStep("filters")}
          />
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>필터</Text>
              <Pressable onPress={handleClose} hitSlop={8}>
                <Text style={styles.closeText}>닫기</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>가격대</Text>
            <GymPriceBandChips maxPrice={maxPrice} onChange={onMaxPriceChange} />

            <Text style={styles.sectionTitle}>지역</Text>
            <Pressable style={styles.regionRow} onPress={() => setStep("region")}>
              <Text style={styles.regionRowText}>
                {region ? `${region.sido} ${region.sigungu ?? "전체"}` : "전체"}
              </Text>
              <Text style={styles.regionRowArrow}>›</Text>
            </Pressable>
          </>
        )}
      </View>
    </Modal>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay,
    },
    sheet: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.surfaceElevated,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: spacing.lg,
    },
    sheetTall: {
      height: REGION_STEP_HEIGHT,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    title: {
      fontSize: fontSize.lg,
      fontWeight: "700",
      color: colors.text,
    },
    closeText: {
      fontSize: fontSize.md,
      color: colors.primary,
      fontWeight: "600",
    },
    sectionTitle: {
      fontSize: fontSize.sm,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: spacing.sm,
      marginTop: spacing.md,
    },
    regionRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
    },
    regionRowText: {
      fontSize: fontSize.md,
      color: colors.text,
    },
    regionRowArrow: {
      fontSize: fontSize.lg,
      color: colors.textSecondary,
    },
  });
}
