import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../../constants/colors";
import { fontSize, radius, spacing } from "../../../constants/layout";
import type { GymDetail } from "../../../types";

/**
 * 헬스장 부가정보 표시 카드 (UI 전담)
 * - 정보가 없으면 추가 유도, 있으면 항목 표시 + 수정 진입.
 */
interface GymDetailInfoProps {
  detail: GymDetail | null;
  onEdit: () => void;
}

export function GymDetailInfo({ detail, onEdit }: GymDetailInfoProps) {
  const rows = [
    { label: "장비 브랜드", value: detail?.equipment_brand ?? "-" },
    {
      label: "청결도",
      value: detail?.cleanliness != null ? `${detail.cleanliness}/5` : "-",
    },
    {
      label: "트레이너 수",
      value: detail?.trainer_count != null ? `${detail.trainer_count}명` : "-",
    },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>부가정보</Text>
        <Pressable onPress={onEdit}>
          <Text style={styles.edit}>{detail ? "수정" : "추가"}</Text>
        </Pressable>
      </View>

      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.value}>{row.value}</Text>
        </View>
      ))}

      {detail?.memo ? <Text style={styles.memo}>{detail.memo}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text,
  },
  edit: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.primary,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  label: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  value: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  memo: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
