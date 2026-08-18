-- 신청기간을 바꾸고 싶을 때 날짜 두 곳만 수정한 뒤 실행하세요.
update public.app_settings
set setting_value = case setting_key
  when 'APPLICATION_START_DATE' then '2026-09-01'
  when 'APPLICATION_END_DATE' then '2026-09-30'
end,
updated_at = now()
where setting_key in ('APPLICATION_START_DATE', 'APPLICATION_END_DATE');

select setting_key, setting_value
from public.app_settings
where setting_key in ('APPLICATION_START_DATE', 'APPLICATION_END_DATE')
order by setting_key;
