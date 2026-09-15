# Supabase Edge Functions

원격 푸시 발송용 서버 함수. Expo Push API로 알림을 보낸다.

## 함수

- **send-push** — 특정 유저에게 임의 알림 발송. `POST { user_id, title, body }`
- **on-new-price** — `gym_prices` INSERT 시 호출되어 두 종류의 알림을 보낸다.
  (Database Webhook로 연결)
  1. 해당 헬스장 **근처(내 동네)로 설정한 유저들**에게 "내 동네 새 가격"
  2. 이번 가격이 해당 라벨의 **기존 승인된 최저가보다 낮을 때만**, 해당
     헬스장이 속한 지역을 **관심 지역으로 등록한 유저들**에게 "관심 지역 최저가"

## 배포

```bash
supabase functions deploy send-push
supabase functions deploy on-new-price
```

`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` 는 Edge 런타임에 자동 주입된다.

## 트리거 연결 (on-new-price)

Supabase Dashboard → **Database → Webhooks → Create**

- Table: `gym_prices`
- Events: `INSERT`
- Type: **Supabase Edge Function** → `on-new-price`

Webhook이 `{ type, record }` 페이로드를 함수로 전달한다.

## 사전 조건

1. [schema.sql](../schema.sql) 실행 (`push_tokens`, `user_interest_regions` 테이블 포함)
2. 앱에서 로그인 시 `push_tokens`에 기기 토큰이 저장되어 있어야 함
   (EAS `projectId` 설정 필요 — `app.json`의 `expo.extra.eas.projectId`)

## 타겟팅

**내 동네 새 가격**: `users.home_lat/home_lng`(앱에서 홈 진입 시 저장되는 내 동네)를
기준으로, 새 가격이 등록된 헬스장 반경 3km 안의 유저에게 발송한다.
- 바운딩 박스로 1차 필터 후 Haversine 정확 반경으로 2차 필터
- 헬스장 많아지면 PostGIS/`earthdistance`로 최적화 여지

**관심 지역 최저가**: `user_interest_regions`(시/도 + 시/군/구, 유저당 최대 5개)에
등록된 지역 문자열이 헬스장 `address`에 포함되는지로 매칭한다(단순 문자열 포함
검사 — 주소가 없는 헬스장은 매칭 대상에서 제외됨). 이번에 등록된 가격이 같은
헬스장·같은 라벨의 기존 **승인된(approved)** 가격 중 최저가보다 낮을 때만 보낸다
(등록 즉시 판단하므로, 아직 심사 대기 중인 가격이 나중에 거절되더라도 알림 자체는
이미 발송된 상태일 수 있다 — 근처 알림과 동일한 방식).
