import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import { colors } from "../../../constants/colors";
import { fontSize, spacing } from "../../../constants/layout";
import { PriceForm } from "../../../features/price/components/PriceForm";
import { useSubmitPrice } from "../../../features/price/hooks";
import { useAuthStore } from "../../../store/authStore";
import type { PriceValues } from "../../../types";

/** 가격 등록 화면 — UI 전담, 검증/전송은 훅에 위임 */
export default function PriceSubmitScreen() {
  const { id: gymId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const { submit, isLoading, error } = useSubmitPrice({
    onSuccess: () => {
      Alert.alert("등록 완료", "가격이 등록되었습니다.");
      router.back();
    },
  });

  function handleSubmit(values: PriceValues) {
    // 로그인 유저만 등록 가능 (RLS: auth.uid() = user_id)
    if (!user) {
      Alert.alert("로그인 필요", "가격을 등록하려면 로그인이 필요합니다.");
      return;
    }
    submit({ gym_id: gymId, user_id: user.uid, ...values });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>가격 등록</Text>
      <PriceForm
        submitLabel="등록하기"
        isLoading={isLoading}
        error={error}
        onSubmit={handleSubmit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: spacing.lg,
  },
});
