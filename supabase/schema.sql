-- ============================================================
-- GymPrice 스키마 + RLS + 프로필 자동 생성 트리거
-- Supabase SQL Editor에 전체 붙여넣어 1회 실행한다.
-- ============================================================

-- ----------------------------------------------------------------
-- 1) 테이블
-- ----------------------------------------------------------------
create table if not exists public.users (
  uid              uuid        primary key references auth.users(id) on delete cascade,
  email            text        not null,
  nickname         text        not null,
  home_lat         double precision, -- 내 동네 위도 (위치기반 알림용)
  home_lng         double precision, -- 내 동네 경도
  created_at       timestamptz not null default now()
);

-- 이미 만들어진 users 테이블에도 컬럼 추가
alter table public.users add column if not exists home_lat double precision;
alter table public.users add column if not exists home_lng double precision;
-- ⚠️ 관심 지역을 시/도+시/군/구 문자열 컬럼 1쌍이 아니라 최대 5개까지 등록 가능한
-- 목록으로 바꾸면서 users 테이블이 아닌 별도 테이블(user_interest_regions)로
-- 옮겼다. 예전 컬럼이 남아있으면 제거한다(테스트 데이터만 있다는 전제).
alter table public.users drop column if exists interest_sido;
alter table public.users drop column if exists interest_sigungu;
-- 관리자 여부 (가격 심사 등 관리자 전용 기능에 사용). 앱에는 관리자 지정 UI가 없으므로
-- 최초 관리자는 SQL Editor에서 직접 켜야 한다:
--   update public.users set is_admin = true where email = '본인 이메일';
alter table public.users add column if not exists is_admin boolean not null default false;
-- 정지 여부 (도배/허위 제보 등으로 악용하는 계정을 막기 위함). 정지된 계정은
-- 로그인 자체는 되지만(로그인 차단은 SERVICE_ROLE이 필요해 클라이언트 전용
-- 관리자 페이지에서 못 함) 헬스장/가격/부가정보 등록이 전부 막힌다.
alter table public.users add column if not exists is_suspended boolean not null default false;

create table if not exists public.gyms (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  address    text,
  lat        double precision not null,
  lng        double precision not null,
  phone      text,
  created_at timestamptz not null default now()
);

-- 주소는 선택 입력으로 변경 (이미 만들어진 테이블에도 적용). 검색으로 헬스장을
-- 찾아 등록하면 자동으로 채워지지만, 직접 입력 시에는 비워둘 수 있다.
alter table public.gyms alter column address drop not null;

-- 위경도 유효 범위 + 자유 입력 텍스트 길이 제한. 클라이언트(useRegisterGym의
-- isValidCoordinate)도 동일하게 검증하지만, API를 직접 호출해도 막히도록 DB에서도
-- 강제한다 — 범위 밖 좌표가 들어오면 지도 렌더링/거리 계산(Haversine)이 깨진다.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gyms_lat_range'
  ) then
    alter table public.gyms
      add constraint gyms_lat_range check (lat between -90 and 90);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gyms_lng_range'
  ) then
    alter table public.gyms
      add constraint gyms_lng_range check (lng between -180 and 180);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gyms_name_length'
  ) then
    alter table public.gyms
      add constraint gyms_name_length check (char_length(name) between 1 and 100);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gyms_address_length'
  ) then
    alter table public.gyms
      add constraint gyms_address_length check (address is null or char_length(address) <= 200);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gyms_phone_length'
  ) then
    alter table public.gyms
      add constraint gyms_phone_length check (phone is null or char_length(phone) <= 20);
  end if;
end $$;

-- ⚠️ gym_prices를 "기간별 고정 컬럼(price_1m/3m/6m/12m)" 구조에서
-- "라벨(자유 텍스트) + 가격 1건 = 1행" 구조로 전면 교체한다. PT 횟수권처럼
-- 기간권이 아닌 가격도 자유롭게 등록할 수 있게 하기 위함. 예전 구조의 데이터는
-- 새 구조로 자동 이전하지 않으므로(테스트 데이터만 있다는 전제), 예전 컬럼이
-- 남아있으면 통째로 지우고 새로 만든다.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'gym_prices' and column_name = 'price_1m'
  ) then
    drop table public.gym_prices cascade;
  end if;
