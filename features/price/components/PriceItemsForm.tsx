import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { colors } from "../../../constants/colors";
import { fontSize, radius, spacing } from "../../../constants/layout";
import { DEFAULT_PRICE_LABELS } from "../utils";
import { PriceItemRow } from "./PriceItemRow";

/** 폼에서 다루는 가격 항목 1행 (아직 등록 전 — 문자열 입력 상태) */
interface Row {
  id: string;
  label: string;
  price: string;
  /** 기본 4항목(1/3/6/12개월)은 라벨을 못 바꾸고 지울 수도 없다 */
  removable: boolean;
}

function makeDefaultRows(): Row[] {
  return DEFAULT_PRICE_LABELS.map((label) => ({
    id: label,
    label,
    price: "",
    removable: false,
  }));
}

let customRowSeq = 0;

/** 제출용 가격 항목 (검증/전송은 호출부에 위임) */
export interface PriceItemDraft {
  label: string;
  price: number;
  memo: string | null;
}

/**
 * 가격 등록 폼 (UI 전담)
 * - 기본 4항목(1/3/6/12개월) + "+" 버튼으로 추가하는 커스텀 항목(예: PT 10회)을
 *   한 번에 등록한다. 가격을 입력한 행만 제출 대상이 된다.
 * - 입력 상태 관리만 담당하고, 검증/전송은 onSubmit 콜백에 위임한다.
 * - 각 행의 렌더링은 PriceItemRow에 위임한다.
 */
interface PriceItemsFormProps {
  submitLabel: string;
  isLoading: boolean;
  error: string | null;
  onSubmit: (items: PriceItemDraft[]) => void;
}

export function PriceItemsForm({
  submitLabel,
  isLoading,
  error,
  onSubmit,
}: PriceItemsFormProps) {
  const [rows, setRows] = useState<Row[]>(makeDefaultRows);
  const [memo, setMemo] = useState("");

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addRow() {
    customRowSeq += 1;
    setRows((prev) => [
      ...prev,
      { id: `custom-${customRowSeq}`, label: "", price: "", removable: true },
    ]);
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((row) => row.id !== id));
  }

  function handleSubmit() {
    const memoValue = memo.trim() === "" ? null : memo.trim();
    // 가격을 입력한(빈 값이 아닌) 행만 제출한다. 라벨/가격 유효성 검증은 호출부에서 한다.
    const items = rows
      .filter((row) => row.price.trim() !== "")
      .map((row) => ({
        label: row.label.trim(),
        price: Number(row.price.trim()) || 0,
        memo: memoValue,
      }));
    onSubmit(items);
  }

  return (
    <>
      {rows.map((row) => (
        <PriceItemRow
          key={row.id}
          label={row.label}
          price={row.price}
          removable={row.removable}
          onLabelChange={(text) => updateRow(row.id, { label: text })}
          onPriceChange={(text) => updateRow(row.id, { price: text })}
          onRemove={() => removeRow(row.id)}
        />
      ))}

      <Pressable onPress={addRow} style={styles.addButton}>
        <Text style={styles.addText}>+ 가격 항목 추가</Text>
      </Pressable>

      <Input
        label="메모"
        value={memo}
        onChangeText={setMemo}
        placeholder="추가 정보 (선택)"
        multiline
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title={submitLabel} onPress={handleSubmit} loading={isLoading} />
    </>
  );
}

const styles = StyleSheet.create({
  addButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  addText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.primary,
  },
  error: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing.md,
  },
});
