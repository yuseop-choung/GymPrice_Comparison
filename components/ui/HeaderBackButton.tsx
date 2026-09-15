import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { spacing } from "../../constants/layout";
import { useThemeColors } from "../../hooks/useThemeColors";

/**
 * 헤더 좌측 뒤로가기 버튼 (UI 전담)
 * - router.replace로 진입해 스택 히스토리가 없는 화면(예: 헬스장 등록 직후
 *   바로 이동하는 가격 등록 화면)에서도 항상 뒤로 나갈 수 있게 한다:
 *   갈 곳이 있으면 이전 화면으로, 없으면 홈으로 이동한다.
 */
export function HeaderBackButton() {
  const router = useRouter();
  const colors = useThemeColors();

  function handlePress() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }

  return (
    <Pressable onPress={handlePress} hitSlop={12} style={styles.button}>
      <Ionicons name="chevron-back" size={26} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
});
