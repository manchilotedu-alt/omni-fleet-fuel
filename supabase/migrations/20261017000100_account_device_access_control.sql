-- OMNI Fleet Fuel: account-wide and device-wide access controls.
-- This migration creates control records only; it does not delete or rewrite existing user/fleet data.
create table if not exists public.account_access_controls (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'blocked')),
  reason text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  blocked_at timestamptz
);

create table if not exists public.account_device_access_settings (
  id boolean primary key default true check (id),
  enforced_since timestamptz not null default now()
);
insert into public.account_device_access_settings (id) values (true)
on conflict (id) do nothing;

create table if not exists public.device_access_controls (
  id uuid primary key default gen_random_uuid(),
  device_key_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'approved', 'blocked')),
  device_label text,
  reason text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  approved_by uuid references auth.users(id) on delete set null,
  blocked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  blocked_at timestamptz
);

create table if not exists public.device_access_memberships (
  device_id uuid not null references public.device_access_controls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (device_id, user_id, organization_id)
);

create index if not exists device_access_memberships_org_idx
  on public.device_access_memberships (organization_id, last_seen_at desc);
create index if not exists device_access_memberships_user_idx
  on public.device_access_memberships (user_id, last_seen_at desc);

alter table public.account_access_controls enable row level security;
alter table public.account_device_access_settings enable row level security;
alter table public.device_access_controls enable row level security;
alter table public.device_access_memberships enable row level security;

-- Access is intentionally mediated by the account-auth Edge Function using its server-only service role.
-- Do not expose these control tables to client-side reads or writes.
revoke all on public.account_access_controls from anon, authenticated;
revoke all on public.account_device_access_settings from anon, authenticated;
revoke all on public.device_access_controls from anon, authenticated;
revoke all on public.device_access_memberships from anon, authenticated;

comment on table public.account_access_controls is
  'Server-enforced account-wide access status; blocked accounts must not sign in from any device.';
comment on table public.device_access_controls is
  'Server-enforced global device status; pending devices are denied until an organization admin approves them.';
comment on table public.device_access_memberships is
  'Links device registrations to users and organizations for scoped administrator review; does not own or delete fleet data.';
