/**
 * GymPrice 전체 타입 정의
 * - 모든 도메인 타입을 이곳에서 관리한다.
 * - DB 컬럼명과 1:1로 매핑되도록 snake_case 필드를 유지한다.
 */

/** 유저 */
export interface User {
  uid: string;
  email: string;
  nickname: string;
  created_at: string;
}

/** 헬스장 기본 정보 */
export interface Gym {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
  created_at: string;
}

/** 목록 표시용: 헬스장 + 대표 최저가 (1개월권 기준, 제보 없으면 null) */
export interface GymWithPrice extends Gym {
  lowest_price_1m: number | null;
}

/** 헬스장 가격 (크라우드소싱으로 유저가 등록) */
export interface GymPrice {
  id: string;
  gym_id: string;
  user_id: string;
  price_1m: number | null; // 1개월권
  price_3m: number | null; // 3개월권
  price_6m: number | null; // 6개월권
  price_12m: number | null; // 12개월권
  memo: string | null;
  created_at: string;
}

/** 내가 등록한 가격 항목 (가격 + 헬스장 이름) */
export interface MyPriceItem extends GymPrice {
  gym_name: string;
}

/** 가격 입력값 (기간별 가격 + 메모) — 등록/수정 공용 */
export type PriceValues = Pick<
  GymPrice,
  "price_1m" | "price_3m" | "price_6m" | "price_12m" | "memo"
>;

/**
 * 헬스장 부가 상세 정보
 */
export interface GymDetail {
  id: string;
  gym_id: string;
  equipment_brand: string | null; // 장비 브랜드
  cleanliness: number | null; // 청결도 (1~5 점)
  trainer_count: number | null; // 트레이너 수
  memo: string | null;
}

/** 부가정보 입력값 (수정 화면 공용) */
export type GymDetailValues = Pick<
  GymDetail,
  "equipment_brand" | "cleanliness" | "trainer_count" | "memo"
>;