// Supabase Edge Function: on-new-price
// gym_prices가 "관리자 승인(approved)" 상태로 바뀔 때 Database Webhook으로 호출되어,
// 두 종류의 원격 푸시를 보낸다.
//   1) 해당 헬스장 근처(내 동네)로 설정한 유저 — "내 동네 새 가격"
//   2) 해당 헬스장이 속한 지역을 관심 지역으로 등록한 유저 중, 이번 가격이
//      해당 라벨의 기존 승인된 최저가보다 낮을 때만 — "관심 지역 최저가"
//
// ⚠️ 핵심 정책: 관리자에게 승인되지 않은(pending/rejected) 가격은 절대 알림
// 대상이 되지 않는다. 그래서 INSERT가 아니라 "status가 approved로 바뀌는 UPDATE"
// 시점에만 동작하도록 만들었다 — pending 상태로 등록되는 순간에는 아무 알림도
// 나가지 않고, 관리자가 승인한 바로 그 순간에만 알림이 나간다.
//
// 배포:   supabase functions deploy on-new-price
// 연결:   Supabase Dashboard → Database → Webhooks
//         - Table: gym_prices, Events: UPDATE   ⚠️ INSERT가 아니라 UPDATE여야 한다!
//         - Type: Supabase Edge Function → on-new-price
//   (기존에 Events: INSERT로 연결돼 있었다면 반드시 UPDATE로 다시 연결해야
//    이 함수가 의도대로 동작한다 — INSERT로 두면 이 함수는 항상 스킵되어
//    승인 알림 자체가 전혀 나가지 않는다. 자세한 내용은 README.md 참고.)
//
// ⚠️ SERVICE_ROLE 키를 사용하므로 서버(Edge)에서만 실행된다.

import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

interface PriceRecord {
  id: string;
  gym_id: string;
  user_id: string;
  label: string;
  price: number;
  status: "pending" | "approved" | "rejected";
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  record: PriceRecord | null;
  // UPDATE 이벤트에서만 내려온다 (INSERT/DELETE에는 없음).
  old_record?: PriceRecord | null;
}

interface Gym {
  name: string;
  lat: number;
  lng: number;
  address: string | null;
}

interface PushMessage {
  to: string;
  title: string;
  body: string;
  sound: "default";
  // 알림을 탭했을 때 클라이언트가 해당 헬스장 상세로 바로 이동할 수 있도록 담아 보낸다.
  data: { gym_id: string };
}

// 알림 대상 반경 (km)
const NOTIFY_RADIUS_KM = 3;

// Expo 푸시 토큰 형식(예: "ExponentPushToken[xxxxxxxx]"). 형식이 다른 값을
// Expo Push API에 보내면 거부당하므로 미리 걸러 불필요한 호출을 줄인다.
const EXPO_PUSH_TOKEN_PATTERN = /^Expo(nent)?PushToken\[.+\]$/;

/** 두 좌표 사이 거리(km) — Haversine */
function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** approved로 새로 전환된(pending/rejected → approved) UPDATE 페이로드로 좁혀진 타입 */
interface ApprovalTransitionPayload {
  type: "UPDATE";
  record: PriceRecord;
  old_record: PriceRecord;
}

/** 이번 UPDATE가 "관리자 승인으로 새로 전환"된 경우인지 (pending/rejected → approved) */
function isApprovalTransition(
  payload: WebhookPayload
): payload is WebhookPayload & ApprovalTransitionPayload {
  return (
    payload.type === "UPDATE" &&
    payload.record !== null &&
    payload.old_record != null &&
    payload.old_record.status !== "approved" &&
    payload.record.status === "approved"
  );
}

/** 헬스장 근처(반경 NOTIFY_RADIUS_KM)로 내 동네를 설정한 유저 id 목록 */
async function findNearbyUserIds(
  supabase: SupabaseClient,
  gym: Gym,
  submitter: string
): Promise<string[]> {
  // 바운딩 박스로 1차 필터 후 Haversine 정확 반경으로 2차 필터
  const latDelta = NOTIFY_RADIUS_KM / 111;
  const lngDelta = NOTIFY_RADIUS_KM / (111 * Math.cos((gym.lat * Math.PI) / 180));
  const { data: users } = await supabase
    .from("users")
    .select("uid, home_lat, home_lng")
    .neq("uid", submitter)
    .not("home_lat", "is", null)
    .gte("home_lat", gym.lat - latDelta)
    .lte("home_lat", gym.lat + latDelta)
    .gte("home_lng", gym.lng - lngDelta)
    .lte("home_lng", gym.lng + lngDelta);

  return (users ?? [])
    .filter(
      (u: { home_lat: number; home_lng: number }) =>
        distanceKm(gym.lat, gym.lng, u.home_lat, u.home_lng) <= NOTIFY_RADIUS_KM
    )
    .map((u: { uid: string }) => u.uid);
}

