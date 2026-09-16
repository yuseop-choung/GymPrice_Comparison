import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import type { ColorTheme } from "../../constants/colors";
import { fontSize, spacing } from "../../constants/layout";
import { useResetPassword } from "../../features/user/hooks";
import { useThemeColors } from "../../hooks/useThemeColors";

/**
 * 비밀번호 재설정 링크로 진입하는 화면 (딥링크: reset-password#access_token=...)
 * - UI 전담, 세션 복원/비밀번호 변경은 useResetPassword 훅에 위임.
 * - 검증 중 → 새 비밀번호 입력 → (성공 시) authStore 반영으로 루트가 홈으로 전환.
 * - 앱을 연 딥링크의 전체 URL(쿼리+해시)을 훅에 넘긴다. Linking.useURL()은 첫
 *   렌더에 항상 null을 줘서 "아직 확인 전"과 "확인했는데 없음"을 구분할 수 없으므로
 *   (정상 링크로 들어와도 잠깐 에러가 잘못 뜨는 원인이 됨) 직접 undefined로 시작해
 *   getInitialURL이 끝난 뒤에야 null/문자열로 확정한다.
 */
export default function ResetPasswordScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [url, setUrl] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    Linking.getInitialURL().then(setUrl);
    const subscription = Linking.addEventListener("url", (event) => setUrl(event.url));
    return () => subscription.remove();
  }, []);

  const { stage, isSaving, error, submit } = useResetPassword(url);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  if (stage === "verifying") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (stage === "invalid") {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Pressable onPress={() => router.replace("/forgot-password")} hitSlop={8}>
          {({ pressed }) => (
            <Text style={[styles.link, pressed ? styles.linkPressed : null]}>
              재설정 다시 요청하기
            </Text>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>새 비밀번호 설정</Text>
      <Text style={styles.desc}>새로 사용할 비밀번호를 입력해주세요.</Text>

      <Input
        label="새 비밀번호"
        value={password}
        onChangeText={setPassword}
        placeholder="6자 이상"
        secureTextEntry
      />
      <Input
        label="새 비밀번호 확인"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="한 번 더 입력해주세요"
        secureTextEntry
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title="비밀번호 변경하기"
        onPress={() => submit(password, confirm)}
        loading={isSaving}
      />
    </ScrollView>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    content: {
      padding: spacing.xl,
      justifyContent: "center",
      flexGrow: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.lg,
      padding: spacing.xl,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: fontSize.xxl,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
    },
    desc: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.sm,
      marginBottom: spacing.xl,
    },
    error: {
      fontSize: fontSize.sm,
      color: colors.error,
      textAlign: "center",
      marginBottom: spacing.md,
    },
    link: {
      fontSize: fontSize.sm,
      color: colors.primary,
      fontWeight: "600",
    },
    linkPressed: {
      opacity: 0.6,
    },
  });
}
