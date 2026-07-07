import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { colors } from "../../constants/colors";
import { fontSize, spacing } from "../../constants/layout";
import { useNotifications } from "../../features/notifications/hooks";
import { useMyPrices } from "../../features/price/hooks";
import { MyPriceCard } from "../../features/user/components/MyPriceCard";
import { useAuthStore } from "../../store/authStore";

/** 내 정보 탭 — 유저 정보 + 내가 등록한 가격 목록(수정/삭제) + 로그아웃 */
export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const { prices, isLoading, refetch } = useMyPrices(user?.uid);
  const { sendTest } = useNotifications();

  // 화면에 돌아올 때마다 최신화 (등록/수정/삭제 반영)
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

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
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.nickname}>{user?.nickname ?? "게스트"}</Text>
            <Text style={styles.email}>{user?.email ?? ""}</Text>
            <View style={styles.action}>
              <Button title="테스트 알림 보내기" onPress={sendTest} />
            </View>
            <View style={styles.action}>
              <Button title="로그아웃" onPress={signOut} />
            </View>
            <Text style={styles.sectionTitle}>
              내가 등록한 가격 ({prices.length})
            </Text>
          </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
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
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.xl,
  },
  message: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});
