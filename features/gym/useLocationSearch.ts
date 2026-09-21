import { useState } from "react";
import { searchLocations, type KakaoPlace } from "../../lib/api/kakao";

interface UseLocationSearchResult {
  results: KakaoPlace[];
  isSearching: boolean;
  error: string | null;
  search: (query: string) => Promise<void>;
  /** 결과 목록을 닫는다 (예: 후보 선택 후) */
  reset: () => void;
}

/**
 * 홈 화면 지도 위 "동네 검색" 훅 (비즈니스 로직 전담)
 * - 카카오 장소/지역 검색(searchLocations)으로 후보를 찾아, 선택 시 지도를 그
 *   위치로 옮길 수 있게 한다(실제 이동은 useMapFocus.focusOn이 담당).
 * - 헬스장 등록 화면의 장소 검색(useGymSearch, searchPlaces)과 달리 기준
 *   좌표/반경이 없고, 지하철역 등도 결과에서 제외하지 않는다.
 */
export function useLocationSearch(): UseLocationSearchResult {
  const [results, setResults] = useState<KakaoPlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(query: string): Promise<void> {
    if (query.trim() === "") {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);
    try {
      setResults(await searchLocations(query));
    } catch (e) {
      setError(e instanceof Error ? e.message : "장소 검색에 실패했습니다.");
    } finally {
      setIsSearching(false);
    }
  }

  function reset(): void {
    setResults([]);
    setError(null);
  }

  return { results, isSearching, error, search, reset };
}
