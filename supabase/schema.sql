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
  created_at timestamptz not null default now()
);

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

-- ----------------------------------------------------------------
-- 2) RLS 활성화
-- ----------------------------------------------------------------
alter table public.users       enable row level security;
alter table public.gyms        enable row level security;
alter table public.gym_prices  enable row level security;
alter table public.gym_details enable row level security;

-- ----------------------------------------------------------------
-- 3) 정책
--   SELECT : 누구나 / INSERT : 로그인 유저 / UPDATE·DELETE : 본인 데이터만
-- ----------------------------------------------------------------
-- users
create policy "users_select_all"  on public.users for select using (true);
create policy "users_update_self" on public.users for update to authenticated
  using (auth.uid() = uid) with check (auth.uid() = uid);
create policy "users_delete_self" on public.users for delete to authenticated
  using (auth.uid() = uid);
-- (INSERT는 아래 트리거가 SECURITY DEFINER로 처리하므로 정책 불필요)

-- gyms (작성자 컬럼이 없어 일반 유저 수정/삭제는 미제공 → RLS로 자동 차단)
create policy "gyms_select_all"  on public.gyms for select using (true);
create policy "gyms_insert_auth" on public.gyms for insert to authenticated with check (true);

-- gym_prices (본인 데이터만 수정/삭제)
create policy "gym_prices_select_all"   on public.gym_prices for select using (true);
create policy "gym_prices_insert_auth"  on public.gym_prices for insert to authenticated
  with check (auth.uid() = user_id);
create policy "gym_prices_update_owner" on public.gym_prices for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "gym_prices_delete_owner" on public.gym_prices for delete to authenticated
  using (auth.uid() = user_id);

-- gym_details
create policy "gym_details_select_all"  on public.gym_details for select using (true);
create policy "gym_details_insert_auth" on public.gym_details for insert to authenticated with check (true);

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
