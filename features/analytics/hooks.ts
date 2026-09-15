import { useEffect, useRef } from "react";
import { trackAppOpen, trackGymView } from "../../lib/api/analytics";

/**
 * 앱 접속 기록 훅 (비즈니스 로직 전담)
 * - 로그인 유저가 확인되면 이 컴포넌트 마운트 동안 한 번만 app_open 이벤트를 기록한다.
 * - 관리자 대시보드의 "오늘 접속" 지표용.
 */
export function useTrackAppOpen(userId: string | null | undefined): void {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!userId || trackedRef.current) return;
    trackedRef.current = true;
    trackAppOpen(userId).catch(() => {
      // 기록 실패는 앱 사용에 영향 없도록 무시한다.
    });
  }, [userId]);
}

/**
 * 헬스장 조회 기록 훅 (비즈니스 로직 전담)
 * - 상세 화면에 진입할 때(유저+헬스장 조합당 한 번) gym_view 이벤트를 기록한다.
 * - 관리자 대시보드의 "오늘 조회" 지표용.
 */
export function useTrackGymView(
  userId: string | null | undefined,
  gymId: string
): void {
  const trackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || !gymId || trackedRef.current === gymId) return;
    trackedRef.current = gymId;
    trackGymView(userId, gymId).catch(() => {
      // 기록 실패는 앱 사용에 영향 없도록 무시한다.
    });
  }, [userId, gymId]);
}