end $$;

create table if not exists public.gym_prices (
  id         uuid        primary key default gen_random_uuid(),
  gym_id     uuid        not null references public.gyms(id) on delete cascade,
  user_id    uuid        not null references public.users(uid) on delete cascade,
  label      text        not null, -- 예: "1개월", "3개월", "PT 10회"
  price      integer     not null,
  memo       text,
  status     text        not null default 'pending', -- 관리자 승인(approved) 후에만 공개 노출
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
      add constraint gym_prices_price_range check (price between 1000 and 10000000);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gym_prices_status_check'
  ) then
    alter table public.gym_prices
      add constraint gym_prices_status_check check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

-- 라벨/메모 길이 제한 (features/price/utils.ts에는 별도 상한이 없어 여기 DB가
-- 유일한 방어선 — 지나치게 긴 값으로 목록 UI가 깨지거나 스팸성 도배를 막는다).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gym_prices_label_length'
  ) then
    alter table public.gym_prices
      add constraint gym_prices_label_length check (char_length(label) between 1 and 50);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gym_prices_memo_length'
  ) then
    alter table public.gym_prices
      add constraint gym_prices_memo_length check (memo is null or char_length(memo) <= 500);
  end if;
end $$;

create index if not exists gym_prices_gym_id_idx on public.gym_prices (gym_id);

-- ⚠️ 계정 삭제(회원 탈퇴) 시 gym_prices까지 CASCADE로 함께 지워지면, 다른
-- 이용자를 위해 쌓인 가격 비교 데이터(이미 승인된 가격 등)가 통째로 사라진다.
-- 개인정보(계정 자체)는 완전히 지우되, 커뮤니티에 기여한 가격 데이터는 남기기
-- 위해 user_id를 nullable로 바꾸고 삭제 시 CASCADE 대신 SET NULL(작성자 연결만
-- 끊기)로 변경한다. (이미 만들어진 테이블에도 적용, 재실행해도 안전)
alter table public.gym_prices alter column user_id drop not null;
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'gym_prices_user_id_fkey' and confdeltype = 'c' -- 'c' = cascade(기존 값)
  ) then
    alter table public.gym_prices drop constraint gym_prices_user_id_fkey;
    alter table public.gym_prices
      add constraint gym_prices_user_id_fkey
        foreign key (user_id) references public.users(uid) on delete set null;
  end if;
end $$;

create table if not exists public.gym_details (
  id              uuid        primary key default gen_random_uuid(),
  gym_id          uuid        not null unique references public.gyms(id) on delete cascade,
  equipment_brand text,
  cleanliness     integer,
  trainer_count   integer,
  memo            text,
  updated_at      timestamptz not null default now(),
  updated_by      uuid        references public.users(uid) on delete set null
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

-- 이미 만들어진 gym_details 테이블에도 컬럼 추가 (누가/언제 마지막으로 고쳤는지
-- 최소한의 추적 — 전체 수정 이력까지는 아니지만, 악의적 덮어쓰기를 나중에
-- 조사할 수 있는 최소 단서는 남긴다. 실제 값은 아래 트리거가 자동으로 채운다).
alter table public.gym_details add column if not exists updated_at timestamptz not null default now();
alter table public.gym_details add column if not exists updated_by uuid references public.users(uid) on delete set null;

-- 청결도/트레이너 수는 클라이언트(hooks)에서도 검증하지만, API를 직접 호출해도
-- 막히도록 DB에서도 동일한 범위를 강제한다 (클라이언트 검증만으로는 우회 가능).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gym_details_cleanliness_range'
  ) then
    alter table public.gym_details
      add constraint gym_details_cleanliness_range check (cleanliness is null or cleanliness between 1 and 5);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gym_details_trainer_count_range'
  ) then
    alter table public.gym_details
      add constraint gym_details_trainer_count_range check (trainer_count is null or trainer_count >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gym_details_equipment_brand_length'
  ) then
    alter table public.gym_details
      add constraint gym_details_equipment_brand_length
        check (equipment_brand is null or char_length(equipment_brand) <= 100);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gym_details_memo_length'
  ) then
    alter table public.gym_details
      add constraint gym_details_memo_length check (memo is null or char_length(memo) <= 500);
  end if;
