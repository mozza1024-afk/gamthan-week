-- 감탄위크 최종 안전설정
-- 1) 온라인 신청 정원을 100명으로 고정
-- 2) 동시에 여러 명이 신청해도 101번째 신청이 들어가지 않도록 DB에서 최종 차단

insert into public.app_settings (setting_key, setting_value)
values ('ONLINE_APPLICATION_LIMIT', '100')
on conflict (setting_key) do update
set setting_value = excluded.setting_value,
    updated_at = now();

create or replace function public.enforce_online_participant_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := 100;
  v_count integer := 0;
  v_should_check boolean := false;
begin
  if tg_op = 'INSERT' then
    v_should_check := new.registration_source = 'online' and coalesce(new.status, '') <> 'cancelled';
  elsif tg_op = 'UPDATE' then
    v_should_check := new.registration_source = 'online'
      and coalesce(new.status, '') <> 'cancelled'
      and (old.registration_source is distinct from 'online' or coalesce(old.status, '') = 'cancelled');
  end if;

  if not v_should_check then
    return new;
  end if;

  -- 이 설정 행을 잠가 동시 신청을 한 줄로 세웁니다.
  perform 1
  from public.app_settings
  where setting_key = 'ONLINE_APPLICATION_LIMIT'
  for update;

  select coalesce(nullif(setting_value, ''), '100')::integer
    into v_limit
  from public.app_settings
  where setting_key = 'ONLINE_APPLICATION_LIMIT';

  v_limit := coalesce(v_limit, 100);

  select count(*)
    into v_count
  from public.participants
  where registration_source = 'online'
    and coalesce(status, '') <> 'cancelled';

  if v_count >= v_limit then
    raise exception '온라인 신청 정원 %명이 마감되었습니다.', v_limit
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_online_participant_limit on public.participants;
drop trigger if exists enforce_online_participant_limit on public.participants;

create trigger trg_enforce_online_participant_limit
before insert or update of registration_source, status
on public.participants
for each row
execute function public.enforce_online_participant_limit();

-- 확인용: 결과가 100이면 정상
select setting_key, setting_value
from public.app_settings
where setting_key = 'ONLINE_APPLICATION_LIMIT';
