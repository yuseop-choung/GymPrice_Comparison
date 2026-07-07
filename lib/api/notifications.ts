import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { USE_MOCK } from "../../constants/config";
import { supabase } from "../supabase";

/**
 * 푸시/로컬 알림 API
 * - 모든 알림 호출은 이 파일을 통한다. (CLAUDE.md 규칙)
 * - 로컬 알림(서버 없이 동작)과 원격 푸시용 토큰 발급/저장을 제공한다.
 * - 실제 발송은 서버(Supabase Edge Function)가 Expo Push API로 수행한다.
 */

// 앱이 포그라운드일 때 알림 표시 방식
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** 알림 권한 요청 (이미 허용돼 있으면 그대로 true) */
export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** 로컬 알림 즉시 발송 (서버 없이 동작 — 데모/리마인더용) */
export async function sendLocalNotification(
  title: string,
  body: string
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null, // 즉시
  });
}

/**
 * 원격 푸시용 Expo 푸시 토큰 발급
 * - 실기기 + 권한 + EAS projectId 가 있어야 발급된다. 조건 미충족 시 null.
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (USE_MOCK) return "ExponentPushToken[mock-token]";

  if (!Device.isDevice) return null; // 시뮬레이터/에뮬레이터는 원격 토큰 불가

  const granted = await requestNotificationPermission();
  if (!granted) return null;

  const easExtra = Constants.expoConfig?.extra?.eas as
    | { projectId?: string }
    | undefined;
  const projectId: string | undefined = easExtra?.projectId;
  if (!projectId) return null; // EAS projectId 미설정

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

/** 푸시 토큰을 서버(push_tokens)에 저장 (같은 토큰이면 갱신) */
export async function savePushToken(
  userId: string,
  token: string
): Promise<void> {
  if (USE_MOCK) return;

  const { error } = await supabase
    .from("push_tokens")
    .upsert({ user_id: userId, token }, { onConflict: "token" });
  if (error) throw new Error(error.message);
}
