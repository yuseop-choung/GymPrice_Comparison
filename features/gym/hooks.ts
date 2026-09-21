import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { toFriendlyErrorMessage } from "../../lib/api/errors";
import { useAuthStore } from "../../store/authStore";
import type {
  Gym,
  GymDetail,
  GymDetailValues,
  GymPrice,
  GymWithPrice,
} from "../../types";
import {
  getAllGyms,
  getGymDetail,
  getGymWithPrices,
  getNearbyGyms,
  registerGym,
  saveGymDetail,
  searchGyms,
} from "./api";
import { distanceKm, isValidCoordinate } from "./utils";

/** 정지된 계정에게 보여줄 안내 메시지 (등록/수정 시도 전에 미리 막을 때 공용으로 쓴다) */
const SUSPENDED_MESSAGE =
  "정지된 계정은 이 기능을 사용할 수 없습니다. 문의가 필요하면 관리자에게 연락해주세요.";

/** 로그인하지 않은 유저에게 보여줄 안내 메시지 */
const LOGIN_REQUIRED_MESSAGE = "로그인이 필요합니다.";

interface UseGymDetailGateResult {
  /**
   * 헬스장 상세로 이동을 시도한다. 로그인 상태면 곧바로 이동하고, 비로그인
   * 상태면 상세 화면 대신 로그인을 유도하는 안내를 보여준다(그 자리에서 둘러보던
   * 흐름이 끊기지 않도록 즉시 로그인 화면으로 보내지 않고 먼저 물어본다).
   */
  openGymDetail: (gymId: string) => void;
}

/**
 * 헬스장 상세 진입 게이트 훅 (비즈니스 로직 전담)
 * - 홈/리스트 화면 어디서든 헬스장 카드를 누르는 동작에 공용으로 쓴다.
 * - 상세 화면(가격 상세 열람 등)은 로그인 유저를 전제로 하는 기능이 많아,
 *   진입 시점에 로그인을 유도한다. 목록/지도 자체는 비로그인 상태에서도 볼 수 있다.
 */
export function useGymDetailGate(): UseGymDetailGateResult {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  function openGymDetail(gymId: string): void {
    if (user) {
      router.push(`/gym/${gymId}`);
      return;
    }
    Alert.alert(
      "로그인이 필요해요",
      "헬스장 상세 정보는 로그인 후 확인할 수 있어요.",
      [
        { text: "취소", style: "cancel" },
        { text: "로그인하기", onPress: () => router.push("/login") },
      ]
    );
  }

  return { openGymDetail };
}

/** 헬스장 상세 데이터 (기본 정보 + 가격 목록 + 부가정보) */
interface GymDetailData {
  gym: Gym;
  prices: GymPrice[];
  detail: GymDetail | null;
}

