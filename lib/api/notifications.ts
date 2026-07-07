import * as Notifications from "expo-notifications";

/**
 * 푸시/로컬 알림 API
 * - 모든 알림 호출은 이 파일을 통한다. (CLAUDE.md 규칙)
 * - 원격 푸시(서버 발송)는 EAS projectId + 백엔드가 필요하며, 여기서는
 *   권한 요청과 로컬 알림(서버 없이 동작)까지 제공한다.
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
