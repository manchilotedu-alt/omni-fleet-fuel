-- OMNI Fleet Fuel: Platform Owner-managed accounts and subscription lifecycle.
-- Schema-only migration. Do not apply to the connected/live Supabase project without explicit approval.
-- Existing organization and fleet rows are preserved; no user or fleet data is deleted.

-- A trusted operator must explicitly provision the initial Platform Owner by auth user UUID.
-- This table is never writable/readable by anon/authenticated clients.
create table if not exists public.platform_owner_access (
  user_id uuid primary key references auth.users(id) on delete restrict,
  is_active boolean not null default true,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  reason text
);
alter table public.platform_owner_access enable row level security;
revoke all on public.platform_owner_access from anon, authenticated;

-- Subscription/trial/payment state is deliberately separate from account and device access controls.
-- No password, password hash, or temporary password is stored in this table.
create table if not exists public.platform_user_subscriptions (
  user_id uuid primary key references auth.users(id) on delete restrict,
  trial_starts_at timestamptz,
  trial_ends_at timestamptz,
  payment_status text not null default 'trial'
    check (payment_status in ('trial', 'unpaid', 'paid', 'overdue', 'expired', 'comped')),
  paid_through date,
  access_note text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_trial_dates_valid
    check (trial_ends_at is null or trial_starts_at is null or trial_ends_at >= trial_starts_at)
);
create index if not exists platform_user_subscriptions_payment_status_idx
  on public.platform_user_subscriptions(payment_status, trial_ends_at, paid_through);
alter table public.platform_user_subscriptions enable row level security;
revoke all on public.platform_user_subscriptions from anon, authenticated;

-- Append-only audit trail for Platform Owner account and subscription administration.
-- Do not place temporary passwords, password reset tokens, or secrets in details.
create table if not exists public.platform_owner_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  target_user_id uuid,
  action text not null check (action in (
    'user_created', 'temporary_password_reset', 'password_change_required',
    'trial_set', 'trial_extended', 'payment_status_changed',
    'subscription_extended', 'account_access_blocked', 'account_access_restored',
    'owner_access_granted', 'owner_access_revoked'
  )),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists platform_owner_audit_events_target_idx
  on public.platform_owner_audit_events(target_user_id, created_at desc);
alter table public.platform_owner_audit_events enable row level security;
revoke all on public.platform_owner_audit_events from anon, authenticated;

-- Existing profiles are extended without replacing or removing current fields.
alter table public.profiles
  add column if not exists alternate_phone text;

comment on table public.platform_owner_access is
  'Explicit allowlist for Platform Owner privileges; provisioned only by trusted server/operator.';
comment on table public.platform_user_subscriptions is
  'Platform-controlled trial and payment state, independent of account/device access controls.';
comment on table public.platform_owner_audit_events is
  'Append-only audit history for Platform Owner account and subscription administration; never store passwords.';

create or replace function private.prevent_platform_owner_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $
begin
  raise exception 'Platform Owner audit events are immutable.';
end;
$;
revoke all on function private.prevent_platform_owner_audit_mutation() from public, anon, authenticated;
drop trigger if exists platform_owner_audit_immutable on public.platform_owner_audit_events;
create trigger platform_owner_audit_immutable
  before update or delete on public.platform_owner_audit_events
  for each row execute function private.prevent_platform_owner_audit_mutation();
