-- 개발 중에만 사용하세요. 앱이 2026-10-01을 '오늘'로 인식합니다.
update public.app_settings
set setting_value = '2026-10-01', updated_at = now()
where setting_key = 'DEV_TEST_DATE';