end $$;

-- gym_details 수정 이력 (매번 바뀔 때마다 그 시점의 스냅샷을 한 줄씩 남긴다).
-- 크라우드소싱으로 누구나 덮어쓸 수 있는 정보라, 악의적인 수정이 있었는지
-- 나중에 조사할 수 있도록 "누가/언제/어떤 값으로" 바꿨는지 전체 이력을 보존한다.
-- 개인 활동 로그와 성격이 비슷한 app_events처럼 조회는 관리자만 가능하다.
create table if not exists public.gym_details_history (
  id              uuid        primary key default gen_random_uuid(),
  gym_id          uuid        not null references public.gyms(id) on delete cascade,
  equipment_brand text,
  cleanliness     integer,
  trainer_count   integer,
  memo            text,
  changed_by      uuid        references public.users(uid) on delete set null,
  changed_at      timestamptz not null default now()
);

create index if not exists gym_details_history_gym_id_idx
  on public.gym_details_history (gym_id, changed_at desc);

-- ⚠️ RLS 활성화 + is_admin()을 쓰는 정책은 이 파일 뒤쪽(2), 3) 섹션)에서
-- is_admin()이 정의된 뒤에 처리한다 — is_admin()이 아직 없는 시점에 정책을
-- 만들면(이 스크립트는 위에서부터 순서대로 실행되므로) "함수가 없다" 에러가 난다.

-- 수정할 때마다 누가/언제/무엇으로 바꿨는지 자동으로 기록한다(클라이언트가 값을
-- 조작할 수 없도록 트리거로 강제). updated_at/updated_by "최신 상태" 컬럼도 같이 채운다.
create or replace function public.set_gym_detail_audit_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();

  insert into public.gym_details_history (
    gym_id, equipment_brand, cleanliness, trainer_count, memo, changed_by, changed_at
  ) values (
    new.gym_id, new.equipment_brand, new.cleanliness, new.trainer_count, new.memo,
    new.updated_by, new.updated_at
  );

  return new;
end;
$$;

drop trigger if exists on_gym_details_write on public.gym_details;
create trigger on_gym_details_write
  before insert or update on public.gym_details
  for each row execute function public.set_gym_detail_audit_fields();

-- 푸시 토큰 (원격 푸시 발송 대상). 한 유저가 여러 기기 토큰을 가질 수 있음.
create table if not exists public.push_tokens (
  token      text        primary key,
  user_id    uuid        not null references public.users(uid) on delete cascade,
  created_at timestamptz not null default now()
);

-- 앱 사용 이벤트(접속/조회) 기록 — 관리자 대시보드의 "오늘 접속/조회" 지표용.
-- 유저 개인의 행동 로그라 조회는 관리자만 가능하다.
create table if not exists public.app_events (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.users(uid) on delete cascade,
  event_type text        not null,
  gym_id     uuid        references public.gyms(id) on delete set null, -- gym_view일 때만
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'app_events_event_type_check'
  ) then
    alter table public.app_events
      add constraint app_events_event_type_check check (event_type in ('app_open', 'gym_view'));
  end if;
end $$;

create index if not exists app_events_created_at_idx on public.app_events (created_at);

-- 관심 지역 (시/도 + 시/군/구, 최대 5개/유저). 관심 지역 안의 헬스장에 새 최저가가
-- 등록되면 알림을 보내는 데 사용한다 (on-new-price Edge Function 참고).
create table if not exists public.user_interest_regions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.users(uid) on delete cascade,
  sido       text        not null,
  sigungu    text        not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_interest_regions_unique'
  ) then
    alter table public.user_interest_regions
      add constraint user_interest_regions_unique unique (user_id, sido, sigungu);
  end if;
end $$;

create index if not exists user_interest_regions_user_id_idx
  on public.user_interest_regions (user_id);

