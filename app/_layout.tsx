import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { HeaderBackButton } from "../components/ui/HeaderBackButton";
import { useTrackAppOpen } from "../features/analytics/hooks";
import {
  useNotificationNavigation,
  usePushRegistration,
} from "../features/notifications/hooks";
import { useIsDarkMode, useThemeColors } from "../hooks/useThemeColors";
import { useAuthStore } from "../store/authStore";
import { useOnboardingStore } from "../store/onboardingStore";
import { useThemeStore } from "../store/themeStore";

// 세션 복구·온보딩 여부 확인이 끝나기 전까지 네이티브 스플래시를 계속 띄워둔다
// (아래에서 확인이 끝나는 시점에 직접 hideAsync를 호출한다).
SplashScreen.preventAutoHideAsync().catch(() => {
  // 이미 자동으로 숨겨졌거나 지원하지 않는 환경이어도 앱 진입에는 지장 없다.
});

/**
 * 루트 레이아웃 (Expo Router)
 * - 앱 시작 시 온보딩 여부·인증 세션·테마 설정을 복구하고 화면을 분기한다.
 * - 온보딩 미완료 → 온보딩, 온보딩 완료 → 탭(로그인 여부와 무관하게 둘러볼 수 있음).
 * - 가격 등록/수정, 헬스장 등록/부가정보 수정, 관심 지역 설정, 헬스장 상세처럼
 *   로그인이 실제로 필요한 화면(탭 바깥의 화면들)만 비로그인 시 로그인으로 보낸다.
 *   헬스장 상세는 로그인 유도(Alert)를 먼저 보여준 뒤에만 이 경로로 오므로,
 *   여기 도달했다는 것 자체가 곧장 로그인으로 보내도 되는 경우다.
 */
export default function RootLayout() {
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const initialize = useAuthStore((state) => state.initialize);
  const hasSeen = useOnboardingStore((state) => state.hasSeen);
  const loadOnboarding = useOnboardingStore((state) => state.load);
  const isThemeLoaded = useThemeStore((state) => state.isLoaded);
  const loadTheme = useThemeStore((state) => state.load);
  const colors = useThemeColors();
  const isDark = useIsDarkMode();
  const segments = useSegments();
  const router = useRouter();

  usePushRegistration(); // 로그인 시 푸시 토큰 등록
  useNotificationNavigation(); // 알림을 탭하면 해당 헬스장 상세로 이동
  useTrackAppOpen(user?.uid); // 관리자 대시보드 "오늘 접속" 지표용

  useEffect(() => {
    initialize();
    loadOnboarding();
    loadTheme();
  }, [initialize, loadOnboarding, loadTheme]);

  useEffect(() => {
    if (!isInitialized || hasSeen === null || !isThemeLoaded) return;
    SplashScreen.hideAsync().catch(() => {
      // 스플래시 숨기기 실패는 무시(이미 숨겨진 경우 등)
    });
    const seg0 = segments[0];
    const inAuthGroup = seg0 === "(auth)";
    // 탭(홈/리스트/등록/내 정보)은 로그인 없이도 둘러볼 수 있다. 가격 등록/수정,
    // 헬스장 등록 폼 자체는 그 안에서(훅에서) 별도로 로그인 여부를 확인한다.
    const inTabsGroup = seg0 === "(tabs)";

    if (!hasSeen) {
      // 온보딩 미완료 → 온보딩으로
      if (seg0 !== "onboarding") router.replace("/onboarding");
      return;
    }
    // 온보딩 완료: 온보딩 화면에 있으면 로그인 여부와 무관하게 탭으로 보낸다
    // (게스트도 둘러볼 수 있으므로 굳이 로그인부터 강제하지 않는다).
    if (seg0 === "onboarding") {
      router.replace("/");
    } else if (!user && !inAuthGroup && !inTabsGroup) {
      router.replace("/login");
    } else if (user && inAuthGroup) {
      router.replace("/");
    }
  }, [user, isInitialized, hasSeen, isThemeLoaded, segments, router]);

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="gym/[id]/index" options={{ title: "헬스장 상세" }} />
        <Stack.Screen
          name="gym/[id]/price-submit"
          options={{
            title: "가격 등록",
            // 헬스장 등록 직후 router.replace로 곧바로 이 화면에 올 수도 있어
            // (그 경우 스택 히스토리가 없어 기본 뒤로가기 화살표가 안 뜬다),
            // 항상 동작하는 뒤로가기 버튼을 직접 넣는다.
            headerLeft: () => <HeaderBackButton />,
          }}
        />
        <Stack.Screen
          name="gym/[id]/price-edit"
          options={{ title: "가격 수정" }}
        />
        <Stack.Screen
          name="gym/[id]/detail-edit"
          options={{ title: "부가정보 수정" }}
        />
        <Stack.Screen
          name="interest-region"
          options={{ title: "관심 지역 설정" }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
