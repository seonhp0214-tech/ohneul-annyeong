-- =====================================================================
-- 오늘도 안녕 - 10분마다 "24시간/48시간 점검" 자동 실행 설정 (cron.sql)
-- ---------------------------------------------------------------------
-- 이 파일은 자동으로 실행되지 않아요. schema.sql 을 먼저 실행한 뒤,
-- 앱을 Vercel 에 올려서 주소가 생기고 CRON_SECRET 도 정한 다음에 "직접" 한 번 실행해요.
--
-- 하는 일: Supabase 가 10분마다 우리 앱의 /api/cron/due-alerts 주소를 호출해요.
--          앱은 24시간 / 48시간 동안 체크인이 없는 사람을 찾아 푸시 알림을 보내요.
--
-- 미리 해 둘 일 (Supabase 대시보드)
--   Database > Extensions 에서 pg_cron, pg_net 을 켜세요 (Enable).
--   (아래 create extension 줄이 대신 켜 주기도 하지만, 권한 오류가 나면 화면에서 켜세요.)
--
-- 바꿔야 할 곳은 딱 2군데예요. 아래에서 "<< 여기 바꾸기 >>" 를 찾으세요.
--   (1) 비밀 문자열: Vercel 환경 변수 CRON_SECRET 에 넣은 값과 "똑같이"
--   (2) 앱 주소: 예) https://my-app.vercel.app  (끝에 / 없이)
--
-- 주의: 이 파일을 GitHub 같은 곳에 올릴 때는 비밀 문자열을 실제 값으로 바꾼 채로 올리지 마세요.
--       실행이 끝나면 비밀 문자열 자리를 다시 지워 두는 것이 안전해요.
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- (1) 비밀 문자열을 Supabase 금고(Vault)에 저장해요. 처음 한 번만 저장되고, 다시 실행해도 안전해요.
select vault.create_secret(
  '<< 여기 바꾸기 >> CRON_SECRET 값',   -- 따옴표 안을 Vercel 의 CRON_SECRET 값으로 바꾸세요
  'ohneul_cron_secret',
  '오늘도 안녕 자동 점검용 비밀 문자열'
)
where not exists (select 1 from vault.secrets where name = 'ohneul_cron_secret');

-- 나중에 CRON_SECRET 을 바꿨다면 위 대신 아래 줄(앞의 -- 제거)로 금고 값을 고치세요.
-- select vault.update_secret(
--   (select id from vault.secrets where name = 'ohneul_cron_secret'),
--   '새 CRON_SECRET 값'
-- );

-- (2) 10분마다 호출 예약. 같은 이름으로 다시 실행하면 기존 예약이 새 설정으로 바뀌어요.
select cron.schedule(
  'ohneul-due-alerts',
  '*/10 * * * *',
  $job$
  select net.http_post(
    url     := 'https://<< 여기 바꾸기 >>.vercel.app/api/cron/due-alerts',  -- 내 앱 주소로 바꾸세요
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'ohneul_cron_secret'
      )
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
  $job$
);

-- ---------------------------------------------------------------------
-- 확인하는 법 (각각 따로 실행)
--   예약이 있는지:     select jobid, jobname, schedule, active from cron.job;
--   최근 실행 기록:    select * from cron.job_run_details order by start_time desc limit 10;
--   호출 결과(응답):   select id, status_code, error_msg, created from net._http_response order by created desc limit 10;
--     status_code 200 이면 성공, 401 이면 비밀 문자열이 서로 달라요, 503 이면 Vercel 환경 변수가 덜 들어갔어요.
-- 멈추고 싶을 때:      select cron.unschedule('ohneul-due-alerts');
-- ---------------------------------------------------------------------
