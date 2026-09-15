import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import type { ColorTheme } from "../../../constants/colors";
import { fontSize, spacing } from "../../../constants/layout";
import type { PriceItemDraft } from "../../../features/price/components/PriceItemsForm";
import { PriceItemsForm } from "../../../features/price/components/PriceItemsForm";
import { useSubmitPrice } from "../../../features/price/hooks";
import { useThemeColors } from "../../../hooks/useThemeColors";
import { useAuthStore } from "../../../store/authStore";

/** 가격 등록 화면 — UI 전담, 검증/전송은 훅에 위임 */
export default function PriceSubmitScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id: gymId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const { submit, isLoading, error } = useSubmitPrice({
    onSuccess: () => {
      Alert.alert("등록 완료", "가격이 등록되었습니다. 관리자 검수 후 공개됩니다.");
      // router.back() 대신 상세 화면으로 명시적으로 이동한다 — 헬스장 등록 직후
      // 곧바로 이 화면으로 온 경우(뒤로 갈 화면이 없음)에도 항상 안전하게 동작한다.
      router.replace(`/gym/${gymId}`);
    },
  });

  function handleSubmit(items: PriceItemDraft[]) {
    // 로그인 유저만 등록 가능 (RLS: auth.uid() = user_id)
    if (!user) {
      Alert.alert("로그인 필요", "가격을 등록하려면 로그인이 필요합니다.");
      return;
    }
    submit(
      items.map((item) => ({
        gym_id: gymId,
        user_id: user.uid,
        ...item,
      }))
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>가격 등록</Text>
      <Text style={styles.hint}>
        가격을 입력한 항목만 등록됩니다. "+ 가격 항목 추가"로 PT 횟수권 등도 함께
        등록할 수 있어요.
      </Text>
      <PriceItemsForm
        submitLabel="등록하기"
        isLoading={isLoading}
        error={error}
        onSubmit={handleSubmit}
      />
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