/**
 * 이번에 승인된 가격이 해당 헬스장·라벨의 "다른" 승인된 가격들 중 최저가보다
 * 낮은(=새 최저가) 지 여부. 이번 건 자기 자신은 비교 대상에서 제외한다
 * (이미 status='approved'로 커밋된 뒤 호출되므로, 제외하지 않으면 항상 자기
 * 자신이 포함된 최소값과 비교하게 되어 부등호가 성립하지 않는다).
 */
async function isNewLowestPrice(
  supabase: SupabaseClient,
  record: PriceRecord
): Promise<boolean> {
  const { data: approved } = await supabase
    .from("gym_prices")
    .select("price")
    .eq("gym_id", record.gym_id)
    .eq("label", record.label)
    .eq("status", "approved")
    .neq("id", record.id);

  const currentMin = (approved ?? []).reduce(
    (min: number | null, row: { price: number }) =>
      min === null || row.price < min ? row.price : min,
    null
  );
  return currentMin === null || record.price < currentMin;
}

/** 헬스장 주소가 속한 관심 지역을 등록한 유저 id 목록 (주소 없으면 매칭 불가) */
async function findInterestRegionUserIds(
  supabase: SupabaseClient,
  gym: Gym,
  submitter: string
): Promise<string[]> {
  if (!gym.address) return [];

  const { data: interests } = await supabase
    .from("user_interest_regions")
    .select("user_id, sido, sigungu")
    .neq("user_id", submitter);

  const matched = (interests ?? []).filter(
    (r: { sido: string; sigungu: string }) =>
      gym.address!.includes(r.sido) && gym.address!.includes(r.sigungu)
  );
  return [...new Set(matched.map((r: { user_id: string }) => r.user_id))];
}

/** 대상 유저 id들의 기기 토큰으로 동일 내용 푸시 메시지를 만든다 (형식이 이상한 토큰은 제외) */
async function buildMessages(
  supabase: SupabaseClient,
  userIds: string[],
  title: string,
  body: string,
  gymId: string
): Promise<PushMessage[]> {
  if (userIds.length === 0) return [];
  const { data: tokenRows } = await supabase
    .from("push_tokens")
    .select("token")
    .in("user_id", userIds);

  return (tokenRows ?? [])
    .map((t: { token: string }) => t.token)
    .filter((token: string) => EXPO_PUSH_TOKEN_PATTERN.test(token))
    .map((token: string) => ({
      to: token,
      title,
      body,
      sound: "default" as const,
      data: { gym_id: gymId },
    }));
}

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    const payload: WebhookPayload = await req.json();

    // pending으로 등록되는 INSERT, 승인이 아닌 다른 UPDATE(거절/되돌리기 등),
    // DELETE는 전부 스킵한다 — 알림은 오직 "새로 승인된" 순간에만 나간다.
    if (!isApprovalTransition(payload)) {
      return json({ skipped: true });
    }
    const record = payload.record;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: gym } = await supabase
      .from("gyms")
      .select("name, lat, lng, address")
      .eq("id", record.gym_id)
      .maybeSingle();
    if (!gym) return json({ sent: 0 });

    const [nearbyUserIds, isNewLow] = await Promise.all([
      findNearbyUserIds(supabase, gym, record.user_id),
      isNewLowestPrice(supabase, record),
    ]);
    const interestUserIds = isNewLow
      ? await findInterestRegionUserIds(supabase, gym, record.user_id)
      : [];

    const [nearbyMessages, interestMessages] = await Promise.all([
      buildMessages(
        supabase,
        nearbyUserIds,
        "내 동네 새 가격",
        `${gym.name}에 새로운 가격이 등록됐어요!`,
        record.gym_id
      ),
      buildMessages(
        supabase,
        interestUserIds,
        "관심 지역 최저가",
        `${gym.name} ${record.label} 최저가가 ${record.price.toLocaleString()}원으로 갱신됐어요!`,
        record.gym_id
      ),
    ]);

    const messages = [...nearbyMessages, ...interestMessages];
    if (messages.length === 0) return json({ sent: 0 });

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });

    return json({
      sent: messages.length,
      nearby: nearbyMessages.length,
      interestRegion: interestMessages.length,
    });
  } catch (e) {
    // 서버 로그에는 전체 에러를 남기고(운영 추적용), 응답 바디에는 내부 구현
    // 세부사항(쿼리 오류 메시지 등)이 그대로 노출되지 않도록 일반화된 메시지만 담는다.
    console.error("[on-new-price] failed:", e);
    return json({ error: "internal error" }, 500);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
