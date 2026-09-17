import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import type { ColorTheme } from "../../../constants/colors";
import { fontSize, radius, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";

/**
 * 내 정보 탭의 비로그인(둘러보기 중) 화면 (UI 전담)
 * - 내가 등록한 가격/관심 지역 등 로그인 전용 기능임을 안내하고 로그인을 유도한다.
 */
interface ProfileGuestViewProps {
  onLoginPress: () => void;
}

export function ProfileGuestView({ onLoginPress }: ProfileGuestViewProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.iconBadge}>
        <Ionicons name="person-circle-outline" size={40} color={colors.primary} />
      </View>
      <Text style={styles.title}>서비스를 이용하려면 로그인해주세요</Text>
      <Text style={styles.desc}>
        내가 등록한 가격 확인, 관심 지역 알림, 헬스장 상세 정보는{"\n"}로그인 후
        이용할 수 있어요.
      </Text>
      <View style={styles.buttonRow}>
        <Button title="로그인하기" onPress={onLoginPress} />
      </View>
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.xl,
      backgroundColor: colors.background,
    },
    iconBadge: {
      width: 80,
      height: 80,
      borderRadius: radius.lg * 2,
      backgroundColor: colors.primaryMuted,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.lg,
    },
    title: {
      fontSize: fontSize.lg,
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
      lineHeight: 20,
    },
    buttonRow: {
      width: "100%",
      maxWidth: 320,
    },
  });
}
