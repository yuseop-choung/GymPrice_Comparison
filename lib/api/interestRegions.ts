import { USE_MOCK } from "../../constants/config";
import type { InterestRegion } from "../../types";
import { supabase } from "../supabase";

/**
 * 관심 지역 API
 * - 모든 관심 지역 관련 호출은 이 파일을 통한다. (CLAUDE.md 규칙)
 * - 유저당 최대 5개까지 등록 가능(초과 시 DB 트리거가 에러를 낸다).
 */

// 목 모드용 인메모리 저장소 (앱 재시작 전까지만 유지)
let mockRegions: InterestRegion[] = [];

/** 내 관심 지역 목록 조회 (등록순) */
export async function getInterestRegions(userId: string): Promise<InterestRegion[]> {
  if (USE_MOCK) return mockRegions.filter((region) => region.user_id === userId);

  const { data, error } = await supabase
    .from("user_interest_regions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .returns<InterestRegion[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** 관심 지역 추가 (이미 5개면 DB 트리거가 에러 메시지와 함께 거부한다) */
export async function addInterestRegion(
  userId: string,
  sido: string,
  sigungu: string
): Promise<InterestRegion> {
  if (USE_MOCK) {
    const region: InterestRegion = {
      id: `mock-region-${Date.now()}`,
      user_id: userId,
      sido,
      sigungu,
      created_at: new Date().toISOString(),
    };
    mockRegions = [...mockRegions, region];
    return region;
  }

  const { data, error } = await supabase
    .from("user_interest_regions")
    .insert({ user_id: userId, sido, sigungu })
    .select()
    .single<InterestRegion>();
  if (error) {
    // 중복 추가는 친절한 메시지로 바꿔준다 (unique 제약 위반)
    if (error.code === "23505") throw new Error("이미 추가된 지역이에요.");
    throw new Error(error.message);
  }
  return data;
}

/** 관심 지역 삭제 */
export async function removeInterestRegion(regionId: string): Promise<void> {
  if (USE_MOCK) {
    mockRegions = mockRegions.filter((region) => region.id !== regionId);
    return;
  }

  const { error } = await supabase
    .from("user_interest_regions")
    .delete()
    .eq("id", regionId);
  if (error) throw new Error(error.message);
}
