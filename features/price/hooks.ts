import { useCallback, useEffect, useState } from "react";
import type { GymPrice, MyPriceItem, PriceValues } from "../../types";
import {
  deletePrice,
  getMyPrices,
  getPrice,
  submitPrices,
  updatePrice,
} from "../gym/api";
import { validatePriceItem } from "./utils";

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

    setIsLoading(true);
    setError(null);

    try {
      const created = await submitPrices(items);
      onSuccess?.(created);
    } catch (e) {
      // 알 수 없는 에러도 사용자에게 메시지로 보여준다.
      setError(e instanceof Error ? e.message : "가격 등록에 실패했습니다.");
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
