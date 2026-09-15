-- ============================================================
-- GymPrice 스키마 + RLS + 프로필 자동 생성 트리거
-- Supabase SQL Editor에 전체 붙여넣어 1회 실행한다.
-- ============================================================

-- ----------------------------------------------------------------
-- 1) 테이블
-- ----------------------------------------------------------------
create table if not exists public.users (
  uid        uuid        primary key references auth.users(id) on delete cascade,
  email      text        not null,
  nickname   text        not null,
  home_lat   double precision, -- 내 동네 위도 (위치기반 알림용)
  home_lng   double precision, -- 내 동네 경도
  created_at timestamptz not null default now()
);

-- 이미 만들어진 users 테이블에도 컬럼 추가
alter table public.users add column if not exists home_lat double precision;
alter table public.users add column if not exists home_lng double precision;
-- 관리자 여부 (가격 심사 등 관리자 전용 기능에 사용). 앱에는 관리자 지정 UI가 없으므로
-- 최초 관리자는 SQL Editor에서 직접 켜야 한다:
--   update public.users set is_admin = true where email = '본인 이메일';
alter table public.users add column if not exists is_admin boolean not null default false;

create table if not exists public.gyms (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  address    text        not null,
  lat        double precision not null,
  lng        double precision not null,
  phone      text,
  created_at timestamptz not null default now()
);

create table if not exists public.gym_prices (
  id         uuid        primary key default gen_random_uuid(),
  gym_id     uuid        not null references public.gyms(id) on delete cascade,
  user_id    uuid        not null references public.users(uid) on delete cascade,
  price_1m   integer,
  price_3m   integer,
  price_6m   integer,
  price_12m  integer,
  memo       text,
  created_at timestamptz not null default now()
);

-- 가격 값 범위 검증 (음수/0/비정상적으로 큰 값 차단, features/price/utils.ts의
-- PRICE_RANGE와 동일한 값을 유지한다). 이미 만들어진 테이블에도 적용.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gym_prices_price_range'
  ) then
    alter table public.gym_prices
      add constraint gym_prices_price_range check (
        (price_1m  is null or price_1m  between 1000 and 5000000) and
        (price_3m  is null or price_3m  between 1000 and 15000000) and
        (price_6m  is null or price_6m  between 1000 and 30000000) and
        (price_12m is null or price_12m between 1000 and 60000000)
      );
  end if;
end $$;

-- 가격 심사 상태 (크라우드소싱 특성상 허위/장난 가격을 걸러내기 위해
-- 관리자가 승인(approved)한 가격만 클라이언트에 공개 노출한다). 이미 만들어진 테이블에도 적용.
alter table public.gym_prices add column if not exists status text not null default 'pending';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gym_prices_status_check'
  ) then
    alter table public.gym_prices
      add constraint gym_prices_status_check check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create table if not exists public.gym_details (
  id              uuid        primary key default gen_random_uuid(),
  gym_id          uuid        not null unique references public.gyms(id) on delete cascade,
  equipment_brand text,
  cleanliness     integer,
  trainer_count   integer,
  memo            text
);

-- 한 헬스장당 부가정보 1건 보장 (이미 만들어진 테이블에도 적용)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gym_details_gym_id_key'
  ) then
    alter table public.gym_details
      add constraint gym_details_gym_id_key unique (gym_id);
  end if;
end $$;

-- 푸시 토큰 (원격 푸시 발송 대상). 한 유저가 여러 기기 토큰을 가질 수 있음.
create table if not exists public.push_tokens (
  token      text        primary key,
  user_id    uuid        not null references public.users(uid) on delete cascade,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- 2) RLS 활성화
-- ----------------------------------------------------------------
alter table public.users       enable row level security;
alter table public.gyms        enable row level security;
alter table public.gym_prices  enable row level security;
alter table public.gym_details enable row level security;
alter table public.push_tokens enable row level security;

