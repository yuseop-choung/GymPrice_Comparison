import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { colors } from "../../constants/colors";
import { fontSize, spacing } from "../../constants/layout";
import { SnsLoginButtons } from "../../features/user/components/SnsLoginButtons";
import { useAuth } from "../../features/user/hooks";

/** 로그인/회원가입 화면 — UI 전담, 인증 로직은 useAuth 훅에 위임 */
export default function LoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");

  const {
    isLoading,
    error,
    loginWithEmail,
    signUp,
    loginWithGoogle,
    loginWithNaver,
  } = useAuth();

  function handleSubmit() {
    if (isSignUp) signUp(email, password, nickname);
    else loginWithEmail(email, password);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>GymPrice</Text>
      <Text style={styles.subtitle}>{isSignUp ? "회원가입" : "로그인"}</Text>

      <Input
        label="이메일"
        value={email}
        onChangeText={setEmail}
        placeholder="email@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Input
        label="비밀번호"
        value={password}
        onChangeText={setPassword}
        placeholder="비밀번호"
        secureTextEntry
      />
      {isSignUp ? (
        <Input
          label="닉네임"
          value={nickname}
          onChangeText={setNickname}
          placeholder="닉네임"
        />
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title={isSignUp ? "회원가입" : "로그인"}
        onPress={handleSubmit}
        loading={isLoading}
      />

      <Text style={styles.toggle} onPress={() => setIsSignUp((v) => !v)}>
        {isSignUp ? "이미 계정이 있나요? 로그인" : "계정이 없나요? 회원가입"}
      </Text>

      <Text style={styles.divider}>또는 SNS로 계속하기</Text>

      <SnsLoginButtons
        onGoogle={loginWithGoogle}
        onNaver={loginWithNaver}
        disabled={isLoading}
      />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    justifyContent: "center",
    flexGrow: 1,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.primary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  error: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing.md,
  },
  toggle: {
    fontSize: fontSize.sm,
    color: colors.primary,
    textAlign: "center",
    marginVertical: spacing.lg,
  },
  divider: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
});
