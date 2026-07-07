// Supabase Edge Function: send-push
// 특정 유저의 모든 기기로 원격 푸시를 발송한다 (Expo Push API 사용).
//
// 배포:   supabase functions deploy send-push
// 호출 예: POST /functions/v1/send-push  { "user_id": "<uuid>", "title": "...", "body": "..." }
//
// ⚠️ SERVICE_ROLE 키를 사용하므로 서버(Edge)에서만 실행된다. 클라이언트에 노출 금지.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface SendPushPayload {
  user_id: string;
  title: string;
  body: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    const { user_id, title, body }: SendPushPayload = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 대상 유저의 모든 기기 토큰 조회
    const { data: tokens, error } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("user_id", user_id);
    if (error) {
      return json({ error: error.message }, 500);
    }

    const messages = (tokens ?? []).map((t: { token: string }) => ({
      to: t.token,
      title,
      body,
      sound: "default",
    }));
    if (messages.length === 0) {
      return json({ sent: 0 });
    }

    // Expo Push API로 발송
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });
    const result = await res.json();

    return json({ sent: messages.length, result });
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
