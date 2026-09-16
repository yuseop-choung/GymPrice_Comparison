import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import type { ColorTheme } from "../../constants/colors";
import { fontSize, spacing } from "../../constants/layout";
import { useForgotPassword } from "../../features/user/hooks";
import { useThemeColors } from "../../hooks/useThemeColors";

/** 비밀번호 재설정 이메일 요청 화면 — UI 전담, 로직은 useForgotPassword 훅에 위임 */
export default function ForgotPasswordScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const { isLoading, error, success, submit } = useForgotPassword();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>비밀번호 재설정</Text>
        <Text style={styles.desc}>
          가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드려요.
        </Text>

        {success ? (
          <Text style={styles.success}>
            입력하신 이메일이 가입되어 있다면 재설정 링크를 보내드렸어요. 메일함
            (스팸함 포함)을 확인해주세요.
          </Text>
        ) : (
          <>
            <Input
              label="이메일"
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              title="재설정 링크 보내기"
              onPress={() => submit(email)}
              loading={isLoading}
            />
          </>
        )}

        <Pressable onPress={() => router.back()} hitSlop={8}>
          {({ pressed }) => (
            <Text style={[styles.back, pressed ? styles.backPressed : null]}>
              로그인으로 돌아가기
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.xl,
      justifyContent: "center",
      flexGrow: 1,
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
    success: {
      fontSize: fontSize.md,
      color: colors.success,
      textAlign: "center",
      marginBottom: spacing.xl,
      lineHeight: 20,
    },
    error: {
      fontSize: fontSize.sm,
      color: colors.error,
      marginBottom: spacing.md,
    },
    back: {
      fontSize: fontSize.sm,
      color: colors.primary,
      textAlign: "center",
      marginTop: spacing.xl,
    },
    backPressed: {
      opacity: 0.6,
    },
  });
}
