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
  
-- Immutable history of block/unblock/approval transitions. A trigger writes these rows
-- in the same transaction as the status change so history cannot silently drift.
create table if not exists public.access_control_audit_events (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('account', 'device')),
  target_id uuid not null,
  action text not null check (action in ('block', 'unblock', 'approve')),
  actor_user_id uuid references auth.users(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists access_control_audit_events_target_idx
  on public.access_control_audit_events (target_type, target_id, created_at desc);
alter table public.access_control_audit_events enable row level security;
revoke all on public.access_control_audit_events from anon, authenticated;

create or replace function private.log_access_control_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $
declare
  v_old_status text;
  v_new_status text := to_jsonb(NEW) ->> 'status';
  v_target_type text;
  v_target_id uuid;
  v_action text;
  v_actor_id uuid;
  v_reason text := to_jsonb(NEW) ->> 'reason';
begin
  if TG_OP = 'UPDATE' then
    v_old_status := to_jsonb(OLD) ->> 'status';
  end if;

  if TG_TABLE_NAME = 'account_access_controls' then
    v_target_type := 'account';
    v_target_id := (to_jsonb(NEW) ->> 'user_id')::uuid;
    if v_new_status = 'blocked' and (TG_OP = 'INSERT' or v_old_status is distinct from 'blocked') then
      v_action := 'block';
    elsif v_new_status = 'active' and v_old_status = 'blocked' then
      v_action := 'unblock';
    else
      return NEW;
    end if;
    v_actor_id := nullif(to_jsonb(NEW) ->> 'updated_by', '')::uuid;
  elsif TG_TABLE_NAME = 'device_access_controls' then
    v_target_type := 'device';
    v_target_id := (to_jsonb(NEW) ->> 'id')::uuid;
    if v_new_status = 'blocked' and (TG_OP = 'INSERT' or v_old_status is distinct from 'blocked') then
      v_action := 'block';
      v_actor_id := nullif(to_jsonb(NEW) ->> 'blocked_by', '')::uuid;
    elsif v_new_status = 'approved' and v_old_status = 'pending' then
      v_action := 'approve';
      v_actor_id := nullif(to_jsonb(NEW) ->> 'approved_by', '')::uuid;
    elsif v_new_status = 'approved' and v_old_status = 'blocked' then
      v_action := 'unblock';
      v_actor_id := nullif(to_jsonb(NEW) ->> 'approved_by', '')::uuid;
    else
      return NEW;
    end if;
  else
    return NEW;
  end if;

  if nullif(btrim(v_reason), '') is null then
    v_reason := case v_action
      when 'block' then 'Blocked by administrator.'
      when 'unblock' then 'Access restored by administrator.'
      when 'approve' then 'Approved by administrator.'
      else 'Access status changed by administrator.'
    end;
  end if;

  insert into public.access_control_audit_events
    (target_type, target_id, action, actor_user_id, reason)
  values (v_target_type, v_target_id, v_action, v_actor_id, v_reason);
  return NEW;
end;
$;

revoke all on function private.log_access_control_transition() from public, anon, authenticated;
create trigger account_access_controls_audit
  after insert or update on public.account_access_controls
  for each row execute function private.log_access_control_transition();
create trigger device_access_controls_audit
  after insert or update on public.device_access_controls
  for each row execute function private.log_access_control_transition();

comment on table public.access_control_audit_events is
  'Append-only server-side history of account/device block, unblock, and approval transitions.';

create or replace function private.prevent_access_control_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $
begin
  raise exception 'Access-control audit events are immutable.';
end;
$;
revoke all on function private.prevent_access_control_audit_mutation() from public, anon, authenticated;
create trigger access_control_audit_immutable
  before update or delete on public.access_control_audit_events
  for each row execute function private.prevent_access_control_audit_mutation();


