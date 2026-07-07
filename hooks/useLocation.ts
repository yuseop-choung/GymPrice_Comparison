import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { DEFAULT_COORDS } from "../constants/config";

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
 * - 권한 거부/실패 시 DEFAULT_COORDS(서울 시청)로 폴백하고 error 메시지를 채운다.
 */
export function useLocation(): UseLocationResult {
  const [coords, setCoords] = useState<Coords>({ ...DEFAULT_COORDS });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (mounted) {
            setError("위치 권한이 없어 기본 위치를 표시합니다.");
          }
          return;
        }

        const position = await Location.getCurrentPositionAsync({});
        if (mounted) {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        }
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : "위치를 가져오지 못했습니다.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return { coords, isLoading, error };
}
