-- 테스트용: 신청기간 제한을 우회하고 앱의 '오늘'을 2026-10-01로 맞춥니다.
-- 그래서 신청 → 로그인 → 1일차 감탄일기까지 바로 테스트할 수 있습니다.
update public.app_settings
set setting_value = '2026-10-01', updated_at = now()
where setting_key = 'DEV_TEST_DATE';

select setting_key, setting_value
from public.app_settings
where setting_key = 'DEV_TEST_DATE';
