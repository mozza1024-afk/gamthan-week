-- 7KM 다시출발 마라톤: 기존 참가·일기 기록과 별도 관리
-- 운영 DB에서는 검토 및 백업 후 관리자가 한 번만 실행
begin;

create table if not exists public.restart_invitations (
  participant_id uuid primary key references public.participants(id) on delete restrict,
  selected_by_admin text not null,
  selected_at timestamptz not null default now(),
  sms_sent_at timestamptz,
  revoked_at timestamptz,
  note text
);
create index if not exists restart_invitations_sent_idx on public.restart_invitations(sms_sent_at);

create table if not exists public.restart_attempts (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null unique references public.participants(id) on delete restrict,
  start_date date not null,
  end_date date generated always as (start_date + 6) stored,
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  completed_at timestamptz,
  coupon_status text not null default 'pending' check (coupon_status in ('pending','issued','redeemed')),
  coupon_issued_at timestamptz,
  created_at timestamptz not null default now(),
  constraint restart_start_window check (start_date between date '2026-10-20' and date '2026-10-25')
);

create table if not exists public.restart_diaries (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.restart_attempts(id) on delete restrict,
  diary_date date not null,
  day_number integer not null check (day_number between 1 and 7),
  diary_text text not null check (length(trim(diary_text)) > 0),
  action_codes text[] not null default '{}',
  other_action_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attempt_id, diary_date),
  unique (attempt_id, day_number)
);

create table if not exists public.ongi_essays (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null unique references public.participants(id) on delete restrict,
  topic text not null default 'marathon',
  title text not null default '',
  body text not null default '',
  status text not null default 'draft' check (status in ('draft','submitted')),
  submitted_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists restart_diaries_attempt_idx on public.restart_diaries(attempt_id);
create index if not exists ongi_essays_status_idx on public.ongi_essays(status);

-- 모든 참가자 정보는 기존 서버 API 인증을 통해서만 접근
alter table public.restart_invitations enable row level security;
alter table public.restart_attempts enable row level security;
alter table public.restart_diaries enable row level security;
alter table public.ongi_essays enable row level security;
commit;
