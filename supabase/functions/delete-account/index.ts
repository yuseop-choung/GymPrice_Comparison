// Supabase Edge Function: delete-account
// 로그인한 "본인" 계정을 완전히 삭제한다(회원 탈퇴).
//
// auth.users에서 삭제하면 public.users(uid, on delete cascade)도 함께 사라지고,
// 그에 딸린 개인 데이터(push_tokens/app_events/user_interest_regions/
// gym_price_views)도 전부 cascade로 삭제된다. 반면 이미 등록한 gym_prices는
// 다른 이용자를 위해 남기되 작성자 연결만 끊는다(user_id -> null, schema.sql의
// on delete set null 참고) — 계정을 지운다고 커뮤니티 가격 비교 데이터까지
// 사라지면 안 되기 때문이다.
//
// 배포:   supabase functions deploy delete-account
// 호출 예: POST /functions/v1/delete-account
//         Headers: Authorization: Bearer <본인 계정 access token>
//
// ⚠️ auth.users 삭제(auth.admin.deleteUser)는 SERVICE_ROLE 권한이 있어야만
//    가능해 클라이언트에서 직접 호출할 수 없다 — 그래서 이 함수가 필요하다.
// ⚠️ SERVICE_ROLE 키를 사용하므로 서버(Edge)에서만 실행된다. 클라이언트에 노출 금지.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * 호출자의 Authorization 헤더(로그인 유저의 access token)를 검증해 uid를 확인한다.
 * - ANON_KEY로 getUser()를 호출해 토큰 자체의 서명/만료를 검증한다(단순히 anon
 *   key 자체를 보낸 경우는 특정 유저로 인증되지 않으므로 여기서 걸러진다).
 * - 요청 바디로 uid를 받지 않는다 — 오직 이 토큰에서 확인된 본인 계정만 지운다.
 */
async function requireCaller(
  req: Request
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

  return { ok: true, uid: userData.user.id };
}

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    const auth = await requireCaller(req);
    if (!auth.ok) {
      return json({ error: auth.error }, auth.status);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error } = await supabase.auth.admin.deleteUser(auth.uid);
    if (error) {
      console.error("[delete-account] failed:", error);
      return json({ error: "계정 삭제에 실패했습니다." }, 500);
    }

    return json({ deleted: true });
  } catch (e) {
    console.error("[delete-account] failed:", e);
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
