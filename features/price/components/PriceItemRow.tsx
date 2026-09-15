import { Pressable, StyleSheet, Text, View } from "react-native";
import { Input } from "../../../components/ui/Input";
import { colors } from "../../../constants/colors";
import { fontSize, radius, spacing } from "../../../constants/layout";

/**
 * 가격 등록 폼의 한 행 (UI 전담)
 * - 기본 항목(1/3/6/12개월)은 라벨이 고정 텍스트로, 커스텀 항목은 라벨을
 *   입력/삭제할 수 있는 형태로 표시된다.
 */
interface PriceItemRowProps {
  label: string;
  price: string;
  removable: boolean;
  onLabelChange: (text: string) => void;
  onPriceChange: (text: string) => void;
  onRemove: () => void;
}

export function PriceItemRow({
  label,
  price,
  removable,
  onLabelChange,
  onPriceChange,
  onRemove,
}: PriceItemRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.labelCell}>
        {removable ? (
          <Input value={label} onChangeText={onLabelChange} placeholder="예: PT 10회" />
        ) : (
          <Text style={styles.fixedLabel}>{label}</Text>
        )}
      </View>
      <View style={styles.priceCell}>
        <Input
          value={price}
          onChangeText={onPriceChange}
          keyboardType="number-pad"
          placeholder="가격(원)"
        />
      </View>
      {removable ? (
        <Pressable onPress={onRemove} style={styles.removeButton}>
          <Text style={styles.removeText}>삭제</Text>
        </Pressable>
      ) : (
        <View style={styles.removeButton} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  labelCell: {
    flex: 1.1,
  },
  priceCell: {
    flex: 1,
  },
  fixedLabel: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  removeButton: {
    width: 40,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  removeText: {
    fontSize: fontSize.sm,
    color: colors.error,
  },
});
