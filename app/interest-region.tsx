import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../constants/colors";
import { fontSize, spacing } from "../constants/layout";
import { REGIONS } from "../constants/regions";
import { InterestRegionListView } from "../features/user/components/InterestRegionListView";
import { RegionList } from "../features/user/components/RegionList";
import { MAX_INTEREST_REGIONS, useInterestRegions } from "../features/user/hooks";

type Step = "list" | "sido" | "sigungu";

/**
 * 관심 지역 설정 화면 (최대 5개)
 * - list: 이미 추가한 지역 목록 + 추가/삭제
 * - sido → sigungu: 새 지역 추가를 위한 2단계 선택
 * - 실제 조회/추가/삭제 로직은 useInterestRegions 훅에 위임한다.
 */
export default function InterestRegionScreen() {
  const { regions, isLoading, isSaving, error, add, remove } = useInterestRegions();
  const [step, setStep] = useState<Step>("list");
  const [pendingSido, setPendingSido] = useState<string | null>(null);

  const currentGroup = pendingSido
    ? REGIONS.find((group) => group.sido === pendingSido)
    : null;

  async function handleSelectSigungu(value: string) {
    if (!pendingSido) return;
    await add(pendingSido, value);
    setStep("list");
    setPendingSido(null);
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {step === "sigungu" && currentGroup ? (
        <>
          <Pressable onPress={() => setStep("sido")} style={styles.backRow}>
            <Text style={styles.backText}>‹ 시/도 다시 선택</Text>
          </Pressable>
          <RegionList
            items={currentGroup.sigungu}
            selected={null}
            onSelect={handleSelectSigungu}
          />
        </>
      ) : step === "sido" ? (
        <>
          <Pressable onPress={() => setStep("list")} style={styles.backRow}>
            <Text style={styles.backText}>‹ 목록으로</Text>
          </Pressable>
          <RegionList
            items={REGIONS.map((group) => group.sido)}
            selected={pendingSido}
            onSelect={(sido) => {
              setPendingSido(sido);
              setStep("sigungu");
            }}
          />
        </>
      ) : (
        <InterestRegionListView
          regions={regions}
          maxCount={MAX_INTEREST_REGIONS}
          onAdd={() => setStep("sido")}
          onRemove={remove}
        />
      )}

      {isSaving ? (
        <View style={styles.overlay}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  backRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  backText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: "600",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: "center",
    padding: spacing.md,
  },
});
