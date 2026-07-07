import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "../../constants/colors";
import { fontSize, spacing } from "../../constants/layout";

/**
 * 로딩/빈/에러 상태 공용 표시 컴포넌트 (UI 전담)
 * - loading이면 스피너, 아니면 message 텍스트를 보여준다.
 */
interface StateViewProps {
  loading?: boolean;
  message?: string | null;
  /** 화면 전체 중앙 정렬 여부 (기본 false = 리스트 안 여백 표시) */
  fill?: boolean;
}

export function StateView({ loading, message, fill = false }: StateViewProps) {
  return (
    <View style={fill ? styles.fill : styles.inline}>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Text style={styles.message}>{message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  inline: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  message: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
