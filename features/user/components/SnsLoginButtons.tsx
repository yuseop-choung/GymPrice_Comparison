import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../../constants/colors";
import { fontSize, radius, spacing } from "../../../constants/layout";

/**
 * SNS 로그인 버튼 묶음 (UI 전담)
 * - Google / Naver 로그인 진입 버튼. 실제 동작은 onPress 콜백에 위임.
 */
interface SnsLoginButtonsProps {
  onGoogle: () => void;
  onNaver: () => void;
  disabled?: boolean;
}

export function SnsLoginButtons({
  onGoogle,
  onNaver,
  disabled = false,
}: SnsLoginButtonsProps) {
  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.button, styles.google]}
        onPress={onGoogle}
        disabled={disabled}
      >
        <Text style={styles.googleText}>Google로 계속하기</Text>
      </Pressable>

      <Pressable
        style={[styles.button, styles.naver]}
        onPress={onNaver}
        disabled={disabled}
      >
        <Text style={styles.naverText}>네이버로 계속하기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  button: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  google: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.googleBorder,
  },
  googleText: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.text,
  },
  naver: {
    backgroundColor: colors.naver,
  },
  naverText: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.white,
  },
});
