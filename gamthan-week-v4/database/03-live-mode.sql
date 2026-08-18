-- 실제 공개 전 반드시 실행하세요. 실제 한국 날짜를 사용합니다.
update public.app_settings
set setting_value = '', updated_at = now()
where setting_key = 'DEV_TEST_DATE';
