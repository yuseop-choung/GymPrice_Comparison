import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button } from "../../components/ui/Button";
import type { ColorTheme } from "../../constants/colors";
import { fontSize, spacing } from "../../constants/layout";
import { useNotifications } from "../../features/notifications/hooks";
import { useMyPrices } from "../../features/price/hooks";
import { MyPriceCard } from "../../features/user/components/MyPriceCard";
import { ProfileHeader } from "../../features/user/components/ProfileHeader";
import { useInterestRegions } from "../../features/user/hooks";
import { useThemeColors } from "../../hooks/useThemeColors";
import { useAuthStore } from "../../store/authStore";
import { useThemeStore } from "../../store/themeStore";

/**
 * 내 정보 탭 — 유저 정보 + 내가 등록한 가격 목록(수정/삭제) + 로그아웃
 * - 비로그인 상태(둘러보기 중)면 보여줄 내 정보가 없으므로 로그인 버튼만 보여준다.
 * - 상단 영역(닉네임/관심지역/테마/버튼)은 ProfileHeader에 위임한다.
 */
export default function ProfileScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const { prices, isLoading, refetch } = useMyPrices(user?.uid);
  const { regions } = useInterestRegions();
  const themeMode = useThemeStore((state) => state.mode);
  const setThemeMode = useThemeStore((state) => state.setMode);
  const { sendTest } = useNotifications();

  // 화면에 돌아올 때마다 최신화 (등록/수정/삭제 반영)
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // 비로그인 상태(둘러보기 중)면 내 정보를 보여줄 게 없으므로 로그인 버튼만 보여준다.
  if (!user) {
    return (
      <View style={[styles.container, styles.guest]}>
        <Button title="로그인하기" onPress={() => router.push("/login")} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={prices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MyPriceCard
            item={item}
            onPress={() =>
              router.push({
                pathname: "/gym/[id]/price-edit",
                params: { id: item.gym_id, priceId: item.id },
              })
            }
          />
        )}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <ProfileHeader
            user={user}
            regions={regions}
            themeMode={themeMode}
            onThemeChange={setThemeMode}
            onInterestRegionPress={() => router.push("/interest-region")}
            onSendTest={sendTest}
            onSignOut={signOut}
            priceCount={prices.length}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.message}>아직 등록한 가격이 없어요.</Text>
          )
        }
      />
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.lg,
    },
    guest: {
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.xl,
    },
    message: {
      fontSize: fontSize.md,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.lg,
    },
  });
}
