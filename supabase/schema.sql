-- =====================================================================
-- 오늘도 안녕 - Supabase 데이터베이스 설계도 (schema.sql)
-- ---------------------------------------------------------------------
-- 사용법: Supabase 대시보드 > SQL Editor > New query 에 이 파일 전체를 붙여넣고 Run.
-- 여러 번 실행해도 안전해요 (이미 있는 것은 건너뛰거나 덮어써요).
--
-- 보안 원칙
--  1) 모든 표는 RLS(행 단위 보호)를 켜고, 앱(로그인한 사용자)은 표를 직접 고치지 못해요.
--  2) 데이터를 바꾸는 일은 아래 "함수(security definer)"만 할 수 있어요.
--  3) 다른 사람의 정보는 함수가 돌려주는 "닉네임 + 동"과 (수락된 경우) 마지막 체크인 시각뿐이에요.
--     호수/전화번호는 애초에 저장하지 않아요.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. 표(table)
-- ---------------------------------------------------------------------

-- 내 프로필. 로그인 계정(auth.users) 1개당 1줄. 가입 때 redeem_invite 가 만들어요.
create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  nickname            text not null check (char_length(nickname) between 1 and 20),
  dong                text not null check (char_length(dong) between 1 and 30),
  -- 이웃이 나를 지킴이로 찾을 때 쓰는 6자리 코드 (헷갈리는 I, L, O, 0, 1 제외)
  neighbor_code       text not null unique check (char_length(neighbor_code) = 6),
  consented_at        timestamptz not null default now(),
  last_checkin_at     timestamptz not null default now(),
  reminded_at         timestamptz,   -- 24시간 안내를 이미 보냈다면 그 시각
  guardian_alerted_at timestamptz,   -- 48시간 지킴이 알림을 이미 보냈다면 그 시각
  created_at          timestamptz not null default now()
);

-- 초대 코드. 한 번 쓰면 끝. 앱(클라이언트)은 이 표를 전혀 읽거나 쓸 수 없어요.
create table if not exists public.invite_codes (
  code        text primary key,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '30 days'),
  used_by     uuid references auth.users (id) on delete set null,
  used_at     timestamptz   -- 사용 여부의 기준 (계정이 지워져 used_by 가 비어도 코드는 되살아나지 않아요)
);

