import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ColorTheme } from "../../../constants/colors";
import { elevation, fontSize, radius, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";
import type { GymDetail } from "../../../types";

/**
 * 헬스장 부가정보 표시 카드 (UI 전담)
 * - 정보가 하나도 없으면(detail === null) 참여를 유도하는 안내 문구 + 버튼을 보여준다
 *   (가격 섹션의 빈 상태와 같은 톤). 정보가 있으면 항목 표시 + 수정 진입.
 */
interface GymDetailInfoProps {
  detail: GymDetail | null;
  onEdit: () => void;
}

export function GymDetailInfo({ detail, onEdit }: GymDetailInfoProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!detail) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>부가정보</Text>
        <Text style={styles.emptyText}>
          아직 등록된 부가정보가 없어요. 장비 브랜드, 청결도, 트레이너 수 등을
          처음으로 등록해보세요!
        </Text>
        <Pressable onPress={onEdit} style={styles.addButton} hitSlop={8}>
          <Text style={styles.addButtonText}>부가정보 등록하기</Text>
        </Pressable>
      </View>
    );
  }

  const rows = [
    { label: "장비 브랜드", value: detail.equipment_brand ?? "-" },
    {
      label: "청결도",
      value: detail.cleanliness != null ? `${detail.cleanliness}/5` : "-",
    },
    {
      label: "트레이너 수",
      value: detail.trainer_count != null ? `${detail.trainer_count}명` : "-",
    },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>부가정보</Text>
        <Pressable onPress={onEdit} hitSlop={8}>
          {({ pressed }) => (
            <Text style={[styles.edit, pressed ? styles.editPressed : null]}>
              수정
            </Text>
          )}
        </Pressable>
      </View>

      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.value}>{row.value}</Text>
        </View>
      ))}

      {detail.memo ? <Text style={styles.memo}>{detail.memo}</Text> : null}
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginTop: spacing.lg,
      ...elevation(colors.shadow),
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
    editPressed: {
      opacity: 0.6,
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
    emptyText: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginTop: spacing.xs,
      marginBottom: spacing.md,
    },
    addButton: {
      alignSelf: "flex-start",
      backgroundColor: colors.primaryMuted,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    addButtonText: {
      fontSize: fontSize.sm,
      fontWeight: "600",
      color: colors.primary,
    },
  });
}
