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
 * - 권한 거부/실패 시 DEFAULT_COORDS(봉은사역)로 폴백하고 error 메시지를 채운다.
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

        // accuracy를 명시하지 않으면 기기가 기본(중간 정확도/네트워크 기반) 위치를
        // 줄 수 있어 실제 위치와 수 km 씩 차이 날 수 있다. GPS 기반의 높은 정확도를 요청한다.
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
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
