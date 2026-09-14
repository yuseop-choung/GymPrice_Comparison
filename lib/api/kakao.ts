import { KAKAO_REST_KEY } from "../../constants/config";

/**
 * 카카오 로컬(장소 검색) API 연동
 * - 모든 외부 API 호출은 이 파일을 통한다. (CLAUDE.md 규칙)
 * - 헬스장 등록 시 주소를 직접 입력하는 대신, 실제 장소를 검색해 정확한 위경도를
 *   얻기 위해 사용한다(사용자가 위경도를 임의로 조작하는 것을 막는다).
 */

/** 카카오 키워드 장소 검색 결과 1건 (앱에서 쓰는 형태로 변환됨) */
export interface KakaoPlace {
  id: string;
  name: string; // place_name
  address: string; // road_address_name 우선, 없으면 address_name
  lat: number; // y
  lng: number; // x
  distanceM: number | null; // 검색 기준 좌표로부터 거리(m). 좌표 없이 검색 시 null.
}

/** 카카오 키워드 검색 API 응답 문서 1건 */
interface KakaoKeywordDocument {
  id: string;
  place_name: string;
  category_name: string; // 예: "스포츠,레저 > 스포츠시설 > 헬스클럽", "교통,수송 > 주차장"
  address_name: string;
  road_address_name: string;
  x: string; // 경도(lng), 문자열로 내려옴
  y: string; // 위도(lat), 문자열로 내려옴
  distance: string; // 미터, 값 없으면 빈 문자열
}

interface KakaoKeywordResponse {
  documents: KakaoKeywordDocument[];
}

/**
 * 헬스장 검색과 무관한 결과(건물 부속 주차장/출입구/지하철역 등)를 걸러내기 위한
 * 제외 키워드. place_name 또는 category_name에 포함되면 검색 결과에서 뺀다.
 * - 카카오 로컬 API엔 "헬스장"만 콕 집는 카테고리 코드가 없어, 키워드 검색 결과에
 *   같은 건물의 부속 시설 POI가 섞여 나오는 걸 이 방식으로 걸러낸다.
 */
const IRRELEVANT_KEYWORDS = [
  "주차장",
  "출입구",
  "지하철역",
  "정류장",
  "화장실",
  "엘리베이터",
  "교통,수송", // 카카오 category_name 대분류 — 주차장/역/정류장 등이 여기 속함
];

/** 시설 부속 POI(주차장, 출입구 등)로 보여 검색 결과에서 제외해야 하는지 판단 */
export function isIrrelevantPlace(doc: KakaoKeywordDocument): boolean {
  const text = `${doc.place_name} ${doc.category_name}`;
  return IRRELEVANT_KEYWORDS.some((keyword) => text.includes(keyword));
}

/** API 응답 문서를 앱에서 쓰는 형태(KakaoPlace)로 변환한다 */
export function toKakaoPlace(doc: KakaoKeywordDocument): KakaoPlace {
  return {
    id: doc.id,
    name: doc.place_name,
    address: doc.road_address_name || doc.address_name,
    lat: Number(doc.y),
    lng: Number(doc.x),
    distanceM: doc.distance ? Number(doc.distance) : null,
  };
}

/**
 * 키워드로 장소(헬스장 등)를 검색한다 — 기준 좌표에서 가까운 순으로 정렬.
 * - REST 키가 없거나 검색어가 비어있으면 빈 배열을 반환한다(직접 입력으로 폴백 가능하도록).
 */
export async function searchPlaces(
  query: string,
  coords: { lat: number; lng: number }
): Promise<KakaoPlace[]> {
  if (!KAKAO_REST_KEY || query.trim() === "") return [];

  const params = new URLSearchParams({
    query: query.trim(),
    x: String(coords.lng),
    y: String(coords.lat),
    radius: "20000", // 최대 20km 반경
    sort: "distance",
    size: "15",
  });

  const response = await fetch(
    `https://dapi.kakao.com/v2/local/search/keyword.json?${params.toString()}`,
    { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } }
  );

  if (!response.ok) {
    throw new Error("장소 검색에 실패했습니다.");
  }

  const data: KakaoKeywordResponse = await response.json();
  return data.documents.filter((doc) => !isIrrelevantPlace(doc)).map(toKakaoPlace);
}
