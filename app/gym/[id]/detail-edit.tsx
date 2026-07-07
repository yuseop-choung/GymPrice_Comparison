import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { colors } from "../../../constants/colors";
import { fontSize, spacing } from "../../../constants/layout";
import { useEditGymDetail } from "../../../features/gym/hooks";
import type { GymDetailValues } from "../../../types";

/** 문자열을 정수 | null 로 변환 (빈 값/숫자 아님 → null) */
function parseInt2(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const num = Number(trimmed);
  return Number.isInteger(num) ? num : null;
}

/** 헬스장 부가정보 수정 화면 — UI 전담, 로드/저장은 훅에 위임 */
export default function GymDetailEditScreen() {
  const { id: gymId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { initial, error, isBusy, save } = useEditGymDetail(gymId, () =>
    router.back()
  );

  if (!initial) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <DetailForm initial={initial} error={error} isBusy={isBusy} onSave={save} />;
}

/** 폼 (초기값 확정 후 마운트) */
function DetailForm({
  initial,
  error,
  isBusy,
  onSave,
}: {
  initial: GymDetailValues;
  error: string | null;
  isBusy: boolean;
  onSave: (values: GymDetailValues) => void;
}) {
  const [brand, setBrand] = useState(initial.equipment_brand ?? "");
  const [cleanliness, setCleanliness] = useState(
    initial.cleanliness != null ? String(initial.cleanliness) : ""
  );
  const [trainers, setTrainers] = useState(
    initial.trainer_count != null ? String(initial.trainer_count) : ""
  );
  const [memo, setMemo] = useState(initial.memo ?? "");

  function handleSave() {
    onSave({
      equipment_brand: brand.trim() === "" ? null : brand.trim(),
      cleanliness: parseInt2(cleanliness),
      trainer_count: parseInt2(trainers),
      memo: memo.trim() === "" ? null : memo.trim(),
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>부가정보 수정</Text>
      <Input
        label="장비 브랜드"
        value={brand}
        onChangeText={setBrand}
        placeholder="예: 테크노짐"
      />
      <Input
        label="청결도 (1~5)"
        value={cleanliness}
        onChangeText={setCleanliness}
        keyboardType="number-pad"
        placeholder="1~5"
      />
      <Input
        label="트레이너 수"
        value={trainers}
        onChangeText={setTrainers}
        keyboardType="number-pad"
        placeholder="예: 5"
      />
      <Input
        label="메모"
        value={memo}
        onChangeText={setMemo}
        placeholder="추가 정보 (선택)"
        multiline
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="저장하기" onPress={handleSave} loading={isBusy} />
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
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing.md,
  },
});
