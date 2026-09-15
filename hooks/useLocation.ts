import { useEffect } from "react";
import { useLocationStore } from "../store/locationStore";

interface Coords {
  lat: number;
  lng: number;
}

interface UseLocationResult {
  coords: Coords;
  isLoading: boolean;
  error: string | null;
}

/**
 * 현재 위치(GPS) 조회 훅
 * - 실제 상태는 locationStore가 앱 전체에서 공유한다 — 이 훅을 여러 화면(홈/리스트
 *   탭 등)에서 동시에 써도 GPS 조회 자체는 세션당 한 번만 실행된다.
 * - 권한 거부/실패 시 DEFAULT_COORDS(봉은사역)로 폴백하고 error 메시지를 채운다.
 */
export function useLocation(): UseLocationResult {
  const coords = useLocationStore((state) => state.coords);
  const isLoading = useLocationStore((state) => state.isLoading);
  const error = useLocationStore((state) => state.error);
  const load = useLocationStore((state) => state.load);

  useEffect(() => {
    load();
  }, [load]);

  return { coords, isLoading, error };
}
