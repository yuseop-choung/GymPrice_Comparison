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

/** 알림에 담겨 오는 데이터 (서버가 gym_id를 담아 보낸다 — on-new-price 참고) */
export interface NotificationTapData {
  gym_id?: string;
}

/** 알림 탭 페이로드에서 필요한 값만 안전하게 꺼낸다 (형식이 다르면 빈 값) */
function readTapData(data: unknown): NotificationTapData {
  if (typeof data !== "object" || data === null) return {};
  const gymId = (data as Record<string, unknown>).gym_id;
  return { gym_id: typeof gymId === "string" ? gymId : undefined };
}

/**
 * 알림을 탭했을 때(앱이 켜져 있거나 백그라운드) 호출되는 리스너를 등록한다.
 * - 반환값을 호출하면 구독을 해제한다.
 */
export function addNotificationTapListener(
  onTap: (data: NotificationTapData) => void
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    onTap(readTapData(response.notification.request.content.data));
  });
  return () => subscription.remove();
}

/**
 * 앱이 완전히 종료된 상태에서 알림을 탭해 실행된 경우, 그 알림의 데이터를 가져온다.
 * - 알림을 탭해서 실행된 게 아니면 null.
 */
export async function getLastNotificationTapData(): Promise<NotificationTapData | null> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return null;
  return readTapData(response.notification.request.content.data);
}
