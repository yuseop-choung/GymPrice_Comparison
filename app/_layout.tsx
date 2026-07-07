import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { useOnboardingStore } from "../store/onboardingStore";

/**
 * 루트 레이아웃 (Expo Router)
 * - 앱 시작 시 온보딩 여부·인증 세션을 복구하고 화면을 분기한다.
 * - 온보딩 미완료 → 온보딩, 비로그인 → 로그인, 로그인 → 탭.
 */
export default function RootLayout() {
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const initialize = useAuthStore((state) => state.initialize);
  const hasSeen = useOnboardingStore((state) => state.hasSeen);
  const loadOnboarding = useOnboardingStore((state) => state.load);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initialize();
    loadOnboarding();
  }, [initialize, loadOnboarding]);

  useEffect(() => {
    if (!isInitialized || hasSeen === null) return;
    const seg0 = segments[0];
    const inAuthGroup = seg0 === "(auth)";

    if (!hasSeen) {
      // 온보딩 미완료 → 온보딩으로
      if (seg0 !== "onboarding") router.replace("/onboarding");
      return;
    }
    // 온보딩 완료: 온보딩 화면에 있으면 적절히 내보낸다.
    if (seg0 === "onboarding") {
      router.replace(user ? "/" : "/login");
    } else if (!user && !inAuthGroup) {
      router.replace("/login");
    } else if (user && inAuthGroup) {
      router.replace("/");
    }
  }, [user, isInitialized, hasSeen, segments, router]);

  return (
    <Stack>
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="gym/[id]/index" options={{ title: "헬스장 상세" }} />
      <Stack.Screen
        name="gym/[id]/price-submit"
        options={{ title: "가격 등록" }}
      />
      <Stack.Screen
        name="gym/[id]/price-edit"
        options={{ title: "가격 수정" }}
      />
      <Stack.Screen
        name="gym/[id]/detail-edit"
        options={{ title: "부가정보 수정" }}
      />
    </Stack>
  );
}