-- 헬스장 상세 가격(1개월 외 기간/개별 등록 내역) 열람 기록 — 하루 무료 열람 한도
-- 계산에 쓰인다 (record_gym_price_view() 참고). 최근 1년 내 승인된 가격을
-- 등록한 유저는 이 한도와 무관하게 무제한 열람하므로 그런 유저는 행이 쌓이지
-- 않는다(무제한이라 셀 필요가 없음).
create table if not exists public.gym_price_views (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.users(uid) on delete cascade,
  gym_id     uuid        not null references public.gyms(id) on delete cascade,
  -- 한국시간 기준 "오늘" 날짜. 같은 헬스장을 하루에 여러 번 봐도 한도가 한 번만
  -- 깎이도록, (user_id, gym_id, view_date) 조합을 유니크로 강제한다.
  view_date  date        not null default ((now() at time zone 'Asia/Seoul')::date),
  viewed_at  timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gym_price_views_unique_per_day'
  ) then
    alter table public.gym_price_views
      add constraint gym_price_views_unique_per_day unique (user_id, gym_id, view_date);
  end if;
end $$;

create index if not exists gym_price_views_user_date_idx
  on public.gym_price_views (user_id, view_date);

-- ----------------------------------------------------------------
-- 2) RLS 활성화
-- ----------------------------------------------------------------
alter table public.users               enable row level security;
alter table public.gyms                enable row level security;
alter table public.gym_prices          enable row level security;
alter table public.gym_details         enable row level security;
alter table public.gym_details_history enable row level security;
alter table public.push_tokens         enable row level security;
alter table public.app_events          enable row level security;
alter table public.user_interest_regions enable row level security;
alter table public.gym_price_views     enable row level security;

-- 호출한 유저가 관리자인지 확인하는 헬퍼.
-- ⚠️ SECURITY DEFINER + 고정 search_path 필수:
--   1) 이 함수는 users 테이블의 RLS 정책(users_select_admin) 안에서 호출된다.
--      SECURITY DEFINER가 아니면(=INVOKER 권한으로 실행되면) 함수 내부의
--      "select ... from public.users" 쿼리도 호출자 권한으로 다시 RLS를 타게 되고,
--      그 RLS 정책이 다시 is_admin()을 호출하므로 PostgreSQL이 "infinite recursion
--      detected in policy for relation users" 에러를 낼 수 있다. SECURITY DEFINER로
--      함수 소유자 권한으로 실행하면 내부 쿼리가 RLS를 우회해 이 순환을 끊는다.
--      (auth.uid()로 자기 자신의 행만 읽으므로 권한 우회가 문제되지 않는다 — 이
--      함수로 타인의 is_admin 여부를 알아낼 방법은 없다.)
--   2) search_path를 고정하지 않으면(SECURITY DEFINER 함수 특유의 취약점) 악의적인
--      유저가 세션에서 search_path를 조작해 이름이 같은 가짜 오브젝트로 이 함수의
--      쿼리를 가로챌 수 있다. public, pg_temp로 고정해 이를 막는다.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select is_admin from public.users where uid = auth.uid()), false);
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 호출한 유저가 정지 상태인지 확인하는 헬퍼 (등록류 INSERT/UPDATE 정책에서 사용).
-- is_admin()과 동일한 이유로 SECURITY DEFINER + 고정 search_path가 필요하다.
create or replace function public.is_suspended()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select is_suspended from public.users where uid = auth.uid()), false);
$$;

revoke all on function public.is_suspended() from public;
grant execute on function public.is_suspended() to authenticated;

-- ----------------------------------------------------------------
-- 3) 정책
--   SELECT : 누구나 (단, users는 본인만) / INSERT : 로그인 유저 / UPDATE·DELETE : 본인 데이터만
-- ----------------------------------------------------------------
-- users
-- ⚠️ email/home_lat/home_lng(위치기반 알림용 좌표)가 담겨 있어 본인만 조회 가능해야 한다.
--    (과거 users_select_all(누구나 조회)는 개인정보 노출 위험이 있어 제거했다.)
-- ⚠️ 이 스크립트는 몇 번을 다시 실행해도 안전하도록, 모든 create policy 앞에
--    drop policy if exists를 붙인다(안 붙이면 이미 있는 정책과 이름이 겹쳐 에러가
--    나고, SQL Editor는 스크립트 전체를 한 트랜잭션으로 실행하기 때문에 앞서
--    성공한 create table 등도 전부 롤백된다).
drop policy if exists "users_select_all" on public.users;
drop policy if exists "users_select_self" on public.users;
create policy "users_select_self" on public.users for select to authenticated
  using (auth.uid() = uid);
