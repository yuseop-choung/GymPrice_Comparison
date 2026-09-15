// Supabase Edge Function: send-push
// 특정 유저의 모든 기기로 임의의 원격 푸시를 발송한다 (Expo Push API 사용).
// 누구에게나 임의의 제목/본문으로 알림을 보낼 수 있는 강력한 기능이므로,
// 반드시 "로그인된 관리자"만 호출할 수 있도록 서버(이 함수) 안에서 직접
// 검증한다 — 호출자가 관리자라고 주장하는 것을 그대로 믿지 않는다.
//
// 배포:   supabase functions deploy send-push
// 호출 예: POST /functions/v1/send-push
//         Headers: Authorization: Bearer <관리자 계정의 access token>
//         Body:    { "user_id": "<uuid>", "title": "...", "body": "..." }
//
// ⚠️ SERVICE_ROLE 키를 사용하므로 서버(Edge)에서만 실행된다. 클라이언트에 노출 금지.

import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

interface SendPushPayload {
  user_id?: unknown;
  title?: unknown;
  body?: unknown;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EXPO_PUSH_TOKEN_PATTERN = /^Expo(nent)?PushToken\[.+\]$/;
const MAX_TITLE_LENGTH = 100;
const MAX_BODY_LENGTH = 500;

/** 요청 바디를 검증하고, 문제 있으면 사용자에게 보여줄 에러 메시지를 반환한다 */
function validatePayload(
  payload: SendPushPayload
): { user_id: string; title: string; body: string } | { error: string } {
  const { user_id, title, body } = payload;
  if (typeof user_id !== "string" || !UUID_PATTERN.test(user_id)) {
    return { error: "user_id가 올바른 UUID 형식이 아닙니다." };
  }
  if (typeof title !== "string" || title.trim() === "") {
    return { error: "title은 비어있지 않은 문자열이어야 합니다." };
  }
  if (typeof body !== "string" || body.trim() === "") {
    return { error: "body는 비어있지 않은 문자열이어야 합니다." };
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return { error: `title은 ${MAX_TITLE_LENGTH}자를 넘을 수 없습니다.` };
  }
  if (body.length > MAX_BODY_LENGTH) {
    return { error: `body는 ${MAX_BODY_LENGTH}자를 넘을 수 없습니다.` };
  }
  return { user_id, title, body };
}

/**
 * 호출자의 Authorization 헤더(로그인 유저의 access token)를 검증하고,
 * 그 유저가 관리자(is_admin=true)인지 확인한다. 관리자가 아니면 null.
 * - ANON_KEY로 getUser()를 호출해 토큰 자체의 서명/만료를 검증한다(단순히
 *   anon key 자체를 보낸 경우는 특정 유저로 인증되지 않으므로 여기서 걸러진다).
 * - is_admin 조회는 SERVICE_ROLE 클라이언트로 해서 RLS와 무관하게 확정적으로 확인한다.
 */
async function requireAdminCaller(
  req: Request,
  serviceClient: SupabaseClient
): Promise<{ ok: true; uid: string } | { ok: false; status: number; error: string }> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return { ok: false, status: 401, error: "인증 토큰이 필요합니다." };
  }

  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );
  const { data: userData, error: userError } = await anonClient.auth.getUser(token);
  if (userError || !userData.user) {
    return { ok: false, status: 401, error: "유효하지 않은 로그인 세션입니다." };
  }

  const { data: profile, error: profileError } = await serviceClient
    .from("users")
    .select("is_admin, is_suspended")
    .eq("uid", userData.user.id)
    .maybeSingle();
  if (profileError || !profile) {
    return { ok: false, status: 403, error: "권한을 확인할 수 없습니다." };
  }
  if (!profile.is_admin || profile.is_suspended) {
    return { ok: false, status: 403, error: "관리자만 사용할 수 있는 기능입니다." };
  }

  return { ok: true, uid: userData.user.id };
}

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const auth = await requireAdminCaller(req, supabase);
    if (!auth.ok) {
      return json({ error: auth.error }, auth.status);
    }

    const validated = validatePayload(await req.json());
    if ("error" in validated) {
      return json({ error: validated.error }, 400);
    }
    const { user_id, title, body } = validated;

    // 대상 유저의 모든 기기 토큰 조회
    const { data: tokens, error } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("user_id", user_id);
    if (error) {
      console.error("[send-push] failed to load tokens:", error);
      return json({ error: "기기 토큰을 조회하지 못했습니다." }, 500);
    }

    const messages = (tokens ?? [])
      .map((t: { token: string }) => t.token)
      .filter((token: string) => EXPO_PUSH_TOKEN_PATTERN.test(token))
      .map((token: string) => ({ to: token, title, body, sound: "default" }));
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
    if (!res.ok) {
      console.error("[send-push] Expo push API responded with", res.status);
      return json({ error: "푸시 발송 서비스 호출에 실패했습니다." }, 502);
    }

    return json({ sent: messages.length });
  } catch (e) {
    console.error("[send-push] failed:", e);
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
