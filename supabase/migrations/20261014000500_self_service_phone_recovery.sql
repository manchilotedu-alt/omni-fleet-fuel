alter table public.profiles
  add column if not exists father_full_name text not null default '',
  add column if not exists birth_date date,
  add column if not exists recovery_hash text;

create table if not exists public.account_recovery_attempts (
  id bigint generated always as identity primary key,
  phone text not null,
  ip_address text not null default 'unknown',
  succeeded boolean not null default false,
  attempted_at timestamptz not null default now()
);
create index if not exists account_recovery_attempts_phone_time_idx
  on public.account_recovery_attempts (phone, attempted_at desc);
create index if not exists account_recovery_attempts_ip_time_idx
  on public.account_recovery_attempts (ip_address, attempted_at desc);
alter table public.account_recovery_attempts enable row level security;
revoke all on table public.account_recovery_attempts from public, anon, authenticated;
grant all on table public.account_recovery_attempts to service_role;
