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
  address: string | null; // 선택 입력 (검색으로 등록하면 자동으로 채워짐)
  lat: number;
  lng: number;
  phone: string | null;
  created_at: string;
}

/** 목록 표시용: 헬스장 + 대표 최저가 (1개월권 기준, 제보 없으면 null) */
export interface GymWithPrice extends Gym {
  lowest_price_1m: number | null;
}

/** 가격 심사 상태 — 관리자가 승인(approved)한 가격만 다른 유저에게 공개 노출된다 */
export type PriceStatus = "pending" | "approved" | "rejected";

/**
 * 헬스장 가격 항목 (크라우드소싱으로 유저가 등록)
 * - 기간권(1/3/6/12개월)뿐 아니라 PT 횟수권 등도 등록할 수 있도록, 고정된
 *   기간 컬럼 대신 자유 라벨(label) + 가격(price) 1건 = 1행 구조로 되어 있다.
 * - 한 번의 등록 화면에서 여러 항목(예: 1개월 + PT 10회)을 등록하면, 각각
 *   별도의 행으로 저장된다.
 */
export interface GymPrice {
  id: string;
  gym_id: string;
  user_id: string;
  label: string; // 예: "1개월", "3개월", "PT 10회"
  price: number;
  memo: string | null;
  status: PriceStatus;
  created_at: string;
}

/** 내가 등록한 가격 항목 (가격 + 헬스장 이름) */
export interface MyPriceItem extends GymPrice {
  gym_name: string;
}

/** 가격 항목 입력값 (등록/수정 공용) */
export type PriceValues = Pick<GymPrice, "label" | "price" | "memo">;

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