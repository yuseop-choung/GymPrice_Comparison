import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { colors } from "../../../constants/colors";
import { fontSize, spacing } from "../../../constants/layout";
import type { PriceValues } from "../../../types";

/** 문자열 입력값을 number | null 로 변환 (빈 값/숫자 아님 → null) */
function parsePrice(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const num = Number(trimmed);
  return Number.isNaN(num) ? null : num;
}

/** 숫자/null 을 입력 표시용 문자열로 변환 */
function toText(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

/**
 * 가격 입력 폼 (등록/수정 공용, UI 전담)
 * - 입력 상태와 문자열↔숫자 변환만 담당. 검증/전송은 onSubmit 콜백에 위임.
 */
interface PriceFormProps {
  initial?: PriceValues;
  submitLabel: string;
  isLoading: boolean;
  error: string | null;
  onSubmit: (values: PriceValues) => void;
  onDelete?: () => void;
}

export function PriceForm({
  initial,
  submitLabel,
  isLoading,
  error,
  onSubmit,
  onDelete,
}: PriceFormProps) {
  const [price1m, setPrice1m] = useState(toText(initial?.price_1m));
  const [price3m, setPrice3m] = useState(toText(initial?.price_3m));
  const [price6m, setPrice6m] = useState(toText(initial?.price_6m));
  const [price12m, setPrice12m] = useState(toText(initial?.price_12m));
  const [memo, setMemo] = useState(initial?.memo ?? "");

  function handleSubmit() {
    onSubmit({
      price_1m: parsePrice(price1m),
      price_3m: parsePrice(price3m),
      price_6m: parsePrice(price6m),
      price_12m: parsePrice(price12m),
      memo: memo.trim() === "" ? null : memo.trim(),
    });
  }

  return (
    <>
      <Input
        label="1개월권 (원)"
        value={price1m}
        onChangeText={setPrice1m}
        keyboardType="number-pad"
        placeholder="예: 50000"
      />
      <Input
        label="3개월권 (원)"
        value={price3m}
        onChangeText={setPrice3m}
        keyboardType="number-pad"
        placeholder="예: 135000"
      />
      <Input
        label="6개월권 (원)"
        value={price6m}
        onChangeText={setPrice6m}
        keyboardType="number-pad"
        placeholder="예: 240000"
      />
      <Input
        label="12개월권 (원)"
        value={price12m}
        onChangeText={setPrice12m}
        keyboardType="number-pad"
        placeholder="예: 420000"
      />
      <Input
        label="메모"
        value={memo}
        onChangeText={setMemo}
        placeholder="추가 정보 (선택)"
        multiline
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title={submitLabel} onPress={handleSubmit} loading={isLoading} />

      {onDelete ? (
        <Text style={styles.delete} onPress={onDelete}>
          삭제하기
        </Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  error: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing.md,
  },
  delete: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});
