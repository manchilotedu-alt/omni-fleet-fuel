create table if not exists public.account_recovery_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  admin_notes text
);
create index if not exists account_recovery_requests_status_time_idx
  on public.account_recovery_requests (status, created_at desc);
create index if not exists account_recovery_requests_user_time_idx
  on public.account_recovery_requests (user_id, created_at desc);
alter table public.account_recovery_requests enable row level security;
revoke all on table public.account_recovery_requests from public, anon, authenticated;
grant all on table public.account_recovery_requests to service_role;
