/**
 * 앱 전역 설정 상수
 * - 카카오맵 키 등 환경값과 도메인 설정값을 모은다. (CLAUDE.md 규칙)
 */

/** 내 주변 헬스장 검색 기본 반경 (km) */
export const SEARCH_RADIUS_KM = 3;

/** 위치 권한 거부/실패 시 사용할 폴백 좌표 (서울 시청) */
export const DEFAULT_COORDS = {
  lat: 37.5665,
  lng: 126.978,
} as const;

/**
 * 목(mock) 데이터 모드 여부
 * - true 면 실제 Supabase 대신 더미 데이터로 동작한다 (백엔드 없이 흐름 확인용).
 * - .env 의 EXPO_PUBLIC_USE_MOCK=true 로 켠다.
 */
export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === "true";

/**
 * 카카오맵 JavaScript 키 (.env: EXPO_PUBLIC_KAKAO_JS_KEY)
 * - 없으면 홈에서 지도 대신 안내 문구가 표시된다.
 */
export const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY ?? "";
