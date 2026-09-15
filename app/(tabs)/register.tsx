import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ColorTheme } from "../../constants/colors";
import { fontSize, radius, spacing } from "../../constants/layout";
import { GymRegisterForm } from "../../features/gym/components/GymRegisterForm";
import { PriceOnlyGymPicker } from "../../features/gym/components/PriceOnlyGymPicker";
import { useSearchGyms } from "../../features/gym/hooks";
import { useThemeColors } from "../../hooks/useThemeColors";
import type { Gym } from "../../types";

type RegisterMode = "price" | "gym";

/**
 * 등록 화면 — "가격 등록"(이미 등록된 헬스장에 가격만 추가)과 "헬스장 등록"(신규
 * 헬스장 등록)을 상단 탭으로 전환한다. 가격 등록이 헬스장 등록에 종속되지 않도록
 * 둘 다 언제든 바로 접근할 수 있게 분리했다 — 실제 검색/폼 로직은 하위 컴포넌트/훅에 위임.
 */
export default function RegisterScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [mode, setMode] = useState<RegisterMode>("price");
  const [gymQuery, setGymQuery] = useState("");
  const { results, isSearching, hasSearched, error: searchError, search, reset } =
    useSearchGyms();

  function handleSelectGym(gym: Gym) {
    reset();
    setGymQuery("");
    router.push(`/gym/${gym.id}/price-submit`);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.tabRow}>
        {(["price", "gym"] as const).map((key) => (
          <Pressable
            key={key}
            onPress={() => setMode(key)}
            style={[styles.tab, mode === key ? styles.tabActive : null]}
          >
            <Text
              style={[styles.tabText, mode === key ? styles.tabTextActive : null]}
            >
              {key === "price" ? "가격 등록" : "헬스장 등록"}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === "price" ? (
        <>
          <Text style={styles.title}>가격 등록</Text>
          <Text style={styles.hint}>
            이미 등록된 헬스장을 검색해 가격을 등록하세요. 찾는 헬스장이 없으면
            &ldquo;헬스장 등록&rdquo; 탭에서 새로 등록할 수 있어요.
          </Text>
          <PriceOnlyGymPicker
            query={gymQuery}
            onQueryChange={setGymQuery}
            onSubmit={() => search(gymQuery)}
            isSearching={isSearching}
            hasSearched={hasSearched}
            error={searchError}
            results={results}
            onSelect={handleSelectGym}
          />
        </>
      ) : (
        <>
          <Text style={styles.title}>헬스장 등록</Text>
          <GymRegisterForm />
        </>
      )}
    </ScrollView>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.lg,
    },
    tabRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
    tab: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    tabActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    tabText: {
      fontSize: fontSize.md,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.white,
    },
    title: {
      fontSize: fontSize.xl,
      fontWeight: "700",
      color: colors.text,
      marginBottom: spacing.sm,
    },
    hint: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginBottom: spacing.lg,
    },
  });
}
