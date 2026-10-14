create extension if not exists pgcrypto;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My Fleet',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  preferred_language text not null default 'en' check (preferred_language in ('en','am')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'manager' check (role in ('admin','manager','supervisor','data_entry','viewer')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plate_number text not null,
  vehicle_code text,
  vehicle_name text not null,
  vehicle_type text,
  fuel_type text,
  fuel_cycle_working_days integer not null default 7 check (fuel_cycle_working_days > 0),
  branch text,
  last_filled_date date,
  working_days_used integer not null default 0 check (working_days_used >= 0),
  is_active boolean not null default true,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, plate_number),
  unique (id, organization_id)
);
create table public.fuel_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null,
  event_type text not null default 'normal' check (event_type in ('normal','early','override')),
  filled_at timestamptz not null default now(),
  fuel_date date not null default current_date,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  currency text not null default 'ETB' check (currency in ('ETB','USD')),
  payment_method text,
  reason text,
  approved_by uuid references auth.users(id) on delete set null,
  notes text,
  cycle_reset boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint fuel_events_vehicle_org_fkey foreign key (vehicle_id, organization_id)
    references public.vehicles(id, organization_id) on delete cascade
);
create table public.vehicle_off_days (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null,
  off_date date not null,
  reason text not null check (reason in ('garage','breakdown','driver_absence','holiday','maintenance','other')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (vehicle_id, off_date),
  constraint vehicle_off_days_vehicle_org_fkey foreign key (vehicle_id, organization_id)
    references public.vehicles(id, organization_id) on delete cascade
);
create table public.organization_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  default_currency text not null default 'ETB' check (default_currency in ('ETB','USD')),
  sunday_is_off_day boolean not null default true,
  enable_custom_off_days boolean not null default true,
  require_approval_for_override boolean not null default true,
  preferred_language text not null default 'en' check (preferred_language in ('en','am')),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index organization_members_user_idx on public.organization_members(user_id);
create index organizations_created_by_idx on public.organizations(created_by);
create index vehicles_org_active_idx on public.vehicles(organization_id, is_active);
create index vehicles_created_by_idx on public.vehicles(created_by);
create index fuel_events_org_date_idx on public.fuel_events(organization_id, fuel_date desc);
create index fuel_events_vehicle_date_idx on public.fuel_events(vehicle_id, fuel_date desc);
create index fuel_events_approved_by_idx on public.fuel_events(approved_by);
create index fuel_events_created_by_idx on public.fuel_events(created_by);
create index vehicle_off_days_org_date_idx on public.vehicle_off_days(organization_id, off_date desc);
create index vehicle_off_days_created_by_idx on public.vehicle_off_days(created_by);
create index organization_settings_updated_by_idx on public.organization_settings(updated_by);
create index audit_logs_org_created_idx on public.audit_logs(organization_id, created_at desc);
create index audit_logs_actor_user_idx on public.audit_logs(actor_user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public
as $$ begin new.updated_at = now(); return new; end; $$;
create trigger organizations_set_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger vehicles_set_updated_at before update on public.vehicles for each row execute function public.set_updated_at();

create or replace function public.is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.organization_members m where m.organization_id = target_org and m.user_id = auth.uid()); $$;
create or replace function public.has_org_role(target_org uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.organization_members m where m.organization_id = target_org and m.user_id = auth.uid() and m.role = any(allowed_roles)); $$;

create or replace function public.bootstrap_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare new_org_id uuid; full_name_value text; language_value text;
begin
  full_name_value := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(coalesce(new.email, ''), '@', 1), 'Fleet Admin');
  language_value := case when new.raw_user_meta_data ->> 'preferred_language' = 'am' then 'am' else 'en' end;
  insert into public.profiles (id, full_name, phone, preferred_language) values (new.id, full_name_value, nullif(new.phone, ''), language_value) on conflict (id) do nothing;
  insert into public.organizations (name, created_by) values (coalesce(nullif(trim(new.raw_user_meta_data ->> 'organization_name'), ''), full_name_value || '''s Fleet'), new.id) returning id into new_org_id;
  insert into public.organization_members (organization_id, user_id, role) values (new_org_id, new.id, 'admin') on conflict (organization_id, user_id) do nothing;
  insert into public.organization_settings (organization_id, updated_by) values (new_org_id, new.id) on conflict (organization_id) do nothing;
  return new;
end;
$$;
revoke all on function public.bootstrap_new_user() from public, anon, authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;
revoke all on function public.is_org_member(uuid) from public, anon;
revoke all on function public.has_org_role(uuid, text[]) from public, anon;
create trigger on_auth_user_created_fleet after insert on auth.users for each row execute function public.bootstrap_new_user();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.vehicles enable row level security;
alter table public.fuel_events enable row level security;
alter table public.vehicle_off_days enable row level security;
alter table public.organization_settings enable row level security;
alter table public.audit_logs enable row level security;

create policy "members can view their organizations" on public.organizations for select to authenticated using (public.is_org_member(id));
create policy "admins can update their organizations" on public.organizations for update to authenticated using (public.has_org_role(id, array['admin'])) with check (public.has_org_role(id, array['admin']));
create policy "users can view own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "users can update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "members can view memberships in their organizations" on public.organization_members for select to authenticated using (public.is_org_member(organization_id));
create policy "admins can manage memberships" on public.organization_members for all to authenticated using (public.has_org_role(organization_id, array['admin'])) with check (public.has_org_role(organization_id, array['admin']));
create policy "members can view vehicles" on public.vehicles for select to authenticated using (public.is_org_member(organization_id));
create policy "authorized roles can add vehicles" on public.vehicles for insert to authenticated with check (public.has_org_role(organization_id, array['admin','manager','data_entry']));
create policy "authorized roles can update vehicles" on public.vehicles for update to authenticated using (public.has_org_role(organization_id, array['admin','manager','data_entry'])) with check (public.has_org_role(organization_id, array['admin','manager','data_entry']));
create policy "admins and managers can delete vehicles" on public.vehicles for delete to authenticated using (public.has_org_role(organization_id, array['admin','manager']));
create policy "members can view fuel events" on public.fuel_events for select to authenticated using (public.is_org_member(organization_id));
create policy "authorized roles can add fuel events" on public.fuel_events for insert to authenticated with check (public.has_org_role(organization_id, array['admin','manager','supervisor','data_entry']));
create policy "admins and managers can update fuel events" on public.fuel_events for update to authenticated using (public.has_org_role(organization_id, array['admin','manager'])) with check (public.has_org_role(organization_id, array['admin','manager']));
create policy "admins can delete fuel events" on public.fuel_events for delete to authenticated using (public.has_org_role(organization_id, array['admin']));
create policy "members can view off days" on public.vehicle_off_days for select to authenticated using (public.is_org_member(organization_id));
create policy "authorized roles can add off days" on public.vehicle_off_days for insert to authenticated with check (public.has_org_role(organization_id, array['admin','manager','supervisor','data_entry']));
create policy "authorized roles can update off days" on public.vehicle_off_days for update to authenticated using (public.has_org_role(organization_id, array['admin','manager','supervisor','data_entry'])) with check (public.has_org_role(organization_id, array['admin','manager','supervisor','data_entry']));
create policy "admins and managers can delete off days" on public.vehicle_off_days for delete to authenticated using (public.has_org_role(organization_id, array['admin','manager']));
create policy "members can view organization settings" on public.organization_settings for select to authenticated using (public.is_org_member(organization_id));
create policy "admins can manage organization settings" on public.organization_settings for all to authenticated using (public.has_org_role(organization_id, array['admin'])) with check (public.has_org_role(organization_id, array['admin']));
create policy "members can view audit logs" on public.audit_logs for select to authenticated using (public.is_org_member(organization_id));
create policy "authenticated members can add audit logs" on public.audit_logs for insert to authenticated with check (public.is_org_member(organization_id) and actor_user_id = (select auth.uid()));

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, update on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
grant select, insert, update, delete on public.vehicles to authenticated;
grant select, insert, update, delete on public.fuel_events to authenticated;
grant select, insert, update, delete on public.vehicle_off_days to authenticated;
grant select, insert, update, delete on public.organization_settings to authenticated;
grant select, insert on public.audit_logs to authenticated;
