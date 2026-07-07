// Supabase Edge Function: on-new-price
// gym_prices INSERT 시 Database Webhook 으로 호출되어,
// 해당 헬스장 근처(내 동네)로 설정한 유저들에게 원격 푸시를 보낸다.
//
// 배포:   supabase functions deploy on-new-price
// 연결:   Supabase Dashboard → Database → Webhooks
//         - Table: gym_prices, Events: INSERT
//         - Type: Supabase Edge Function → on-new-price
//
// ⚠️ SERVICE_ROLE 키를 사용하므로 서버(Edge)에서만 실행된다.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  record: { id: string; gym_id: string; user_id: string } | null;
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

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    const { type, record }: WebhookPayload = await req.json();
    if (type !== "INSERT" || !record) {
      return json({ skipped: true });
    }

    const { gym_id, user_id: submitter } = record;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 헬스장 위치·이름
    const { data: gym } = await supabase
      .from("gyms")
      .select("name, lat, lng")
      .eq("id", gym_id)
      .maybeSingle();
    if (!gym) return json({ sent: 0 });

    // 내 동네를 이 헬스장 근처로 설정한 유저를 바운딩 박스로 1차 필터
    const latDelta = NOTIFY_RADIUS_KM / 111;
    const lngDelta =
      NOTIFY_RADIUS_KM / (111 * Math.cos((gym.lat * Math.PI) / 180));
    const { data: users, error } = await supabase
      .from("users")
      .select("uid, home_lat, home_lng")
      .neq("uid", submitter)
      .not("home_lat", "is", null)
      .gte("home_lat", gym.lat - latDelta)
      .lte("home_lat", gym.lat + latDelta)
      .gte("home_lng", gym.lng - lngDelta)
      .lte("home_lng", gym.lng + lngDelta);
    if (error) return json({ error: error.message }, 500);

    // 정확한 반경으로 2차 필터
    const nearbyUserIds = (users ?? [])
      .filter(
        (u: { home_lat: number; home_lng: number }) =>
          distanceKm(gym.lat, gym.lng, u.home_lat, u.home_lng) <=
          NOTIFY_RADIUS_KM
      )
      .map((u: { uid: string }) => u.uid);
    if (nearbyUserIds.length === 0) return json({ sent: 0 });

    // 대상 유저들의 기기 토큰
    const { data: tokenRows } = await supabase
      .from("push_tokens")
      .select("token")
      .in("user_id", nearbyUserIds);

    const messages = (tokenRows ?? []).map((t: { token: string }) => ({
      to: t.token,
      title: "내 동네 새 가격",
      body: `${gym.name}에 새로운 가격이 등록됐어요!`,
      sound: "default",
    }));
    if (messages.length === 0) return json({ sent: 0 });

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });

    return json({ sent: messages.length });
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
