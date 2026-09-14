import { useState } from "react";
import { searchPlaces, type KakaoPlace } from "../../lib/api/kakao";

interface UseGymSearchResult {
  results: KakaoPlace[];
  isSearching: boolean;
  error: string | null;
  search: (query: string) => Promise<void>;
  /** 검색 결과 목록을 닫는다 (예: 후보 선택 후) */
  reset: () => void;
}

/**
 * 헬스장 장소 검색 훅 (비즈니스 로직 전담)
 * - 카카오 장소 검색으로 후보를 찾아 거리순으로 보여준다(등록 화면에서 사용).
 * - 검색어가 비어있으면 결과를 비운다.
 */
export function useGymSearch(coords: {
  lat: number;
  lng: number;
}): UseGymSearchResult {
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
      setResults(await searchPlaces(query, coords));
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
