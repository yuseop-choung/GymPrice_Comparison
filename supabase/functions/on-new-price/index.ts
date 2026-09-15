// Supabase Edge Function: on-new-price
// gym_prices INSERT 시 Database Webhook 으로 호출되어, 두 종류의 원격 푸시를 보낸다.
//   1) 해당 헬스장 근처(내 동네)로 설정한 유저 — "내 동네 새 가격"
//   2) 해당 헬스장이 속한 지역을 관심 지역으로 등록한 유저 중, 이번 가격이
//      해당 라벨의 기존 승인된 최저가보다 낮을 때만 — "관심 지역 최저가"
//
// 배포:   supabase functions deploy on-new-price
// 연결:   Supabase Dashboard → Database → Webhooks
//         - Table: gym_prices, Events: INSERT
//         - Type: Supabase Edge Function → on-new-price
//
// ⚠️ SERVICE_ROLE 키를 사용하므로 서버(Edge)에서만 실행된다.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface NewPriceRecord {
  id: string;
  gym_id: string;
  user_id: string;
  label: string;
  price: number;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  record: NewPriceRecord | null;
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
}

// 알림 대상 반경 (km)
const NOTIFY_RADIUS_KM = 3;

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

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

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

/** 이번 가격이 해당 헬스장·라벨의 기존 승인된 가격 중 최저가보다 낮은(=새 최저가) 지 여부 */
async function isNewLowestPrice(
  supabase: SupabaseClient,
  record: NewPriceRecord
): Promise<boolean> {
  const { data: approved } = await supabase
    .from("gym_prices")
    .select("price")
    .eq("gym_id", record.gym_id)
    .eq("label", record.label)
    .eq("status", "approved");

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

/** 대상 유저 id들의 기기 토큰으로 동일 내용 푸시 메시지를 만든다 */
async function buildMessages(
  supabase: SupabaseClient,
  userIds: string[],
  title: string,
  body: string
): Promise<PushMessage[]> {
  if (userIds.length === 0) return [];
  const { data: tokenRows } = await supabase
    .from("push_tokens")
    .select("token")
    .in("user_id", userIds);

  return (tokenRows ?? []).map((t: { token: string }) => ({
    to: t.token,
    title,
    body,
    sound: "default" as const,
  }));
}

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    const { type, record }: WebhookPayload = await req.json();
    if (type !== "INSERT" || !record) {
      return json({ skipped: true });
    }

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
        `${gym.name}에 새로운 가격이 등록됐어요!`
      ),
      buildMessages(
        supabase,
        interestUserIds,
        "관심 지역 최저가",
        `${gym.name} ${record.label} 최저가가 ${record.price.toLocaleString()}원으로 갱신됐어요!`
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
    const message = e instanceof Error ? e.message : "unknown error";
    return json({ error: message }, 500);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