-- 관리자는 가격 심사 화면에서 제보자 닉네임을 봐야 하므로 전체 조회를 허용한다
-- (is_admin=true인 계정만 해당 — 일반 유저는 여전히 본인만 조회 가능).
drop policy if exists "users_select_admin" on public.users;
create policy "users_select_admin" on public.users for select to authenticated
  using (public.is_admin());
drop policy if exists "users_update_self" on public.users;
create policy "users_update_self" on public.users for update to authenticated
  using (auth.uid() = uid) with check (auth.uid() = uid);
-- 관리자는 다른 유저의 관리자 권한을 부여/해제할 수 있어야 한다(관리자 페이지의
-- "유저 관리" 기능). is_admin 외 다른 필드(닉네임/이메일/위치)는 아래 트리거가
-- 관리자가 "타인의" 행을 건드릴 때만 원래 값으로 되돌려 막는다.
drop policy if exists "users_update_admin" on public.users;
create policy "users_update_admin" on public.users for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "users_delete_self" on public.users;
create policy "users_delete_self" on public.users for delete to authenticated
  using (auth.uid() = uid);
-- (INSERT는 아래 트리거가 SECURITY DEFINER로 처리하므로 정책 불필요)
-- (on-new-price 등 Edge Function은 SERVICE_ROLE 키로 동작해 RLS를 우회하므로 영향 없음)

-- ⚠️ users_update_self는 "본인 행인가"만 검사할 뿐, 본인이 스스로 is_admin/
-- is_suspended를 바꾸는 것까지는 막지 못한다. is_admin/is_suspended는 오직
-- "관리자가 타인의 행을 수정하는 경우"에만 바뀔 수 있다:
--   - 비관리자의 자기 수정, 관리자의 자기 수정(자기 자신을 정지/권한 해제하는 것 포함)
--     → 항상 원래 값으로 되돌림 (셀프 승격 방지 + 관리자의 셀프 강등/셀프 정지 방지)
--   - 관리자가 타인의 행을 수정 → is_admin/is_suspended는 통과, 나머지 필드
--     (닉네임/이메일/위치)는 원래 값으로 되돌림 (사생활 보호)
create or replace function public.enforce_users_update_rules()
returns trigger
language plpgsql
as $$
begin
  if public.is_admin() and auth.uid() <> old.uid then
    new.email := old.email;
    new.nickname := old.nickname;
    new.home_lat := old.home_lat;
    new.home_lng := old.home_lng;
  else
    new.is_admin := old.is_admin;
    new.is_suspended := old.is_suspended;
  end if;
  return new;
end;
$$;

drop trigger if exists on_users_update on public.users;
create trigger on_users_update
  before update on public.users
  for each row execute function public.enforce_users_update_rules();

-- gyms (작성자 컬럼이 없어 일반 유저 수정/삭제는 미제공 → RLS로 자동 차단.
--       수정(오타 정정)/삭제는 관리자만 가능)
drop policy if exists "gyms_select_all" on public.gyms;
create policy "gyms_select_all"  on public.gyms for select using (true);
-- 정지된 계정은 새 헬스장을 등록할 수 없다(도배 방지).
drop policy if exists "gyms_insert_auth" on public.gyms;
create policy "gyms_insert_auth" on public.gyms for insert to authenticated
  with check (not public.is_suspended());
drop policy if exists "gyms_update_admin" on public.gyms;
create policy "gyms_update_admin" on public.gyms for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- 관리자 전용 정책이라 컬럼 권한을 따로 제한하지 않아도 안전하지만, 관리자 페이지가
-- 실제로 수정하는 건 이름/주소/전화번호뿐이라 우선 그 범위만 열어둔다.
revoke update on public.gyms from authenticated;
grant update (name, address, phone) on public.gyms to authenticated;
drop policy if exists "gyms_delete_admin" on public.gyms;
create policy "gyms_delete_admin" on public.gyms for delete to authenticated
  using (public.is_admin());

-- gym_prices
-- SELECT: 승인(approved)된 가격은 누구나, 본인 가격은 심사 상태와 무관하게 본인만,
--         관리자는 전부(심사용) 조회 가능.
drop policy if exists "gym_prices_select_all" on public.gym_prices;
drop policy if exists "gym_prices_select_approved_or_own_or_admin" on public.gym_prices;
create policy "gym_prices_select_approved_or_own_or_admin" on public.gym_prices
  for select
  using (
    status = 'approved'
    or auth.uid() = user_id
    or public.is_admin()
  );

