import { useState } from "react";
import { searchGyms } from "../gym/api";
import { searchLocations, type KakaoPlace } from "../../lib/api/kakao";
import type { Gym } from "../../types";

interface UseUnifiedSearchResult {
  /** 이름이 일치하는 헬스장 (반경 제한 없이 전체 DB 대상) */
  gymResults: Gym[];
  /** 검색어와 일치하는 장소/지역 (카카오) — 선택 시 지도를 그 위치로 이동 */
  placeResults: KakaoPlace[];
  isSearching: boolean;
  hasSearched: boolean;
  error: string | null;
  search: (keyword: string) => Promise<void>;
  reset: () => void;
}

/**
 * 통합 검색 훅 (비즈니스 로직 전담)
 * - 검색 탭에서 헬스장 이름(우리 DB, 반경 무관)과 장소/지역(카카오)을 한 번에 검색한다.
 * - 두 검색은 서로 독립적이라 Promise.allSettled로 병렬 실행하고, 한쪽이 실패해도
 *   (예: 카카오 키 미설정) 성공한 쪽 결과는 그대로 보여준다.
 */
export function useUnifiedSearch(): UseUnifiedSearchResult {
  const [gymResults, setGymResults] = useState<Gym[]>([]);
  const [placeResults, setPlaceResults] = useState<KakaoPlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(keyword: string): Promise<void> {
    const trimmed = keyword.trim();
    if (trimmed === "") {
      setGymResults([]);
      setPlaceResults([]);
      setHasSearched(false);
      setError(null);
      return;
    }

    setIsSearching(true);
    setError(null);

    const [gymsOutcome, placesOutcome] = await Promise.allSettled([
      searchGyms(trimmed),
      searchLocations(trimmed),
    ]);

    setGymResults(gymsOutcome.status === "fulfilled" ? gymsOutcome.value : []);
    setPlaceResults(placesOutcome.status === "fulfilled" ? placesOutcome.value : []);
    if (gymsOutcome.status === "rejected" && placesOutcome.status === "rejected") {
      setError("검색에 실패했습니다.");
    }

    setHasSearched(true);
    setIsSearching(false);
  }

  function reset(): void {
    setGymResults([]);
    setPlaceResults([]);
    setHasSearched(false);
    setError(null);
  }

  return {
    gymResults,
    placeResults,
    isSearching,
    hasSearched,
    error,
    search,
    reset,
  };
}
