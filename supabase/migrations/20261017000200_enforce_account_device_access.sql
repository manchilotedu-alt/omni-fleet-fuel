-- Server-side access gate for account and registered-device blocks.
-- Apply only together with the matching app-auth release that sets active_device_access_id.
create or replace function private.is_account_device_access_allowed()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_device_id uuid;
  v_account_status text;
  v_device_status text;
begin
  if v_user_id is null then
    return false;
  end if;

  select c.status into v_account_status
  from public.account_access_controls c
  where c.user_id = v_user_id;

  if coalesce(v_account_status, 'active') = 'blocked' then
    return false;
  end if;

  -- Read the current server-side app metadata rather than relying on a potentially stale JWT claim.
  select nullif(u.raw_app_meta_data ->> 'active_device_access_id', '')::uuid
    into v_device_id
  from auth.users u
  where u.id = v_user_id;

  if v_device_id is null then
    return false;
  end if;

  select d.status into v_device_status
  from public.device_access_controls d
  where d.id = v_device_id;

  return coalesce(v_device_status, 'pending') = 'approved';
end;
$$;

revoke all on function private.is_account_device_access_allowed() from public;
grant execute on function private.is_account_device_access_allowed() to authenticated;

-- Restrictive policies compose with the existing organization/role policies:
-- they never grant organization access, they only deny blocked accounts/devices.
do $$
declare
  t text;
  tables text[] := array[
    'organizations',
    'profiles',
    'organization_members',
    'vehicles',
    'fuel_events',
    'vehicle_off_days',
    'organization_settings',
    'audit_logs',
    'organization_app_state'
  ];
begin
  foreach t in array tables loop
    execute format(
      'drop policy if exists account_device_access_gate on public.%I',
      t
    );
    execute format(
      'create policy account_device_access_gate on public.%I as restrictive for all to authenticated using (private.is_account_device_access_allowed()) with check (private.is_account_device_access_allowed())',
      t
    );
  end loop;
end
$$;

comment on function private.is_account_device_access_allowed() is
  'Restrictive RLS gate: blocks account-wide status and requires an approved device registration in the JWT app_metadata.';