-- INSERT: 본인 명의로만, 정지되지 않은 계정만 등록 가능 (컬럼 권한으로 status는
-- 직접 못 넣게 막아 항상 기본값 'pending'으로 시작하게 한다 — 아래 grant insert 참고)
drop policy if exists "gym_prices_insert_auth" on public.gym_prices;
create policy "gym_prices_insert_auth"  on public.gym_prices for insert to authenticated
  with check (auth.uid() = user_id and not public.is_suspended());

-- UPDATE: 본인(단, 정지되지 않은 경우만) 또는 관리자만. "본인은 가격만/관리자는
-- status만" 세부 규칙은 아래 enforce_gym_price_update_rules 트리거가 강제한다.
-- ⚠️ 정지된 유저는 새 가격 등록(INSERT)만 막혀 있었고 기존 가격 수정(UPDATE)은
-- 막혀 있지 않았다 — 등록과 동일하게 정지 중에는 수정도 못 하도록 막는다
-- (관리자는 정지 여부와 무관하게 심사를 위해 계속 수정 가능해야 한다).
drop policy if exists "gym_prices_update_owner" on public.gym_prices;
drop policy if exists "gym_prices_update_owner_or_admin" on public.gym_prices;
create policy "gym_prices_update_owner_or_admin" on public.gym_prices for update to authenticated
  using ((auth.uid() = user_id and not public.is_suspended()) or public.is_admin())
  with check ((auth.uid() = user_id and not public.is_suspended()) or public.is_admin());

drop policy if exists "gym_prices_delete_owner" on public.gym_prices;
create policy "gym_prices_delete_owner" on public.gym_prices for delete to authenticated
  using (auth.uid() = user_id);
-- 관리자는 문제가 되는 제보를 직접 삭제할 수도 있다(거절 상태로 남기는 대신 완전 제거).
drop policy if exists "gym_prices_delete_admin" on public.gym_prices;
create policy "gym_prices_delete_admin" on public.gym_prices for delete to authenticated
  using (public.is_admin());

-- ⚠️ RLS의 update/insert 정책은 "이 행이 내 것인가"만 검사할 뿐, 요청으로 gym_id/user_id를
-- 다른 값으로 바꾸거나 status를 직접 'approved'로 넣는 것까지는 막지 못한다. 컬럼 단위
-- 권한으로 gym_id/user_id는 애초에 수정 대상에서 제외하고, status는 INSERT 시 지정할 수
-- 없게(항상 DB 기본값 'pending') 막는다.
revoke insert on public.gym_prices from authenticated;
grant insert (gym_id, user_id, label, price, memo)
  on public.gym_prices to authenticated;

revoke update on public.gym_prices from authenticated;
grant update (label, price, memo, status)
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
    -- 관리자는 심사(status)만 바꿀 수 있다. 라벨/가격/메모는 못 바꾸게 원래 값으로 되돌린다.
    new.label := old.label;
    new.price := old.price;
    new.memo := old.memo;
  else
    -- 일반 유저(작성자)는 status를 직접 바꿀 수 없다.
    new.status := old.status;
    if (new.price is distinct from old.price or new.label is distinct from old.label) then
      -- 라벨/가격을 수정하면 다시 심사받도록 pending으로 되돌린다.
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

-- 실수로 여러 번 탭하거나 스팸성으로 짧은 시간 안에 같은 내용(헬스장/라벨/가격 동일)을
-- 반복 제출하는 것을 막는다. ⚠️ "완전히 동일한 값 자체"를 영구히 막지는 않는다 —
-- 몇 주/몇 달 뒤 같은 가격이 여전히 유효함을 재확인해 다시 제보하는 것까지 막으면
-- 가격 freshness(최신성 확인) 자체를 방해하게 되므로, 아주 짧은 쿨다운 시간 안의
-- 반복만 차단한다. 정상적인 가격 변경 이력(다른 값으로 재제출)은 애초에 값이
-- 달라 이 검사에 걸리지 않는다.
create or replace function public.prevent_duplicate_price_submission()
returns trigger
language plpgsql
as $$
declare
  duplicate_cooldown constant interval := interval '10 minutes';
