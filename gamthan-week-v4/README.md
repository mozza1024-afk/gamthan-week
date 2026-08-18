# 감탄위크 마라톤 – 나의 감탄일기 v3

명륜종합사회복지관·온기동행 감탄위크 마라톤 시민 참여 웹앱입니다.

## 이미 준비된 Supabase
- 참여자 / 기관 / 실천항목 / 감탄일기 / 완주사진 테이블
- 온라인 신청 100명 제한
- RLS 활성화
- `completion-photos` 비공개 버킷

## 이 저장소에 포함된 기능
- 모바일 첫 화면: 상단 명륜종합사회복지관 로고 + 중앙 온기동행 로고
- 온라인 참여 신청
- 휴대전화번호 + 휴대전화번호 뒤 4자리 로그인
- 로그인 5회 실패 시 10분 잠금
- 7/14/21/28일 코스
- 참여기간의 오늘 일기만 작성 및 당일 수정
- 실천항목 복수 선택 + 기타활동
- 지난 감탄일기 조회
- 진행률 표시
- 모든 일기 작성 후 완주 인증사진 최소 1장, 최대 3장
- 브라우저에서 사진 자동 압축 후 비공개 Supabase Storage 업로드

## Cloudflare Pages 배포 설정
GitHub 저장소를 Cloudflare Pages에 연결합니다.

- Framework preset: `None`
- Build command: `exit 0`
- Build output directory: `public`
- Root directory: 비워두기

Pages Functions는 저장소 루트의 `/functions` 폴더에서 자동 배포됩니다.

## Cloudflare에서 딱 1개의 비밀값 설정
Cloudflare Pages 프로젝트 > Settings > Variables and Secrets에서 아래 값을 **Secret**으로 추가합니다.

`SUPABASE_SECRET_KEY`

값은 Supabase > Project Settings > API Keys의 `Secret key (sb_secret_...)`입니다.
이 키는 절대 GitHub 파일에 적지 마세요.

Supabase 프로젝트 URL은 현재 프로젝트에 맞춰 서버 코드에 설정되어 있습니다.

## 개발 테스트
Supabase SQL Editor에서 `database/02-test-mode.sql`을 실행하면 앱이 오늘을 `2026-10-01`로 인식합니다.
개발모드에서는 신청기간 제한도 자동으로 우회되어 신청→로그인→1일차 일기까지 테스트할 수 있습니다.

## 신청기간 바꾸기
Supabase > Table Editor > `app_settings`에서 아래 두 값만 바꾸면 됩니다.
- `APPLICATION_START_DATE`: 신청 시작일
- `APPLICATION_END_DATE`: 신청 종료일

SQL로 바꾸려면 `database/04-application-period.sql` 파일의 날짜 두 곳만 수정한 뒤 실행하세요.

## 실제 공개 직전
반드시 `database/03-live-mode.sql`을 실행해 `DEV_TEST_DATE`를 비웁니다.
그러면 실제 한국 날짜 기준으로 신청기간/실천기간이 적용됩니다.

## 개인정보 보안
- Supabase Secret Key는 Cloudflare 서버 함수에서만 사용
- 브라우저에는 Secret Key가 노출되지 않음
- 개인정보 테이블은 RLS 활성화 상태 유지
- 완주사진 버킷은 Private 유지

## v4 수정사항
- 참여 신청 시 별도 비밀번호 입력 없음
- 로그인 비밀번호는 신청 휴대전화번호 뒤 4자리
- Cloudflare Web Crypto PBKDF2 제한에 맞춰 100,000 iterations 사용