-- 지킴이 연결. owner_id = 지켜 달라고 요청한 사람, guardian_id = 지켜 주는 사람.
create table if not exists public.guardians (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  guardian_id uuid not null references public.profiles (id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at  timestamptz not null default now(),
  unique (owner_id, guardian_id),
  check (owner_id <> guardian_id)
);
create index if not exists guardians_guardian_idx on public.guardians (guardian_id);

-- 알림 기록: reminder(24시간 안내) / missed(48시간 지킴이 알림) / sos
create table if not exists public.alerts (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references public.profiles (id) on delete cascade,
  kind             text not null check (kind in ('reminder', 'missed', 'sos')),
  created_at       timestamptz not null default now(),
  resolved_at      timestamptz,   -- SOS 가 끝난 시각 (null 이면 아직 열려 있음)
  cycle_started_at timestamptz,   -- reminder/missed 가 어느 체크인 주기에 대한 것인지
  pushed_at        timestamptz    -- 푸시를 보낸 시각 (null 이면 아직 안 보냄)
);
create index if not exists alerts_owner_created_idx on public.alerts (owner_id, created_at desc);
-- 같은 체크인 주기에 같은 종류의 알림이 두 번 생기지 않게 막아요 (자동 점검이 겹쳐 돌아도 안전)
create unique index if not exists alerts_cycle_uq
  on public.alerts (owner_id, kind, cycle_started_at)
  where kind in ('reminder', 'missed');
-- 열려 있는 SOS 는 사람당 하나만
create unique index if not exists alerts_one_open_sos
  on public.alerts (owner_id)
  where kind = 'sos' and resolved_at is null;

-- SOS 에 "가는 중이에요" 라고 답한 지킴이
create table if not exists public.alert_responses (
  alert_id    uuid not null references public.alerts (id) on delete cascade,
  guardian_id uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (alert_id, guardian_id)
);

-- 푸시 알림 구독 정보 (브라우저가 준 주소). 서버만 읽어요.
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth_key   text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- ---------------------------------------------------------------------
-- 2. RLS(행 단위 보호) + 정책
--    정책은 전부 "to authenticated" (로그인한 사용자만). 쓰기 정책은 일부러 만들지 않아요.
-- ---------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.invite_codes       enable row level security;
alter table public.guardians          enable row level security;
alter table public.alerts             enable row level security;
alter table public.alert_responses    enable row level security;
alter table public.push_subscriptions enable row level security;

-- (C2) 프로필은 내 것만 읽을 수 있어요. 남의 정보는 아래 함수로만 제한된 열이 나가요.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

-- invite_codes, push_subscriptions: 정책 없음 = 클라이언트는 아무것도 못 해요.

-- (C1) 지킴이 연결: 읽기만 (내가 당사자인 줄). 추가/수정/삭제는 함수로만.
drop policy if exists guardians_select_party on public.guardians;
create policy guardians_select_party on public.guardians
  for select to authenticated
  using (owner_id = auth.uid() or guardian_id = auth.uid());

-- (M1) 알림: 내 알림 전체 + 수락된 지킴이로서는 'missed','sos' 만 (reminder 는 본인만)
drop policy if exists alerts_select on public.alerts;
create policy alerts_select on public.alerts
  for select to authenticated
  using (
    owner_id = auth.uid()
    or (
      kind in ('missed', 'sos')
      and exists (
        select 1 from public.guardians g
        where g.owner_id = alerts.owner_id
          and g.guardian_id = auth.uid()
          and g.status = 'accepted'
      )
    )
  );

-- (H1) 응답 기록: 알림 주인과 수락된 지킴이만 읽기 (alerts 의 정책이 그대로 적용돼요). 쓰기는 respond_en_route 로만.
drop policy if exists alert_responses_select on public.alert_responses;
create policy alert_responses_select on public.alert_responses
  for select to authenticated
  using (
    exists (
      select 1 from public.alerts a
      where a.id = alert_responses.alert_id
        and a.kind = 'sos'
        and (
          a.owner_id = auth.uid()
          or exists (
            select 1 from public.guardians g
            where g.owner_id = a.owner_id
              and g.guardian_id = auth.uid()
              and g.status = 'accepted'
          )
        )
    )
  );

-- 표 권한: 익명(anon)은 아무것도 못 하고, 로그인 사용자는 읽기만 (필요한 표만).
revoke all on public.profiles, public.invite_codes, public.guardians, public.alerts,
              public.alert_responses, public.push_subscriptions from anon;
revoke all on public.profiles, public.invite_codes, public.guardians, public.alerts,
              public.alert_responses, public.push_subscriptions from authenticated;
grant select on public.profiles        to authenticated;
grant select on public.guardians       to authenticated;
grant select on public.alerts          to authenticated;
grant select on public.alert_responses to authenticated;

-- ---------------------------------------------------------------------
-- 3. 함수 (모두 security definer = 함수 주인 권한으로 실행, search_path 고정)
-- ---------------------------------------------------------------------

-- 내부 도우미: 로그인했고 프로필이 있어야 통과 (H5). 앱에서 직접 부를 수 없어요.
create or replace function public._require_profile()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not exists (select 1 from public.profiles p where p.id = v_uid) then
    raise exception '먼저 가입을 마쳐 주세요';
  end if;
  return v_uid;
end;
$$;

-- 내부 도우미: 겹치지 않는 6자리 이웃 코드 만들기
create or replace function public._gen_neighbor_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
  v_try int := 0;
begin
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles p where p.neighbor_code = v_code);
    v_try := v_try + 1;
    if v_try > 30 then
      raise exception '잠시 후 다시 시도해 주세요.';
    end if;
  end loop;
  return v_code;
