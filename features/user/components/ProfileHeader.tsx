import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import type { ColorTheme } from "../../../constants/colors";
import { fontSize, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";
import type { ThemeMode } from "../../../store/themeStore";
import type { InterestRegion, User } from "../../../types";
import { MAX_INTEREST_REGIONS } from "../hooks";
import { InterestRegionSummaryRow } from "./InterestRegionSummaryRow";
import { ThemeModeSwitch } from "./ThemeModeSwitch";

/**
 * 내 정보 탭 상단 영역 (UI 전담)
 * - 닉네임/이메일 + 관심 지역 요약 + 테마 전환 + 테스트 알림/로그아웃/회원탈퇴
 *   버튼 + 가격 목록 섹션 제목까지, profile.tsx의 FlatList ListHeaderComponent로 쓴다.
 */
interface ProfileHeaderProps {
  user: User;
  regions: InterestRegion[];
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  onInterestRegionPress: () => void;
  onSendTest: () => void;
  onSignOut: () => void;
  onDeleteAccountPress: () => void;
  priceCount: number;
}

export function ProfileHeader({
  user,
  regions,
  themeMode,
  onThemeChange,
  onInterestRegionPress,
  onSendTest,
  onSignOut,
  onDeleteAccountPress,
  priceCount,
}: ProfileHeaderProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.header}>
      <Text style={styles.nickname}>{user.nickname}</Text>
      <Text style={styles.email}>{user.email}</Text>
      <InterestRegionSummaryRow
        regions={regions}
        maxCount={MAX_INTEREST_REGIONS}
        onPress={onInterestRegionPress}
      />
      <ThemeModeSwitch mode={themeMode} onChange={onThemeChange} />
      <View style={styles.action}>
        <Button title="테스트 알림 보내기" onPress={onSendTest} />
      </View>
      <View style={styles.action}>
        <Button title="로그아웃" onPress={onSignOut} />
      </View>
      <Pressable onPress={onDeleteAccountPress} hitSlop={8} style={styles.deleteRow}>
        {({ pressed }) => (
          <Text style={[styles.deleteText, pressed ? styles.deleteTextPressed : null]}>
            회원 탈퇴
          </Text>
        )}
      </Pressable>
      <Text style={styles.sectionTitle}>내가 등록한 가격 ({priceCount})</Text>
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    header: {
      marginBottom: spacing.md,
    },
    nickname: {
      fontSize: fontSize.xl,
      fontWeight: "700",
      color: colors.text,
    },
    email: {
      fontSize: fontSize.md,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    action: {
      marginTop: spacing.md,
    },
    deleteRow: {
      alignItems: "center",
      marginTop: spacing.lg,
    },
    deleteText: {
      fontSize: fontSize.sm,
      color: colors.error,
    },
    deleteTextPressed: {
      opacity: 0.6,
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: "600",
      color: colors.text,
      marginTop: spacing.xl,
    },
  });
}