begin
  if exists (
    select 1 from public.gym_prices
    where user_id = new.user_id
      and gym_id = new.gym_id
      and label = new.label
      and price = new.price
      and created_at > now() - duplicate_cooldown
  ) then
    raise exception '이미 같은 내용으로 방금 제보했어요. 잠시 후 다시 시도해주세요.';
  end if;
  return new;
end;
$$;

drop trigger if exists on_gym_price_duplicate_check on public.gym_prices;
create trigger on_gym_price_duplicate_check
  before insert on public.gym_prices
  for each row execute function public.prevent_duplicate_price_submission();

-- gym_details (한 헬스장당 1건 — 로그인 + 정지되지 않은 유저는 누구나 추가/수정 가능한
-- 크라우드소싱 정보)
drop policy if exists "gym_details_select_all" on public.gym_details;
create policy "gym_details_select_all"  on public.gym_details for select using (true);
drop policy if exists "gym_details_insert_auth" on public.gym_details;
create policy "gym_details_insert_auth" on public.gym_details for insert to authenticated
  with check (not public.is_suspended());
drop policy if exists "gym_details_update_auth" on public.gym_details;
create policy "gym_details_update_auth" on public.gym_details for update to authenticated
  using (true) with check (not public.is_suspended());

-- gym_details_history (수정 이력 — 개인 행동 로그와 성격이 비슷해 조회는 관리자만.
-- INSERT는 set_gym_detail_audit_fields 트리거가 SECURITY DEFINER로 처리하므로
-- 일반 유저용 정책은 두지 않는다 — 직접 쓰거나 지울 수 없다.)
drop policy if exists "gym_details_history_select_admin" on public.gym_details_history;
create policy "gym_details_history_select_admin" on public.gym_details_history
  for select to authenticated
  using (public.is_admin());

-- push_tokens (본인 토큰만 관리, 조회도 본인 것만)
drop policy if exists "push_tokens_select_self" on public.push_tokens;
create policy "push_tokens_select_self" on public.push_tokens for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "push_tokens_insert_self" on public.push_tokens;
create policy "push_tokens_insert_self" on public.push_tokens for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "push_tokens_update_self" on public.push_tokens;
create policy "push_tokens_update_self" on public.push_tokens for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "push_tokens_delete_self" on public.push_tokens;
create policy "push_tokens_delete_self" on public.push_tokens for delete to authenticated
  using (auth.uid() = user_id);

-- app_events (본인 명의로만 기록 가능. 조회는 관리자만 — 개인 행동 로그이기 때문)
drop policy if exists "app_events_insert_self" on public.app_events;
create policy "app_events_insert_self" on public.app_events for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "app_events_select_admin" on public.app_events;
create policy "app_events_select_admin" on public.app_events for select to authenticated
  using (public.is_admin());

-- user_interest_regions (본인 명의로만 조회/추가/삭제)
drop policy if exists "user_interest_regions_select_self" on public.user_interest_regions;
create policy "user_interest_regions_select_self" on public.user_interest_regions
  for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "user_interest_regions_insert_self" on public.user_interest_regions;
create policy "user_interest_regions_insert_self" on public.user_interest_regions
  for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "user_interest_regions_delete_self" on public.user_interest_regions;
create policy "user_interest_regions_delete_self" on public.user_interest_regions
  for delete to authenticated
  using (auth.uid() = user_id);
-- (수정은 없음 — 지역을 바꾸려면 삭제 후 다시 추가한다)

-- 관심 지역은 최대 5개까지만 등록 가능하게 강제한다(RLS의 with check만으로는
-- "내가 이미 가진 행의 개수"를 셀 수 없어 트리거로 처리).
create or replace function public.enforce_interest_region_limit()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.user_interest_regions where user_id = new.user_id) >= 5 then
    raise exception '관심 지역은 최대 5개까지 설정할 수 있습니다.';
  end if;
  return new;
end;
$$;

drop trigger if exists on_user_interest_region_insert on public.user_interest_regions;
create trigger on_user_interest_region_insert
  before insert on public.user_interest_regions
  for each row execute function public.enforce_interest_region_limit();

