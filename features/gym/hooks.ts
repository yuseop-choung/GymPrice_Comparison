import { useCallback, useEffect, useState } from "react";
import type {
  Gym,
  GymDetail,
  GymDetailValues,
  GymPrice,
  GymWithPrice,
} from "../../types";
import {
  getGymDetail,
  getGymWithPrices,
  getNearbyGyms,
  registerGym,
  saveGymDetail,
} from "./api";

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
 */
export function useNearbyGyms(
  lat: number,
  lng: number,
  radiusKm: number
): UseNearbyGymsResult {
  const [gyms, setGyms] = useState<GymWithPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGyms = useCallback(async () => {
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
  }, [lat, lng, radiusKm]);

  useEffect(() => {
    fetchGyms();
  }, [fetchGyms]);

  return { gyms, isLoading, error, refetch: fetchGyms };
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
 * - 유효성 검사: 이름/주소 필수, 위경도는 유효한 숫자여야 한다.
 */
export function useRegisterGym({
  onSuccess,
}: UseRegisterGymParams = {}): UseRegisterGymResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(input: GymInput): Promise<void> {
    if (input.name.trim() === "" || input.address.trim() === "") {
      setError("헬스장 이름과 주소를 입력해주세요.");
      return;
    }
    if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
      setError("위치(위도/경도)가 올바르지 않습니다.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const created = await registerGym(input);
      onSuccess?.(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : "헬스장 등록에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return { submit, isLoading, error };
}

interface UseEditGymDetailResult {
  initial: GymDetailValues | null;
  error: string | null;
  isBusy: boolean;
  save: (values: GymDetailValues) => Promise<void>;
}

/** 빈 부가정보 입력값 (신규 등록 시 기본값) */
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
 */
export function useEditGymDetail(
  gymId: string,
  onDone: () => void
): UseEditGymDetailResult {
  const [initial, setInitial] = useState<GymDetailValues | null>(null);
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
      .catch(() => setInitial(EMPTY_DETAIL));
  }, [gymId]);

  async function save(values: GymDetailValues): Promise<void> {
    if (
      values.cleanliness !== null &&
      (values.cleanliness < 1 || values.cleanliness > 5)
    ) {
      setError("청결도는 1~5 사이로 입력해주세요.");
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      await saveGymDetail(gymId, values);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "부가정보 저장에 실패했습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  return { initial, error, isBusy, save };
}
