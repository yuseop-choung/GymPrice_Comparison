import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ColorTheme } from "../../constants/colors";
import { fontSize, spacing } from "../../constants/layout";
import { useNotifications } from "../../features/notifications/hooks";
import { useMyPrices } from "../../features/price/hooks";
import { MyPriceCard } from "../../features/user/components/MyPriceCard";
import { ProfileGuestView } from "../../features/user/components/ProfileGuestView";
import { ProfileHeader } from "../../features/user/components/ProfileHeader";
import { useAccountDeletion, useInterestRegions } from "../../features/user/hooks";
import { useThemeColors } from "../../hooks/useThemeColors";
import { useAuthStore } from "../../store/authStore";
import { useThemeStore } from "../../store/themeStore";

/**
 * 내 정보 탭 — 유저 정보 + 내가 등록한 가격 목록(수정/삭제) + 로그아웃
 * - 비로그인 상태(둘러보기 중)면 보여줄 내 정보가 없으므로 ProfileGuestView로
 *   로그인을 유도한다.
 * - 로그인 상태의 상단 영역(닉네임/관심지역/테마/버튼)은 ProfileHeader에 위임한다.
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
  const { deleteAccount } = useAccountDeletion();

  // 화면에 돌아올 때마다 최신화 (등록/수정/삭제 반영)
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  function handleDeleteAccountPress() {
    Alert.alert(
      "정말 탈퇴하시겠어요?",
      "계정을 삭제하면 내 정보, 관심 지역, 알림 설정이 모두 삭제되며 되돌릴 수 없습니다. 등록하신 가격 정보는 다른 이용자를 위해 익명으로 남습니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "탈퇴하기",
          style: "destructive",
          onPress: async () => {
            const ok = await deleteAccount();
            if (!ok) {
              Alert.alert("탈퇴 실패", "잠시 후 다시 시도해주세요.");
            }
          },
        },
      ]
    );
  }

  // 비로그인 상태(둘러보기 중)면 내 정보를 보여줄 게 없으므로 로그인을 유도한다.
  if (!user) {
    return <ProfileGuestView onLoginPress={() => router.push("/login")} />;
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
            onDeleteAccountPress={handleDeleteAccountPress}
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
    message: {
      fontSize: fontSize.md,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.lg,
    },
  });
}
