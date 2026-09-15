import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../constants/colors";
import { fontSize, spacing } from "../constants/layout";
import { REGIONS } from "../constants/regions";
import { RegionList } from "../features/user/components/RegionList";
import { useInterestRegion } from "../features/user/hooks";

/**
 * 관심 지역 설정 화면 — 시/도 선택 → 시/군/구 선택 2단계.
 * - 실제 저장/해제 로직은 useInterestRegion 훅에 위임한다.
 */
export default function InterestRegionScreen() {
  const router = useRouter();
  const { sido, sigungu, isSaving, error, save, clear } = useInterestRegion();
  const [pendingSido, setPendingSido] = useState<string | null>(null);

  const currentGroup = pendingSido
    ? REGIONS.find((group) => group.sido === pendingSido)
    : null;

  async function handleSelectSigungu(value: string) {
    if (!pendingSido) return;
    await save(pendingSido, value);
    router.back();
  }

  async function handleClear() {
    await clear();
    router.back();
  }

  return (
    <View style={styles.container}>
      {currentGroup ? (
        <>
          <Pressable onPress={() => setPendingSido(null)} style={styles.backRow}>
            <Text style={styles.backText}>‹ {currentGroup.sido} 다시 선택</Text>
          </Pressable>
          <RegionList
            items={currentGroup.sigungu}
            selected={pendingSido === sido ? sigungu : null}
            onSelect={handleSelectSigungu}
          />
        </>
      ) : (
        <>
          <Text style={styles.guide}>
            관심 지역을 설정하면 해당 지역 위주로 정보를 보여드려요.
          </Text>
          {sido ? (
            <Pressable onPress={handleClear} style={styles.clearRow}>
              <Text style={styles.clearText}>관심 지역 해제 (전체 보기)</Text>
            </Pressable>
          ) : null}
          <RegionList
            items={REGIONS.map((group) => group.sido)}
            selected={sido}
            onSelect={setPendingSido}
          />
        </>
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
  guide: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    padding: spacing.lg,
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
  clearRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  clearText: {
    fontSize: fontSize.sm,
    color: colors.error,
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