end;
$$;

-- 가입: 초대 코드 확인 + 프로필 만들기. 로그인(세션)만 있으면 돼요. 내 이웃 코드를 돌려줘요.
create or replace function public.redeem_invite(p_code text, p_nickname text, p_dong text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_nick text := btrim(coalesce(p_nickname, ''));
  v_dong text := btrim(coalesce(p_dong, ''));
  v_claimed text;
  v_neighbor text;
begin
  if v_uid is null then
    raise exception '로그인이 필요해요.';
  end if;
  if exists (select 1 from public.profiles p where p.id = v_uid) then
    raise exception '이미 가입을 마쳤어요.';
  end if;
  if v_nick = '' or v_dong = '' then
    raise exception '닉네임과 동네를 입력해 주세요.';
  end if;
  if char_length(v_nick) > 20 then
    raise exception '닉네임은 20자까지 쓸 수 있어요.';
  end if;
  if char_length(v_dong) > 30 then
    raise exception '동네 이름은 30자까지 쓸 수 있어요.';
  end if;

  -- (M2) 한 번의 update 로 코드를 "선점"해요. 동시에 두 명이 써도 한 명만 성공.
  update public.invite_codes ic
     set used_by = v_uid, used_at = now()
   where ic.code = v_code
     and ic.used_at is null
     and ic.used_by is null
     and ic.expires_at > now()
  returning ic.code into v_claimed;

  if v_claimed is null then
    raise exception '초대 코드를 다시 확인해 주세요.';
  end if;

  v_neighbor := public._gen_neighbor_code();
  begin
    insert into public.profiles (id, nickname, dong, neighbor_code)
    values (v_uid, v_nick, v_dong, v_neighbor);
  exception when unique_violation then
    -- 같은 계정이 동시에 두 번 가입을 눌렀을 때 (전체가 되돌려져 코드도 안 쓴 걸로 돼요)
    raise exception '이미 가입을 마쳤어요.';
  end;

  return v_neighbor;
end;
$$;

-- 내 프로필 (이웃 코드 포함). 프로필이 없으면 0줄 -> 화면이 "가입 필요" 로 판단해요.
create or replace function public.my_profile()
returns table (
  nickname            text,
  dong                text,
  neighbor_code       text,
  consented_at        timestamptz,
  last_checkin_at     timestamptz,
  reminded_at         timestamptz,
  guardian_alerted_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if auth.uid() is null then
    return;
  end if;
  return query
    select p.nickname, p.dong, p.neighbor_code, p.consented_at,
           p.last_checkin_at, p.reminded_at, p.guardian_alerted_at
      from public.profiles p
     where p.id = auth.uid();
end;
$$;

-- 오늘 체크인
create or replace function public.checkin()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public._require_profile();
  v_now timestamptz := now();
begin
  update public.profiles p
     set last_checkin_at = v_now,
         reminded_at = null,
         guardian_alerted_at = null
   where p.id = v_uid;
  return v_now;
end;
$$;

-- 지킴이 요청 (내가 owner). 이웃 코드로 찾아요. 연결 id 를 돌려줘요.
create or replace function public.request_guardian(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me     uuid := public._require_profile();
  v_code   text := upper(btrim(coalesce(p_code, '')));
  v_target uuid;
  v_count  int;
  v_id     uuid;
begin
  if char_length(v_code) <> 6 then
    raise exception '이웃 코드는 6자리예요. 다시 확인해 주세요.';
  end if;

  select p.id into v_target from public.profiles p where p.neighbor_code = v_code;
  if v_target is null then
    raise exception '이웃 코드를 다시 확인해 주세요.';
  end if;
  if v_target = v_me then
    raise exception '내 코드는 지킴이로 추가할 수 없어요.';
  end if;

  -- (M4) 내 프로필 줄을 잠가서, 동시에 두 번 요청해도 순서대로 처리돼요.
  perform 1 from public.profiles p where p.id = v_me for update;

  if exists (select 1 from public.guardians g where g.owner_id = v_me and g.guardian_id = v_target) then
    raise exception '이미 요청했거나 연결된 이웃이에요.';
  end if;

  select count(*) into v_count from public.guardians g where g.owner_id = v_me;  -- 대기 중 포함
  if v_count >= 3 then
    raise exception '지킴이는 최대 3명까지 정할 수 있어요.';
  end if;

  insert into public.guardians (owner_id, guardian_id) values (v_me, v_target)
  returning id into v_id;
  return v_id;
end;
$$;

-- 지킴이 수락 (내가 guardian)
create or replace function public.accept_guardian(p_link uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public._require_profile();
  v_id uuid;
begin
  update public.guardians g
     set status = 'accepted'
   where g.id = p_link and g.guardian_id = v_me
  returning g.id into v_id;
  if v_id is null then
    raise exception '요청을 찾을 수 없어요.';
  end if;
end;
$$;

-- 연결 끊기/요청 거절 (양쪽 모두 가능). 이미 없으면 조용히 넘어가요.
create or replace function public.remove_guardian(p_link uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public._require_profile();
begin
  delete from public.guardians g
   where g.id = p_link and (g.owner_id = v_me or g.guardian_id = v_me);
end;
$$;

-- 나를 지켜 주는 사람들 (닉네임 + 동만)
create or replace function public.my_guardians()
returns table (id uuid, name text, dong text, status text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_me uuid := public._require_profile();
begin
  return query
    select g.id, p.nickname, p.dong, g.status
      from public.guardians g
      join public.profiles p on p.id = g.guardian_id
     where g.owner_id = v_me
     order by g.created_at;
end;
$$;

-- 내가 지켜 주는 사람들 (마지막 체크인은 수락된 연결에서만)
create or replace function public.my_watched()
returns table (id uuid, name text, dong text, status text, last_checkin_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_me uuid := public._require_profile();
begin
  return query
    select g.id, p.nickname, p.dong, g.status,
           case when g.status = 'accepted' then p.last_checkin_at else null end
      from public.guardians g
      join public.profiles p on p.id = g.owner_id
     where g.guardian_id = v_me
     order by g.created_at;
end;
$$;

-- 알림 목록: 내 알림 전부 + (수락된 지킴이로서) 이웃의 missed/sos
create or replace function public.my_alerts(p_limit int default 30)
returns table (
  alert_id    uuid,
  kind        text,
  created_at  timestamptz,
  owner_name  text,
  dong        text,
  resolved_at timestamptz,
  is_mine     boolean
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_me    uuid := public._require_profile();
  v_limit int  := greatest(1, least(coalesce(p_limit, 30), 100));
begin
  return query
    select a.id, a.kind, a.created_at, p.nickname, p.dong, a.resolved_at, (a.owner_id = v_me)
      from public.alerts a
      join public.profiles p on p.id = a.owner_id
     where a.owner_id = v_me
        or (
          a.kind in ('missed', 'sos')
          and exists (
            select 1 from public.guardians g
             where g.owner_id = a.owner_id and g.guardian_id = v_me and g.status = 'accepted'
          )
        )
     order by a.created_at desc
     limit v_limit;
end;
$$;

-- SOS 보내기. 이미 열린 SOS 가 있으면 새로 만들지 않고 그걸 돌려줘요 (is_new = false).
create or replace function public.send_sos()
returns table (alert_id uuid, accepted_count int, is_new boolean)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_me    uuid := public._require_profile();
  v_count int;
  v_id    uuid;
  v_new   boolean := false;
begin
  select count(*) into v_count
    from public.guardians g
   where g.owner_id = v_me and g.status = 'accepted';
  if v_count = 0 then
    raise exception '수락한 지킴이가 아직 없어요. 급하면 119에 먼저 전화해 주세요.';
  end if;

  select a.id into v_id
    from public.alerts a
   where a.owner_id = v_me and a.kind = 'sos' and a.resolved_at is null;

  if v_id is null then
    insert into public.alerts (owner_id, kind) values (v_me, 'sos')
    on conflict (owner_id) where kind = 'sos' and resolved_at is null do nothing
    returning id into v_id;
    if v_id is not null then
      v_new := true;
    else
      -- 동시에 눌려서 다른 요청이 먼저 만들었어요
      select a.id into v_id
        from public.alerts a
       where a.owner_id = v_me and a.kind = 'sos' and a.resolved_at is null;
    end if;
  end if;

  return query select v_id, v_count, v_new;
end;
$$;

-- (H1) "가는 중이에요": 수락된 지킴이만, 열린 SOS 에만. 처음 응답이면 true.
create or replace function public.respond_en_route(p_alert uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me    uuid := public._require_profile();
  v_owner uuid;
  v_rows  int;
begin
  select a.owner_id into v_owner
    from public.alerts a
   where a.id = p_alert and a.kind = 'sos' and a.resolved_at is null;
  if v_owner is null then
    raise exception '이미 끝난 SOS예요.';
  end if;

  if not exists (
    select 1 from public.guardians g
     where g.owner_id = v_owner and g.guardian_id = v_me and g.status = 'accepted'
  ) then
    raise exception '이 SOS에는 응답할 수 없어요.';
  end if;

  insert into public.alert_responses (alert_id, guardian_id) values (p_alert, v_me)
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

-- (H2) 내 SOS 끝내기. 열린 게 없어도 오류 없이 넘어가요.
create or replace function public.end_sos()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public._require_profile();
begin
  update public.alerts a
     set resolved_at = now()
   where a.owner_id = v_me and a.kind = 'sos' and a.resolved_at is null;
end;
$$;

-- 내가 보낸 열린 SOS + 답해 준 지킴이 닉네임
create or replace function public.my_open_sos()
returns table (alert_id uuid, created_at timestamptz, responders text[])
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_me uuid := public._require_profile();
begin
  return query
    select a.id, a.created_at,
           coalesce(
             array(
               select p.nickname
                 from public.alert_responses r
                 join public.profiles p on p.id = r.guardian_id
                where r.alert_id = a.id
                order by r.created_at
             ),
             '{}'::text[]
           )
      from public.alerts a
     where a.owner_id = v_me and a.kind = 'sos' and a.resolved_at is null
     order by a.created_at desc
     limit 1;
end;
$$;

-- 내가 지키는 사람들의 열린 SOS (수락된 연결만, 닉네임 + 동만)
create or replace function public.incoming_sos()
returns table (alert_id uuid, owner_name text, dong text, created_at timestamptz, i_responded boolean)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_me uuid := public._require_profile();
begin
  return query
    select a.id, p.nickname, p.dong, a.created_at,
           exists (select 1 from public.alert_responses r where r.alert_id = a.id and r.guardian_id = v_me)
      from public.alerts a
      join public.profiles p on p.id = a.owner_id
     where a.kind = 'sos'
       and a.resolved_at is null
       and exists (
         select 1 from public.guardians g
          where g.owner_id = a.owner_id and g.guardian_id = v_me and g.status = 'accepted'
       )
     order by a.created_at desc;
end;
$$;

-- (L1) 푸시 구독 저장. 같은 주소가 이미 있으면 지금 로그인한 사람 것으로 바꿔요.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public._require_profile();
begin
  if coalesce(p_endpoint, '') = '' or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = ''
     or p_endpoint not like 'https://%'
     or char_length(p_endpoint) > 2000 or char_length(p_p256dh) > 500 or char_length(p_auth) > 500 then
    raise exception '알림 설정 정보가 올바르지 않아요.';
  end if;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth_key)
  values (v_me, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth_key = excluded.auth_key;
end;
$$;

-- (H3) 자동 점검용 (서버의 service_role 만 부를 수 있어요).
-- 한 번의 트랜잭션에서: 24시간 / 48시간 지난 사람을 잠그고(for update skip locked),
-- 표시를 남기고, 알림 기록을 만들고, "아직 푸시 안 보낸 알림 + 받을 사람" 을 돌려줘요.
-- 받을 사람이 없는 missed 알림은 recipient_id 가 null 인 줄로 나와요 (푸시는 건너뛰고 기록만).
create or replace function public.claim_due_alerts()
returns table (
  alert_id     uuid,
  kind         text,
  owner_id     uuid,
  owner_name   text,
  dong         text,
  recipient_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  r record;
begin
  -- 24시간: 본인에게 안내
  for r in
    select p.id, p.last_checkin_at
      from public.profiles p
     where p.last_checkin_at <= now() - interval '24 hours'
       and p.reminded_at is null
       for update skip locked
  loop
    update public.profiles p set reminded_at = now() where p.id = r.id;
    insert into public.alerts (owner_id, kind, cycle_started_at)
    values (r.id, 'reminder', r.last_checkin_at)
    on conflict do nothing;
  end loop;

  -- 48시간: 수락한 지킴이에게 알림 (지킴이가 0명이어도 기록은 남겨요)
  for r in
    select p.id, p.last_checkin_at
      from public.profiles p
     where p.last_checkin_at <= now() - interval '48 hours'
       and p.guardian_alerted_at is null
       for update skip locked
  loop
    update public.profiles p
       set guardian_alerted_at = now(),
           reminded_at = coalesce(p.reminded_at, now())
     where p.id = r.id;
    insert into public.alerts (owner_id, kind, cycle_started_at)
    values (r.id, 'missed', r.last_checkin_at)
    on conflict do nothing;
  end loop;

  return query
    select a.id, a.kind, a.owner_id, o.nickname, o.dong,
           case when a.kind = 'reminder' then a.owner_id else g.guardian_id end
      from public.alerts a
      join public.profiles o on o.id = a.owner_id
      left join public.guardians g
        on a.kind = 'missed'
       and g.owner_id = a.owner_id
       and g.status = 'accepted'
     where a.kind in ('reminder', 'missed')
       and a.pushed_at is null
       and a.created_at >= now() - interval '2 hours';
end;
$$;

-- ---------------------------------------------------------------------
-- 4. 함수 실행 권한 (H4): 기본값(누구나 실행)을 먼저 전부 걷어내고, 필요한 곳에만 열어요.
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.redeem_invite(text, text, text)        to authenticated;
grant execute on function public.my_profile()                           to authenticated;
grant execute on function public.checkin()                              to authenticated;
grant execute on function public.request_guardian(text)                 to authenticated;
grant execute on function public.accept_guardian(uuid)                  to authenticated;
grant execute on function public.remove_guardian(uuid)                  to authenticated;
grant execute on function public.my_guardians()                         to authenticated;
grant execute on function public.my_watched()                           to authenticated;
grant execute on function public.my_alerts(int)                         to authenticated;
grant execute on function public.send_sos()                             to authenticated;
grant execute on function public.respond_en_route(uuid)                 to authenticated;
grant execute on function public.end_sos()                              to authenticated;
grant execute on function public.my_open_sos()                          to authenticated;
grant execute on function public.incoming_sos()                         to authenticated;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;
-- 자동 점검 함수는 서버(service_role)만
grant execute on function public.claim_due_alerts() to service_role;

-- 앞으로 만들 함수도 기본적으로 아무에게나 열리지 않게
alter default privileges in schema public revoke execute on functions from public, anon;

-- ---------------------------------------------------------------------
-- 5. 초대 코드 넣는 법 (필요할 때 따로 실행해요. 아래 줄의 앞 "--" 를 지우고 코드를 바꿔서 Run)
-- ---------------------------------------------------------------------
-- insert into public.invite_codes (code) values ('여기에-초대코드') on conflict do nothing;
-- 코드는 대문자로 저장하세요 (앱이 입력값을 대문자로 바꿔서 비교해요).
