import { useMemo } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import type { ColorTheme } from "../../../constants/colors";
import { fontSize, radius, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";

/**
 * 하루 무료 열람 한도(3곳)를 넘었을 때 띄우는 안내 모달 (UI 전담)
 * - 가격을 등록하면(승인 후 1년간) 한도 없이 열람할 수 있다는 걸 안내하고,
 *   바로 이 헬스장에 가격을 등록하러 이동할 수 있는 버튼을 제공한다.
 */
interface PriceViewLimitModalProps {
  visible: boolean;
  onClose: () => void;
  onRegisterPress: () => void;
}

export function PriceViewLimitModal({
  visible,
  onClose,
  onRegisterPress,
}: PriceViewLimitModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.centerWrap} pointerEvents="box-none">
        <View style={styles.card}>
          <Text style={styles.title}>오늘의 무료 열람을 모두 사용했어요</Text>
          <Text style={styles.body}>
            하루에 헬스장 3곳까지 상세 가격(3개월/6개월/12개월 등)을 무료로 볼 수
            있어요.{"\n\n"}
            가격을 1건 등록하면 승인 후 1년 동안 모든 헬스장의 상세 가격을
            무제한으로 볼 수 있어요!
          </Text>
          <Button title="이 헬스장 가격 등록하러 가기" onPress={onRegisterPress} />
          <Pressable onPress={onClose} hitSlop={8} style={styles.laterButton}>
            <Text style={styles.laterText}>다음에 할게요</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay,
    },
    centerWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.xl,
    },
    card: {
      width: "100%",
      backgroundColor: colors.surfaceElevated,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    title: {
      fontSize: fontSize.lg,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
      marginBottom: spacing.md,
    },
    body: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: spacing.lg,
      lineHeight: 20,
    },
    laterButton: {
      marginTop: spacing.md,
      alignItems: "center",
    },
    laterText: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
    },
  });
}
