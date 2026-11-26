-- 오늘도 안녕 1단계 DB 설계서
-- 사용법: Supabase 대시보드 > SQL Editor 에 이 파일 전체를 붙여넣고 Run 을 한 번 눌러요.

-- 1) 사용자 정보 (비밀번호·주민번호 같은 건 받지 않아요)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  dong text not null,                       -- 정확한 호수가 아니라 동 단위까지만
  consented_at timestamptz not null default now(),
  last_checkin_at timestamptz not null default now(),
  reminded_at timestamptz,                  -- 24시간 재알림을 보낸 시각
  guardian_alerted_at timestamptz,          -- 48시간 지킴이 알림을 보낸 시각
  created_at timestamptz not null default now()
);

-- 2) 초대 코드 (운영자가 Supabase 표에서 직접 한 줄씩 추가)
create table if not exists invite_codes (
  code text primary key,
  memo text,                                -- 누구에게 줬는지 등 꼭 필요한 최소 메모만
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid references profiles(id),
  used_at timestamptz
);

-- 3) 지킴이 연결 (본인당 최대 3명)
create table if not exists guardians (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  guardian_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  unique (owner_id, guardian_id),
  check (owner_id <> guardian_id)
);

create or replace function enforce_max_guardians() returns trigger as $$
begin
  if (select count(*) from guardians where owner_id = new.owner_id) >= 3 then
    raise exception '지킴이는 최대 3명까지 등록할 수 있어요';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_max_guardians on guardians;
create trigger trg_max_guardians before insert on guardians
  for each row execute function enforce_max_guardians();

-- 4) 알림 기록 (재알림 / 48시간 / SOS) 과 "가는 중" 표시
create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('reminder','missed','sos')),
  owner_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists alert_responses (
  alert_id uuid not null references alerts(id) on delete cascade,
  responder_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (alert_id, responder_id)
);

-- 5) 푸시 알림을 받을 기기 주소
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null
);

-- ===== 보안 규칙(RLS): 내 정보와 내 지킴이 관계만 볼 수 있게 =====
alter table profiles enable row level security;
alter table invite_codes enable row level security;   -- 정책 없음 = 앱에서 직접 못 봄
alter table guardians enable row level security;
alter table alerts enable row level security;
alter table alert_responses enable row level security;
alter table push_subscriptions enable row level security;

create policy "내 프로필 보기" on profiles for select using (id = auth.uid());
create policy "연결된 이웃 프로필 보기" on profiles for select using (
  exists (select 1 from guardians g
          where (g.owner_id = auth.uid() and g.guardian_id = profiles.id)
             or (g.guardian_id = auth.uid() and g.owner_id = profiles.id))
);

create policy "내 지킴이 관계 보기" on guardians for select
  using (owner_id = auth.uid() or guardian_id = auth.uid());
create policy "지킴이 요청 보내기" on guardians for insert
  with check (owner_id = auth.uid() and status = 'pending');
create policy "지킴이 요청 수락" on guardians for update
  using (guardian_id = auth.uid()) with check (guardian_id = auth.uid());
create policy "지킴이 관계 삭제" on guardians for delete
  using (owner_id = auth.uid() or guardian_id = auth.uid());

create policy "내 알림 또는 내가 지킴이인 알림 보기" on alerts for select using (
  owner_id = auth.uid() or exists (
    select 1 from guardians g
    where g.owner_id = alerts.owner_id and g.guardian_id = auth.uid() and g.status = 'accepted')
);
create policy "가는 중 응답 보기" on alert_responses for select using (true);
create policy "가는 중 응답하기" on alert_responses for insert with check (responder_id = auth.uid());

create policy "내 기기 주소 관리" on push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ===== 가입·안부·이웃 찾기 기능 (앱이 이 함수들을 불러요) =====

-- 초대 코드로 가입 완료: 코드가 유효하고 안 쓴 것일 때만 프로필을 만들어요.
create or replace function redeem_invite(p_code text, p_nickname text, p_dong text)
returns void as $$
begin
  if exists (select 1 from profiles where id = auth.uid()) then
    raise exception '이미 가입되어 있어요';
  end if;
  update invite_codes set used_at = now()
   where code = p_code and used_by is null and expires_at > now();
  if not found then
    raise exception '초대 코드가 올바르지 않거나 만료되었어요';
  end if;
  insert into profiles (id, nickname, dong) values (auth.uid(), p_nickname, p_dong);
  update invite_codes set used_by = auth.uid() where code = p_code;
end;
$$ language plpgsql security definer set search_path = public;

-- "저 괜찮아요" 버튼
create or replace function checkin() returns timestamptz as $$
  update profiles
     set last_checkin_at = now(), reminded_at = null, guardian_alerted_at = null
   where id = auth.uid()
  returning last_checkin_at;
$$ language sql security definer set search_path = public;

-- 닉네임으로 이웃 찾기 (이름·동만 보여 줘요)
create or replace function find_neighbor(p_nickname text)
returns table (id uuid, nickname text, dong text) as $$
  select id, nickname, dong from profiles
   where nickname = p_nickname and id <> auth.uid()
   limit 5;
$$ language sql security definer set search_path = public;
