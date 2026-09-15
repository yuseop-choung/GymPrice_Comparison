import * as Location from "expo-location";
import { create } from "zustand";
import { DEFAULT_COORDS } from "../constants/config";

interface Coords {
  lat: number;
  lng: number;
}

interface LocationState {
  coords: Coords;
  isLoading: boolean;
  error: string | null;
  /** GPS 조회를 이미 시작했는지 — 여러 화면이 동시에 위치를 쓰더라도 실제 GPS
   *  요청은 세션당 한 번만 나가게 막는 가드. */
  hasRequested: boolean;
  load: () => Promise<void>;
}

/**
 * 위치(GPS) 전역 상태 (Zustand)
 * - 홈/리스트 탭이 각자 useLocation()을 부르더라도 실제 GPS 조회는 한 번만
 *   실행되고, 그 결과를 모든 화면이 공유한다(탭을 오갈 때마다 중복으로 GPS를
 *   다시 요청하는 걸 막기 위함).
 * - 권한 거부/실패 시 DEFAULT_COORDS(봉은사역)로 폴백하고 error 메시지를 채운다.
 */
export const useLocationStore = create<LocationState>((set, get) => ({
  coords: { ...DEFAULT_COORDS },
  isLoading: true,
  error: null,
  hasRequested: false,

  load: async () => {
    if (get().hasRequested) return;
    set({ hasRequested: true });

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        set({ error: "위치 권한이 없어 기본 위치를 표시합니다.", isLoading: false });
        return;
      }

      // accuracy를 명시하지 않으면 기기가 기본(중간 정확도/네트워크 기반) 위치를
      // 줄 수 있어 실제 위치와 수 km 씩 차이 날 수 있다. GPS 기반의 높은 정확도를 요청한다.
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      set({
        coords: { lat: position.coords.latitude, lng: position.coords.longitude },
        isLoading: false,
      });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "위치를 가져오지 못했습니다.",
        isLoading: false,
      });
    }
  },
}));
