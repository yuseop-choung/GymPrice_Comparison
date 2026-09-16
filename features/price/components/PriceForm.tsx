import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import type { ColorTheme } from "../../../constants/colors";
import { fontSize, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";
import type { PriceValues } from "../../../types";

/** 문자열을 숫자로 변환 (빈 값/숫자 아님 → 0. 범위 검증에서 걸러진다) */
function parsePrice(value: string): number {
  const num = Number(value.trim());
  return Number.isNaN(num) ? 0 : num;
}

/**
 * 가격 항목 수정 폼 (UI 전담)
 * - 이미 등록된 항목 1건(라벨+가격+메모)을 수정한다. 입력 상태와 문자열↔숫자
 *   변환만 담당하고, 검증/전송은 onSubmit 콜백에 위임한다.
 */
interface PriceFormProps {
  initial: PriceValues;
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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [label, setLabel] = useState(initial.label);
  const [price, setPrice] = useState(String(initial.price));
  const [memo, setMemo] = useState(initial.memo ?? "");

  function handleSubmit() {
    onSubmit({
      label: label.trim(),
      price: parsePrice(price),
      memo: memo.trim() === "" ? null : memo.trim(),
    });
  }

  return (
    <>
      <Input
        label="항목 이름"
        value={label}
        onChangeText={setLabel}
        placeholder="예: 1개월, PT 10회"
      />
      <Input
        label="가격 (원)"
        value={price}
        onChangeText={setPrice}
        keyboardType="number-pad"
        placeholder="예: 50000"
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
        <Pressable onPress={onDelete} hitSlop={8}>
          {({ pressed }) => (
            <Text style={[styles.delete, pressed ? styles.deletePressed : null]}>
              삭제하기
            </Text>
          )}
        </Pressable>
      ) : null}
    </>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
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
    deletePressed: {
      opacity: 0.6,
    },
  });
}
