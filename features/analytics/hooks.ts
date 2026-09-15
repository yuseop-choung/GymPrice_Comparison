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
 * - 상세 화면에 진입할 때 gym_view 이벤트를 기록한다.
 * - 관리자 대시보드의 "오늘 헬스장 조회수"는 이 이벤트를 유저/기간 구분 없이
 *   그대로 합산한 "총 조회 횟수"다(고유 유저 수가 아니다 — "오늘 접속(고유 유저)"
 *   지표와는 다른 성격). 그래서 여기서의 중복 방지는 "같은 화면이 떠 있는 동안
 *   같은 gymId를 다시 기록하지 않는" 정도만 보장한다(예: refetch로 인한 재실행
 *   방지). 화면을 벗어났다가 같은 헬스장을 다시 보면(재마운트) 새로운 조회로
 *   다시 기록된다 — 이는 의도된 동작이며, "유저+헬스장 조합당 하루 1회"처럼
 *   더 강한 중복 제거가 필요하면 이 훅이 아니라 집계 쿼리 단에서 처리해야 한다.
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
