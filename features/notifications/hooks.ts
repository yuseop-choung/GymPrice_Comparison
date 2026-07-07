import { useEffect, useState } from "react";
import {
  getExpoPushToken,
  requestNotificationPermission,
  savePushToken,
  sendLocalNotification,
} from "../../lib/api/notifications";
import { useAuthStore } from "../../store/authStore";

interface UseNotificationsResult {
  granted: boolean;
  /** 테스트용 로컬 알림 발송 (권한 없으면 먼저 요청) */
  sendTest: () => Promise<void>;
}

/**
 * 알림 훅 (비즈니스 로직 전담)
 * - 마운트 시 권한 상태를 확인하고, 테스트 알림 발송을 제공한다.
 */
export function useNotifications(): UseNotificationsResult {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    let mounted = true;
    requestNotificationPermission().then((ok) => {
      if (mounted) setGranted(ok);
    });
    return () => {
      mounted = false;
    };
  }, []);

  async function sendTest(): Promise<void> {
    let allowed = granted;
    if (!allowed) {
      allowed = await requestNotificationPermission();
      setGranted(allowed);
    }
    if (!allowed) return;

    await sendLocalNotification(
      "GymPrice",
      "내 주변에 새로운 가격이 등록됐어요!"
    );
  }

  return { granted, sendTest };
}

/**
 * 원격 푸시 등록 훅
 * - 로그인 유저가 생기면 Expo 푸시 토큰을 발급받아 서버에 저장한다.
 * - 토큰을 못 받으면(시뮬레이터/권한 거부/EAS 미설정) 조용히 건너뛴다.
 */
export function usePushRegistration(): void {
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    getExpoPushToken()
      .then((token) => {
        if (mounted && token) return savePushToken(user.uid, token);
      })
      .catch(() => {
        // 등록 실패는 앱 사용에 영향 없도록 무시한다.
      });

    return () => {
      mounted = false;
    };
  }, [user]);
}