-- 호출한 유저가 관리자인지 확인하는 헬퍼.
-- (자기 자신의 uid로만 조회하므로 users_select_self 정책 범위 안에서 안전하게 동작한다.)
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((select is_admin from public.users where uid = auth.uid()), false);
$$;

-- ----------------------------------------------------------------
-- 3) 정책
--   SELECT : 누구나 (단, users는 본인만) / INSERT : 로그인 유저 / UPDATE·DELETE : 본인 데이터만
-- ----------------------------------------------------------------
-- users
-- ⚠️ email/home_lat/home_lng(위치기반 알림용 좌표)가 담겨 있어 본인만 조회 가능해야 한다.
--    (과거 users_select_all(누구나 조회)는 개인정보 노출 위험이 있어 제거했다.)
drop policy if exists "users_select_all" on public.users;
create policy "users_select_self" on public.users for select to authenticated
  using (auth.uid() = uid);
-- 관리자는 가격 심사 화면에서 제보자 닉네임을 봐야 하므로 전체 조회를 허용한다
-- (is_admin=true인 계정만 해당 — 일반 유저는 여전히 본인만 조회 가능).
create policy "users_select_admin" on public.users for select to authenticated
  using (public.is_admin());
create policy "users_update_self" on public.users for update to authenticated
  using (auth.uid() = uid) with check (auth.uid() = uid);
create policy "users_delete_self" on public.users for delete to authenticated
  using (auth.uid() = uid);
-- (INSERT는 아래 트리거가 SECURITY DEFINER로 처리하므로 정책 불필요)
-- (on-new-price 등 Edge Function은 SERVICE_ROLE 키로 동작해 RLS를 우회하므로 영향 없음)

-- gyms (작성자 컬럼이 없어 일반 유저 수정/삭제는 미제공 → RLS로 자동 차단)
create policy "gyms_select_all"  on public.gyms for select using (true);
create policy "gyms_insert_auth" on public.gyms for insert to authenticated with check (true);

-- gym_prices
-- SELECT: 승인(approved)된 가격은 누구나, 본인 가격은 심사 상태와 무관하게 본인만,
--         관리자는 전부(심사용) 조회 가능.
drop policy if exists "gym_prices_select_all" on public.gym_prices;
create policy "gym_prices_select_approved_or_own_or_admin" on public.gym_prices
  for select
  using (
    status = 'approved'
    or auth.uid() = user_id
    or public.is_admin()
  );

-- INSERT: 본인 명의로만 등록 가능 (컬럼 권한으로 status는 직접 못 넣게 막아 항상
-- 기본값 'pending'으로 시작하게 한다 — 아래 grant insert 참고)
create policy "gym_prices_insert_auth"  on public.gym_prices for insert to authenticated
  with check (auth.uid() = user_id);

-- UPDATE: 본인 또는 관리자만. "본인은 가격만/관리자는 status만" 세부 규칙은
-- 아래 enforce_gym_price_update_rules 트리거가 강제한다.
drop policy if exists "gym_prices_update_owner" on public.gym_prices;
create policy "gym_prices_update_owner_or_admin" on public.gym_prices for update to authenticated
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "gym_prices_delete_owner" on public.gym_prices for delete to authenticated
  using (auth.uid() = user_id);

-- ⚠️ RLS의 update/insert 정책은 "이 행이 내 것인가"만 검사할 뿐, 요청으로 gym_id/user_id를
-- 다른 값으로 바꾸거나 status를 직접 'approved'로 넣는 것까지는 막지 못한다. 컬럼 단위
-- 권한으로 gym_id/user_id는 애초에 수정 대상에서 제외하고, status는 INSERT 시 지정할 수
-- 없게(항상 DB 기본값 'pending') 막는다.
revoke insert on public.gym_prices from authenticated;
grant insert (gym_id, user_id, price_1m, price_3m, price_6m, price_12m, memo)
  on public.gym_prices to authenticated;