-- gym_price_views (본인 명의 조회 기록만 볼 수 있다. INSERT는 아래
-- record_gym_price_view() 함수만 하므로 일반 유저용 INSERT 정책은 두지 않는다
-- — 클라이언트가 직접 행을 넣어 열람 한도를 조작할 수 없게 막는다.)
drop policy if exists "gym_price_views_select_self" on public.gym_price_views;
create policy "gym_price_views_select_self" on public.gym_price_views
  for select to authenticated
  using (auth.uid() = user_id);

-- 헬스장 상세 가격(1개월 외) 열람 요청을 판정하고, 허용된 경우 오늘 조회로
-- 기록까지 함께 처리하는 RPC 함수.
--   - 최근 1년 내 승인된 가격을 1건이라도 등록한 유저 → 무제한 허용(reason: contributor)
--   - 그 외 유저는 하루 최대 3개 헬스장까지만 허용. 오늘 이미 본 헬스장이면
--     한도를 다시 깎지 않고 그대로 허용(reason: already_viewed_today)
--   - 오늘 새로 보는 헬스장이고 한도(3곳) 안이면 허용 + 기록(reason: within_limit)
--   - 한도를 넘었으면 거부(allowed: false, reason: daily_limit_reached)
-- SECURITY DEFINER로 실행하되, auth.uid()로만 판단해 호출자 본인 데이터 밖으로
-- 벗어날 수 없다(다른 유저의 한도를 조회/소모시킬 방법이 없다).
create or replace function public.record_gym_price_view(target_gym_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller uuid := auth.uid();
  today date := (now() at time zone 'Asia/Seoul')::date;
  is_contributor boolean;
  already_viewed boolean;
  views_today integer;
  daily_limit constant integer := 3;
begin
  if caller is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select exists (
    select 1 from public.gym_prices
    where user_id = caller
      and status = 'approved'
      and created_at >= now() - interval '1 year'
  ) into is_contributor;

  if is_contributor then
    return jsonb_build_object('allowed', true, 'reason', 'contributor', 'remaining', null);
  end if;

  select exists (
    select 1 from public.gym_price_views
    where user_id = caller and gym_id = target_gym_id and view_date = today
  ) into already_viewed;

  select count(*) into views_today
    from public.gym_price_views
    where user_id = caller and view_date = today;

  if already_viewed then
    return jsonb_build_object(
      'allowed', true, 'reason', 'already_viewed_today',
      'remaining', greatest(daily_limit - views_today, 0)
    );
  end if;

  if views_today >= daily_limit then
    return jsonb_build_object('allowed', false, 'reason', 'daily_limit_reached', 'remaining', 0);
  end if;

  insert into public.gym_price_views (user_id, gym_id, view_date)
  values (caller, target_gym_id, today)
  on conflict (user_id, gym_id, view_date) do nothing;

  return jsonb_build_object(
    'allowed', true, 'reason', 'within_limit',
    'remaining', greatest(daily_limit - (views_today + 1), 0)
  );
end;
$$;

revoke all on function public.record_gym_price_view(uuid) from public;
grant execute on function public.record_gym_price_view(uuid) to authenticated;

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
set search_path = public, pg_temp
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
-- 5) 가격 승인 시 푸시 알림 (Edge Function 연결)
--    ⚠️ pending 상태로 등록되는 시점(INSERT)이 아니라, 관리자가 승인해
--       status가 approved로 바뀌는 시점(UPDATE)에만 알림이 나가야 한다
--       (미승인 가격이 알림으로 나가면 안 된다는 정책). 그래서 아래처럼
--       INSERT가 아니라 UPDATE에 연결해야 한다.
--    권장: Dashboard → Database → Webhooks 로 gym_prices UPDATE 시
--          Edge Function `on-new-price` 를 호출하도록 설정한다.
--          (자세한 내용은 supabase/functions/README.md 참고)
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
--     body := jsonb_build_object(
--       'type', 'UPDATE', 'record', to_jsonb(new), 'old_record', to_jsonb(old)
--     )
--   );
--   return new;
-- end; $$;
-- drop trigger if exists on_gym_price_created on public.gym_prices;
-- create trigger on_gym_price_created
--   after update on public.gym_prices
--   for each row execute function public.notify_new_price();