interface UseGymDetailResult {
  data: GymDetailData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * 헬스장 상세 조회 훅 (비즈니스 로직 전담)
 * - 마운트 시 getGymWithPrices() 호출, 로딩/에러 상태 관리.
 * - gymId 변경 시 자동 재조회. 수동 새로고침은 refetch 사용.
 */
export function useGymDetail(gymId: string): UseGymDetailResult {
  const [data, setData] = useState<GymDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getGymWithPrices(gymId);
      setData(result);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "헬스장 정보를 불러오지 못했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  }, [gymId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { data, isLoading, error, refetch: fetchDetail };
}

interface UseNearbyGymsResult {
  gyms: GymWithPrice[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * 내 주변 헬스장 목록 조회 훅 (비즈니스 로직 전담)
 * - 위경도/반경 변경 시 자동 재조회. getNearbyGyms() 호출.
 * - enabled=false인 동안은 조회하지 않는다. useLocation()이 실제 GPS 좌표를
 *   확정하기 전까지는 DEFAULT_COORDS(폴백 좌표)가 lat/lng로 들어오는데, 그
 *   상태로 바로 조회하면 엉뚱한 위치 기준으로 불필요한 요청이 한 번 나가고
 *   실제 GPS가 잡히면 곧바로 또 요청이 나가는 낭비가 생긴다. 호출부에서
 *   `enabled: !isLocating`처럼 넘겨 GPS 확정 후에만 조회하게 한다.
 */
export function useNearbyGyms(
  lat: number,
  lng: number,
  radiusKm: number,
  enabled: boolean = true
): UseNearbyGymsResult {
  const [gyms, setGyms] = useState<GymWithPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGyms = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await getNearbyGyms(lat, lng, radiusKm);
      setGyms(result);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "주변 헬스장을 불러오지 못했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  }, [lat, lng, radiusKm, enabled]);

  useEffect(() => {
    fetchGyms();
  }, [fetchGyms]);

  return { gyms, isLoading, error, refetch: fetchGyms };
}

interface UseMapFocusResult {
  /** 지도/주변 헬스장 조회가 기준으로 삼을 좌표 — 검색 위치가 있으면 그쪽, 없으면 GPS */
  effectiveCoords: { lat: number; lng: number };
  /** 동네 검색으로 이동해 GPS가 아닌 위치를 보고 있는 상태인지 */
  isSearchFocused: boolean;
  /** 동네 검색 결과를 선택했을 때 호출 — 그 좌표를 기준으로 바꾼다 */
  focusOn: (coords: { lat: number; lng: number }) => void;
  /** 검색 위치를 해제하고 GPS 기준으로 되돌린다 */
  clearFocus: () => void;
}

/**
 * 홈 화면 지도가 기준으로 삼을 좌표를 결정하는 훅 (비즈니스 로직 전담)
 * - 지도 위 "동네 검색"에서 장소를 선택하면 focusOn으로 그 위치를 기준으로 바꾸고,
 *   "내 위치" 버튼(clearFocus)을 누르면 다시 GPS 좌표로 돌아간다.
 */
export function useMapFocus(gpsCoords: { lat: number; lng: number }): UseMapFocusResult {
  const [searchFocus, setSearchFocus] = useState<{ lat: number; lng: number } | null>(
    null
  );

  return {
    effectiveCoords: searchFocus ?? gpsCoords,
    isSearchFocused: searchFocus !== null,
    focusOn: (coords) => setSearchFocus(coords),
    clearFocus: () => setSearchFocus(null),
  };
}

interface UseSearchGymsResult {
  results: Gym[];
  isSearching: boolean;
  /** 검색을 한 번이라도 실행했는지 — "결과 없음" 문구를 검색 전과 구분해서 보여줄 때 쓴다 */
  hasSearched: boolean;
  error: string | null;
  search: (keyword: string) => Promise<void>;
  reset: () => void;
}

/**
 * 등록된 헬스장 검색 훅 (비즈니스 로직 전담)
 * - "가격만 등록" 모드에서 대상 헬스장을 이름으로 찾을 때 쓴다. 헬스장 등록 화면의
 *   카카오 장소 검색(useGymSearch)과 달리 우리 DB에 이미 등록된 헬스장만 대상으로 한다.
 */
export function useSearchGyms(): UseSearchGymsResult {
  const [results, setResults] = useState<Gym[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(keyword: string): Promise<void> {
    if (keyword.trim() === "") {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);
    try {
      setResults(await searchGyms(keyword));
    } catch (e) {
      setError(e instanceof Error ? e.message : "헬스장 검색에 실패했습니다.");
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  }

  function reset(): void {
    setResults([]);
    setError(null);
    setHasSearched(false);
  }

  return { results, isSearching, hasSearched, error, search, reset };
}

export type GymSortKey = "distance" | "price";

/** 지역 필터 값 — sigungu가 null이면 시/도 전체(그 안의 모든 시/군/구)를 대상으로 한다 */
export interface RegionFilter {
  sido: string;
  sigungu: string | null;
}

interface UseGymListingResult {
  keyword: string;
  setKeyword: (text: string) => void;
  sortKey: GymSortKey;
  setSortKey: (key: GymSortKey) => void;
  /** 이 값 이하인 1개월 최저가만 보여준다. null이면 필터 없음 */
  maxPrice: number | null;
  setMaxPrice: (price: number | null) => void;
  region: RegionFilter | null;
  setRegion: (region: RegionFilter | null) => void;
  gyms: GymWithPrice[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * 리스트 화면의 헬스장 목록 로직 (비즈니스 로직 전담)
 * - 반경 제한 없이 전체 헬스장을 대상으로 한다(getAllGyms). 검색어/가격대/지역
 *   필터와 정렬(거리순/최저가순)은 모두 이미 불러온 전체 목록을 클라이언트에서
 *   걸러서 적용한다 — 필터를 바꿀 때마다 다시 서버에 왕복하지 않는다.
 */
export function useGymListing(coords: {
  lat: number;
  lng: number;
}): UseGymListingResult {
  const [keyword, setKeyword] = useState("");
  const [sortKey, setSortKey] = useState<GymSortKey>("distance");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [region, setRegion] = useState<RegionFilter | null>(null);

  const [allGyms, setAllGyms] = useState<GymWithPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllGyms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setAllGyms(await getAllGyms());
    } catch (e) {
      setError(e instanceof Error ? e.message : "헬스장 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllGyms();
  }, [fetchAllGyms]);

  const gyms = useMemo(() => {
    const q = keyword.trim();
    let filtered =
      q === ""
        ? allGyms
        : allGyms.filter((g) => g.name.includes(q) || (g.address ?? "").includes(q));

    if (maxPrice !== null) {
      filtered = filtered.filter(
        (g) => g.lowest_price_1m !== null && g.lowest_price_1m <= maxPrice
      );
    }

    if (region !== null) {
      filtered = filtered.filter((g) => {
        const address = g.address ?? "";
        if (!address.includes(region.sido)) return false;
        if (region.sigungu && !address.includes(region.sigungu)) return false;
        return true;
      });
    }

    return [...filtered].sort((a, b) => {
      if (sortKey === "price") {
        if (a.lowest_price_1m === null) return 1;
        if (b.lowest_price_1m === null) return -1;
        return a.lowest_price_1m - b.lowest_price_1m;
      }
      return (
        distanceKm(coords.lat, coords.lng, a.lat, a.lng) -
        distanceKm(coords.lat, coords.lng, b.lat, b.lng)
      );
    });
  }, [allGyms, keyword, maxPrice, region, sortKey, coords.lat, coords.lng]);

  return {
    keyword,
    setKeyword,
    sortKey,
    setSortKey,
    maxPrice,
    setMaxPrice,
    region,
    setRegion,
    gyms,
    isLoading,
    error,
    refetch: fetchAllGyms,
  };
}

/** 헬스장 등록 입력값 (id, created_at 은 서버에서 생성) */
type GymInput = Omit<Gym, "id" | "created_at">;

interface UseRegisterGymParams {
  onSuccess?: (created: Gym) => void;
}

interface UseRegisterGymResult {
  submit: (input: GymInput) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * 헬스장 등록 훅 (비즈니스 로직 전담)
 * - 유효성 검사: 이름은 필수, 주소는 선택(검색으로 등록 시 자동으로 채워지지만
 *   직접 입력 시에는 비워둘 수 있다), 위경도는 유효한 숫자여야 한다.
 */
export function useRegisterGym({
  onSuccess,
}: UseRegisterGymParams = {}): UseRegisterGymResult {
  const user = useAuthStore((state) => state.user);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(input: GymInput): Promise<void> {
    if (input.name.trim() === "") {
      setError("헬스장 이름을 입력해주세요.");
      return;
    }
    if (!isValidCoordinate(input.lat, input.lng)) {
      setError("위치(위도/경도)가 올바르지 않습니다.");
      return;
    }
    // 등록 탭은 비로그인 상태에서도 열람할 수 있어(둘러보기 허용), 제출 시점에
    // 로그인 여부를 확인한다. 서버(RLS)도 막지만, 폼을 다 채운 뒤에야 실패
    // 문구를 보는 것보다 이해하기 쉬운 안내를 먼저 보여준다.
    if (!user) {
      setError(LOGIN_REQUIRED_MESSAGE);
      return;
    }
    // 서버(RLS)도 정지 계정의 등록을 막지만, 여기서 미리 걸러 기술적인 에러
    // 문구 대신 이해할 수 있는 안내를 바로 보여준다.
    if (user.is_suspended) {
      setError(SUSPENDED_MESSAGE);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const created = await registerGym(input);
      onSuccess?.(created);
    } catch (e) {
      setError(toFriendlyErrorMessage(e, "헬스장 등록에 실패했습니다."));
    } finally {
      setIsLoading(false);
    }
  }

  return { submit, isLoading, error };
}

interface UseEditGymDetailResult {
  initial: GymDetailValues | null;
  /** 기존 값 로드 자체가 실패한 경우(네트워크/권한/서버 오류 등)의 메시지 */
  loadError: string | null;
  error: string | null;
  isBusy: boolean;
  save: (values: GymDetailValues) => Promise<void>;
}

/** 빈 부가정보 입력값 (신규 등록 시 기본값 — "아직 등록된 정보 없음"과 구분해서 쓴다) */
const EMPTY_DETAIL: GymDetailValues = {
  equipment_brand: null,
  cleanliness: null,
  trainer_count: null,
  memo: null,
};

/**
 * 헬스장 부가정보 수정 훅 (비즈니스 로직 전담)
 * - 마운트 시 기존 값을 불러오고(없으면 빈 값), 저장한다.
 * - 청결도는 1~5 범위만 허용.
 * - ⚠️ "기존 정보가 없음"(정상, EMPTY_DETAIL)과 "불러오기 실패"(loadError)를
 *   반드시 구분한다. 이걸 구분하지 않고 실패 시에도 EMPTY_DETAIL을 쓰면, 조회가
 *   네트워크/권한 오류로 실패했을 뿐인데 사용자에게는 빈 폼이 보여서 그대로
 *   저장을 누르면 실제로 존재하던 값을 null로 덮어써 데이터가 유실될 수 있다.
 */
export function useEditGymDetail(
  gymId: string,
  onDone: () => void
): UseEditGymDetailResult {
  const user = useAuthStore((state) => state.user);
  const [initial, setInitial] = useState<GymDetailValues | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    getGymDetail(gymId)
      .then((detail) =>
        setInitial(
          detail
            ? {
                equipment_brand: detail.equipment_brand,
                cleanliness: detail.cleanliness,
                trainer_count: detail.trainer_count,
                memo: detail.memo,
              }
            : EMPTY_DETAIL
        )
      )
      .catch((e) =>
        setLoadError(
          e instanceof Error ? e.message : "부가정보를 불러오지 못했습니다."
        )
      );
  }, [gymId]);

  async function save(values: GymDetailValues): Promise<void> {
    if (
      values.cleanliness !== null &&
      (values.cleanliness < 1 || values.cleanliness > 5)
    ) {
      setError("청결도는 1~5 사이로 입력해주세요.");
      return;
    }
    if (user?.is_suspended) {
      setError(SUSPENDED_MESSAGE);
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      await saveGymDetail(gymId, values);
      onDone();
    } catch (e) {
      setError(toFriendlyErrorMessage(e, "부가정보 저장에 실패했습니다."));
    } finally {
      setIsBusy(false);
    }
  }

  return { initial, loadError, error, isBusy, save };
}
