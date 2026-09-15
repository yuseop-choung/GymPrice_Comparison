import { useCallback, useEffect, useRef, useState } from "react";
import { toFriendlyErrorMessage } from "../../lib/api/errors";
import { recordGymPriceView, type GymPriceViewResult } from "../../lib/api/priceViews";
import { useAuthStore } from "../../store/authStore";
import type { GymPrice, MyPriceItem, PriceValues } from "../../types";
import {
  deletePrice,
  getMyPrices,
  getPrice,
  submitPrices,
  updatePrice,
} from "../gym/api";
import { validatePriceItem } from "./utils";

/** 정지된 계정에게 보여줄 안내 메시지 */
const SUSPENDED_MESSAGE =
  "정지된 계정은 이 기능을 사용할 수 없습니다. 문의가 필요하면 관리자에게 연락해주세요.";

/** 가격 항목 등록 입력값 (id, created_at, status 는 서버에서 생성/관리) */
type PriceItemInput = Omit<GymPrice, "id" | "created_at" | "status">;

interface UseSubmitPriceParams {
  /** 등록 성공 시 호출되는 콜백 */
  onSuccess?: (created: GymPrice[]) => void;
}

interface UseSubmitPriceResult {
  submit: (items: PriceItemInput[]) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * 가격 등록 훅 (비즈니스 로직 전담)
 * - 한 번에 여러 항목(예: "1개월" + "PT 10회")을 등록할 수 있다.
 * - 유효성 검사: 최소 1개 항목이 있어야 하며, 각 항목의 라벨/가격이 유효해야 한다.
 * - submitPrices() 호출 및 로딩/에러 상태 관리.
 */
export function useSubmitPrice({
  onSuccess,
}: UseSubmitPriceParams = {}): UseSubmitPriceResult {
  const user = useAuthStore((state) => state.user);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(items: PriceItemInput[]): Promise<void> {
    if (items.length === 0) {
      setError("최소 1개 이상의 가격을 입력해주세요.");
      return;
    }
    for (const item of items) {
      const validationError = validatePriceItem(item);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    // 서버(RLS)도 정지 계정의 등록을 막지만, 여기서 미리 걸러 기술적인 에러
    // 문구 대신 이해할 수 있는 안내를 바로 보여준다.
    if (user?.is_suspended) {
      setError(SUSPENDED_MESSAGE);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const created = await submitPrices(items);
      onSuccess?.(created);
    } catch (e) {
      // 알 수 없는 에러도 사용자에게 메시지로 보여준다.
      setError(toFriendlyErrorMessage(e, "가격 등록에 실패했습니다."));
    } finally {
      setIsLoading(false);
    }
  }

  return { submit, isLoading, error };
}

interface UseMyPricesResult {
  prices: MyPriceItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * 내가 등록한 가격 목록 조회 훅 (비즈니스 로직 전담)
 * - userId 가 없으면(비로그인) 빈 목록.
 */
export function useMyPrices(
  userId: string | null | undefined
): UseMyPricesResult {
  const [prices, setPrices] = useState<MyPriceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    if (!userId) {
      setPrices([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setPrices(await getMyPrices(userId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "내 가격을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  return { prices, isLoading, error, refetch: fetchPrices };
}

interface UseEditPriceResult {
  /** 기존 값 로드 결과 (로딩 중이면 null) */
  initial: PriceValues | null;
  loadError: string | null;
  error: string | null;
  isBusy: boolean;
  save: (values: PriceValues) => Promise<void>;
  remove: () => Promise<void>;
}

/**
 * 가격 항목 수정/삭제 훅 (비즈니스 로직 전담)
 * - 마운트 시 기존 가격 항목(라벨+가격+메모)을 불러오고, 저장(검증 포함)/삭제를 처리한다.
 * - 완료 시 onDone 콜백 호출(화면 닫기 등).
 */
export function useEditPrice(
  priceId: string,
  onDone: () => void
): UseEditPriceResult {
  const [initial, setInitial] = useState<PriceValues | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    getPrice(priceId)
      .then((price) =>
        setInitial({
          label: price.label,
          price: price.price,
          memo: price.memo,
        })
      )
      .catch((e) =>
        setLoadError(
          e instanceof Error ? e.message : "가격 정보를 불러오지 못했습니다."
        )
      );
  }, [priceId]);

  async function save(values: PriceValues): Promise<void> {
    const validationError = validatePriceItem(values);
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsBusy(true);
    setError(null);
    try {
      await updatePrice(priceId, values);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "가격 수정에 실패했습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  async function remove(): Promise<void> {
    setIsBusy(true);
    setError(null);
    try {
      await deletePrice(priceId);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "가격 삭제에 실패했습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  return { initial, loadError, error, isBusy, save, remove };
}

interface UseDetailPriceAccessResult {
  isChecking: boolean;
  error: string | null;
  /** 오늘 한도 초과로 막혔는지 — true면 화면에서 안내 모달을 띄운다 */
  limitReached: boolean;
  /** 오늘 남은 무료 열람 가능 헬스장 수 (기여자라 무제한이면 null) */
  remaining: number | null;
  /** "다른 기간 가격 보기" 클릭 시 호출 — 열람 가능하면 true(그 뒤 펼치면 됨) */
  requestAccess: () => Promise<boolean>;
  dismissLimitModal: () => void;
}

/**
 * 헬스장 상세 가격(1개월 외 기간/개별 등록 내역) 열람 접근 훅 (비즈니스 로직 전담)
 * - 최근 1년 내 승인된 가격을 등록한 유저는 무제한, 그 외에는 하루 3곳까지만
 *   허용한다(서버가 최종 판정 — record_gym_price_view 참고).
 * - 한 번 허용되면 이 화면(훅 인스턴스)이 떠 있는 동안은 다시 확인하지 않는다
 *   (토글을 여닫을 때마다 매번 서버를 부르지 않도록).
 */
export function useDetailPriceAccess(gymId: string): UseDetailPriceAccessResult {
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const grantedRef = useRef(false);

  async function requestAccess(): Promise<boolean> {
    if (grantedRef.current) return true;

    setIsChecking(true);
    setError(null);
    try {
      const result: GymPriceViewResult = await recordGymPriceView(gymId);
      setRemaining(result.remaining);
      if (result.allowed) {
        grantedRef.current = true;
        return true;
      }
      setLimitReached(true);
      return false;
    } catch (e) {
      setError(e instanceof Error ? e.message : "열람 가능 여부를 확인하지 못했습니다.");
      return false;
    } finally {
      setIsChecking(false);
    }
  }

  function dismissLimitModal(): void {
    setLimitReached(false);
  }

  return { isChecking, error, limitReached, remaining, requestAccess, dismissLimitModal };
}
