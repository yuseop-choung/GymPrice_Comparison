import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors } from "../../../constants/colors";
import { fontSize, spacing } from "../../../constants/layout";
import { PriceForm } from "../../../features/price/components/PriceForm";
import { useEditPrice } from "../../../features/price/hooks";

/** 가격 수정/삭제 화면 — UI 전담, 로드/저장/삭제는 useEditPrice 훅에 위임 */
export default function PriceEditScreen() {
  const { priceId } = useLocalSearchParams<{ id: string; priceId: string }>();
  const router = useRouter();

  const { initial, loadError, error, isBusy, save, remove } = useEditPrice(
    priceId,
    () => router.back()
  );

  function handleDelete() {
    Alert.alert("삭제", "이 가격 제보를 삭제할까요?", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: () => remove() },
    ]);
  }

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{loadError}</Text>
      </View>
    );
  }

  if (!initial) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>가격 수정</Text>
      <PriceForm
        initial={initial}
        submitLabel="수정하기"
        isLoading={isBusy}
        error={error}
        onSubmit={save}
        onDelete={handleDelete}
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.lg,
  },
  error: {
    fontSize: fontSize.md,
    color: colors.error,
  },
});