revoke update on public.gym_prices from authenticated;
grant update (price_1m, price_3m, price_6m, price_12m, memo, status)
  on public.gym_prices to authenticated;

-- status 컬럼 UPDATE 권한은 위에서 열어줬지만, "일반 유저는 status를 못 바꾸고
-- 관리자는 가격 값을 못 바꾼다"는 실제 강제는 컬럼 권한만으로는 표현할 수 없어
-- (권한은 역할 단위지 값 단위가 아님) 트리거로 처리한다.
create or replace function public.enforce_gym_price_update_rules()
returns trigger
language plpgsql
as $$
begin
  if public.is_admin() then
    -- 관리자는 심사(status)만 바꿀 수 있다. 가격 값/메모는 못 바꾸게 원래 값으로 되돌린다.
    new.price_1m := old.price_1m;
    new.price_3m := old.price_3m;
    new.price_6m := old.price_6m;
    new.price_12m := old.price_12m;
    new.memo := old.memo;
  else
    -- 일반 유저(작성자)는 status를 직접 바꿀 수 없다.
    new.status := old.status;
    if (new.price_1m is distinct from old.price_1m
        or new.price_3m is distinct from old.price_3m
        or new.price_6m is distinct from old.price_6m
        or new.price_12m is distinct from old.price_12m) then
      -- 가격 값을 수정하면 다시 심사받도록 pending으로 되돌린다.
      new.status := 'pending';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_gym_price_update on public.gym_prices;
create trigger on_gym_price_update
  before update on public.gym_prices
  for each row execute function public.enforce_gym_price_update_rules();

-- gym_details (한 헬스장당 1건 — 로그인 유저 누구나 추가/수정 가능한 크라우드소싱 정보)
create policy "gym_details_select_all"  on public.gym_details for select using (true);
create policy "gym_details_insert_auth" on public.gym_details for insert to authenticated with check (true);
create policy "gym_details_update_auth" on public.gym_details for update to authenticated
  using (true) with check (true);

-- push_tokens (본인 토큰만 관리, 조회도 본인 것만)
create policy "push_tokens_select_self" on public.push_tokens for select to authenticated
  using (auth.uid() = user_id);
create policy "push_tokens_insert_self" on public.push_tokens for insert to authenticated
  with check (auth.uid() = user_id);
create policy "push_tokens_update_self" on public.push_tokens for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "push_tokens_delete_self" on public.push_tokens for delete to authenticated
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- 4) 회원가입 시 public.users 프로필 자동 생성 트리거
--    - auth.users에 새 유저가 생기면(이메일/SNS 공통) 프로필을 만든다.
--    - SECURITY DEFINER로 실행되어 RLS의 영향을 받지 않는다.
--    - nickname: 가입 시 metadata.nickname → 없으면 이메일 앞부분.
-- ----------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (uid, email, nickname)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'nickname', split_part(coalesce(new.email, 'user'), '@', 1))
  )
  on conflict (uid) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------
-- 5) 새 가격 등록 시 푸시 알림 (Edge Function 연결)
--    권장: Dashboard → Database → Webhooks 로 gym_prices INSERT 시
--          Edge Function `on-new-price` 를 호출하도록 설정한다.
--    (SQL로 직접 트리거하려면 pg_net 확장 + 아래 형태를 사용. URL/키는
--     프로젝트별 값이라 주석으로만 남긴다.)
--
-- create extension if not exists pg_net;
-- create or replace function public.notify_new_price()
-- returns trigger language plpgsql security definer as $$
-- begin
--   perform net.http_post(
--     url := 'https://<project-ref>.supabase.co/functions/v1/on-new-price',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer <service-role-key>'
--     ),
--     body := jsonb_build_object('type', 'INSERT', 'record', to_jsonb(new))
--   );
--   return new;
-- end; $$;
-- drop trigger if exists on_gym_price_created on public.gym_prices;
-- create trigger on_gym_price_created
--   after insert on public.gym_prices
--   for each row execute function public.notify_new_price();
