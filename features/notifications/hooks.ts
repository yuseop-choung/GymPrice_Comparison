import { useEffect, useState } from "react";
import {
  requestNotificationPermission,
  sendLocalNotification,
} from "../../lib/api/notifications";

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
