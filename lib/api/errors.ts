/**
 * Supabase/Postgres 에러를 사용자에게 보여줄 한국어 메시지로 변환하는 공용 헬퍼.
 * - 등록/수정류 API는 대부분 "정지된 계정은 안 된다"는 RLS 정책으로 막혀 있어,
 *   그 경우 Postgres가 내려주는 기술적인 문구("new row violates row-level
 *   security policy ...")를 그대로 보여주지 않고 이해할 수 있는 안내로 바꾼다.
 * - 호출부에서 미리 is_suspended를 확인해 이 상황 자체를 예방하는 게 우선이지만,
 *   (User 정보가 아직 없거나 서버 상태가 막 바뀐 경우 등) 혹시 그 체크를 통과해
 *   실제로 RLS에서 막히는 경우를 위한 최후 방어선이다.
 */
export function toFriendlyErrorMessage(e: unknown, fallback: string): string {
  const message = e instanceof Error ? e.message : fallback;
  if (/row-level security/i.test(message)) {
    return "이 작업을 수행할 권한이 없습니다. 계정이 정지된 경우 등록/수정이 제한됩니다.";
  }
  return message;
}
