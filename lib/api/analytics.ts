import { USE_MOCK } from "../../constants/config";
import { supabase } from "../supabase";

/**
 * 앱 사용 이벤트(접속/조회) 기록 API
 * - 모든 이벤트 기록 호출은 이 파일을 통한다. (CLAUDE.md 규칙)
 * - 관리자 대시보드의 "오늘 접속/조회" 지표 계산에 사용된다(app_events 테이블).
 * - 기록 실패가 앱 사용에 영향을 주면 안 되므로, 호출부에서 에러를 무시하는 것을
 *   전제로 한다(이 파일은 에러를 그대로 throw만 한다).
 */

/** 로그인 유저가 앱을 열었을 때 기록 */
export async function trackAppOpen(userId: string): Promise<void> {
  if (USE_MOCK) return;

  const { error } = await supabase
    .from("app_events")
    .insert({ user_id: userId, event_type: "app_open" });
  if (error) throw new Error(error.message);
}

/** 헬스장 상세를 조회했을 때 기록 */
export async function trackGymView(userId: string, gymId: string): Promise<void> {
  if (USE_MOCK) return;

  const { error } = await supabase
    .from("app_events")
    .insert({ user_id: userId, event_type: "gym_view", gym_id: gymId });
  if (error) throw new Error(error.message);
}
