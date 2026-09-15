import type { MapBounds } from "./components/kakaoMapHtml";

/**
 * 헬스장 관련 유틸
 */

/** 좌표가 지도에 현재 보이는 영역(뷰포트) 안에 있는지 — 홈 화면의 "지도 안 헬스장만 목록에" 필터링용 */
export function isWithinBounds(
  coords: { lat: number; lng: number },
  bounds: MapBounds
): boolean {
  return (
    coords.lat >= bounds.swLat &&
    coords.lat <= bounds.neLat &&
    coords.lng >= bounds.swLng &&
    coords.lng <= bounds.neLng
  );
}

/** 거리(km)를 표시용 문자열로 변환 (1km 미만은 m 단위) */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

/** 두 좌표 사이 거리(km) — Haversine 공식 */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const R = 6371; // 지구 반지름(km)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
