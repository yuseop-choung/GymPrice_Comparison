# Supabase Edge Functions

원격 푸시 발송용 서버 함수. Expo Push API로 알림을 보낸다.

## 함수

- **send-push** — 특정 유저에게 임의 알림 발송. `POST { user_id, title, body }`
  (⚠️ **관리자 전용** — `Authorization: Bearer <관리자 계정 access token>` 필요.
  일반 유저나 anon key로 호출하면 401/403으로 거부된다.)
- **on-new-price** — `gym_prices`가 **관리자 승인(approved)으로 바뀔 때** 호출되어
  두 종류의 알림을 보낸다. (Database Webhook로 연결)
  1. 해당 헬스장 **근처(내 동네)로 설정한 유저들**에게 "내 동네 새 가격"
  2. 이번 가격이 해당 라벨의 **다른 승인된 가격 중 최저가보다 낮을 때만**, 해당
     헬스장이 속한 지역을 **관심 지역으로 등록한 유저들**에게 "관심 지역 최저가"

  ⚠️ **핵심 정책**: pending/rejected 상태인 가격은 절대 알림 대상이 되지 않는다.
  그래서 이 함수는 `gym_prices` **INSERT가 아니라 UPDATE**(그중에서도 상태가
  approved로 새로 바뀌는 경우)에만 반응하도록 설계돼 있다. 아래 "트리거 연결"의
  Events 설정을 **반드시 UPDATE로** 맞춰야 한다.

  각 알림에는 `data: { gym_id }`가 담겨 있어, 앱에서 알림을 탭하면
  (`useNotificationNavigation`) 해당 헬스장 상세 화면으로 바로 이동한다.

## 배포

```bash
supabase functions deploy send-push
supabase functions deploy on-new-price
```

`SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` 는 Edge
런타임에 자동 주입된다.

## 트리거 연결 (on-new-price)

Supabase Dashboard → **Database → Webhooks → Create**

- Table: `gym_prices`
- Events: **`UPDATE`** (⚠️ `INSERT`가 아니다 — INSERT로 연결하면 이 함수는
  항상 스킵되어 승인 알림이 전혀 나가지 않는다)
- Type: **Supabase Edge Function** → `on-new-price`

Webhook이 `{ type, record, old_record }` 페이로드를 함수로 전달한다
(`old_record`는 UPDATE 이벤트에만 포함된다 — 승인 전환 여부를 판단하는 데 쓰인다).

> 기존에 Events: INSERT로 연결해둔 프로젝트가 있다면, 이 변경 사항을 배포한 뒤
> Dashboard에서 기존 웹훅을 **UPDATE로 다시 설정**해야 한다. 이건 코드로 자동
> 반영되지 않는 대시보드 설정이라 반드시 수동으로 바꿔야 한다.

## 사전 조건

1. [schema.sql](../schema.sql) 실행 (`push_tokens`, `user_interest_regions` 테이블 포함)
2. 앱에서 로그인 시 `push_tokens`에 기기 토큰이 저장되어 있어야 함
   (EAS `projectId` 설정 필요 — `app.json`의 `expo.extra.eas.projectId`)
3. `on-new-price`의 Database Webhook Events가 `UPDATE`로 설정되어 있어야 함
   (위 "트리거 연결" 참고 — 기본값은 아니므로 직접 설정해야 한다)

## 타겟팅

**내 동네 새 가격**: `users.home_lat/home_lng`(앱에서 홈 진입 시 저장되는 내 동네)를
기준으로, 승인된 헬스장 반경 3km 안의 유저에게 발송한다.
- 바운딩 박스로 1차 필터 후 Haversine 정확 반경으로 2차 필터
- 헬스장 많아지면 PostGIS/`earthdistance`로 최적화 여지

**관심 지역 최저가**: `user_interest_regions`(시/도 + 시/군/구, 유저당 최대 5개)에
등록된 지역 문자열이 헬스장 `address`에 포함되는지로 매칭한다(단순 문자열 포함
검사 — 주소가 없는 헬스장은 매칭 대상에서 제외됨). 이번에 승인된 가격이 같은
헬스장·같은 라벨의 **다른** 승인된 가격 중 최저가보다 낮을 때만 보낸다(자기 자신은
비교 대상에서 제외).

## send-push 보안

이 함수는 임의의 유저에게 임의의 제목/본문으로 푸시를 보낼 수 있는 강력한 기능이라,
호출자가 실제로 로그인된 **관리자**인지 함수 내부에서 직접 검증한다:

1. `Authorization: Bearer <token>` 헤더의 토큰을 `ANON_KEY` 클라이언트의
   `auth.getUser()`로 검증해 실제 로그인 세션인지 확인한다(anon key 자체를
   보내는 것만으로는 통과하지 못한다).
2. 그 유저의 `public.users.is_admin`을 SERVICE_ROLE 클라이언트로 조회해
   관리자이면서 정지 상태가 아닌지 확인한다.
3. `user_id`(UUID 형식), `title`/`body`(길이 제한 있는 비어있지 않은 문자열)를
   검증하고, Expo 푸시 토큰 형식이 아닌 값은 발송 대상에서 제외한다.

이 검증을 통과하지 못하면 401/403을 반환하고 아무 알림도 보내지 않는다.
