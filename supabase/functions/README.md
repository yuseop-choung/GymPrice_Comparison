# Supabase Edge Functions

원격 푸시 발송용 서버 함수. Expo Push API로 알림을 보낸다.

## 함수

- **send-push** — 특정 유저에게 임의 알림 발송. `POST { user_id, title, body }`
- **on-new-price** — `gym_prices` INSERT 시 호출되어, 해당 헬스장 **근처(내 동네)로
  설정한 유저들**에게 "내 동네 새 가격" 알림을 보낸다. (Database Webhook로 연결)

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

1. [schema.sql](../schema.sql) 실행 (`push_tokens` 테이블 포함)
2. 앱에서 로그인 시 `push_tokens`에 기기 토큰이 저장되어 있어야 함
   (EAS `projectId` 설정 필요 — `app.json`의 `expo.extra.eas.projectId`)

## 타겟팅

`users.home_lat/home_lng`(앱에서 홈 진입 시 저장되는 내 동네)를 기준으로,
새 가격이 등록된 헬스장 반경 3km 안의 유저에게 발송한다.
- 바운딩 박스로 1차 필터 후 Haversine 정확 반경으로 2차 필터
- 헬스장 많아지면 PostGIS/`earthdistance`로 최적화 여지
