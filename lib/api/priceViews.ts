import { USE_MOCK } from "../../constants/config";
import { supabase } from "../supabase";

/**
 * 헬스장 상세 가격(1개월 외 기간/개별 등록 내역) 열람 API
 * - 하루 무료 열람 한도(비기여자 3곳/일) + 기여자(최근 1년 내 승인된 가격 등록)
 *   무제한 열람 판정을 서버(RPC)에서 처리한다. 클라이언트는 판정 결과만 받는다.
 */

/** record_gym_price_view() RPC 응답 */
export interface GymPriceViewResult {
  allowed: boolean;
  reason: "contributor" | "already_viewed_today" | "within_limit" | "daily_limit_reached";
  /** 오늘 남은 무료 열람 가능 헬스장 수. 기여자(무제한)면 null. */
  remaining: number | null;
}

/** 목 모드에서 사용할 기본 응답 (항상 허용 — 목 모드는 흐름 확인용이라 제한을 두지 않는다) */
const MOCK_RESULT: GymPriceViewResult = {
  allowed: true,
  reason: "within_limit",
  remaining: 2,
};

/**
 * 헬스장 상세 가격 열람을 요청하고, 허용 여부와 남은 횟수를 받는다.
 * - 허용된 경우 서버가 "오늘 조회"로 함께 기록한다(같은 헬스장 재조회는 중복 기록 안 함).
 */
export async function recordGymPriceView(gymId: string): Promise<GymPriceViewResult> {
  if (USE_MOCK) return MOCK_RESULT;

  const { data, error } = await supabase.rpc("record_gym_price_view", {
    target_gym_id: gymId,
  });
  if (error) throw new Error(error.message);
  return data as GymPriceViewResult;
}
