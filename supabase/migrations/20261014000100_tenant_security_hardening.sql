-- Harden tenant access after the initial schema migration.
revoke all on function public.bootstrap_new_user() from public, anon, authenticated;
revoke all on function public.is_org_member(uuid) from public, anon;
revoke all on function public.has_org_role(uuid, text[]) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;
create index if not exists organization_members_user_idx on public.organization_members(user_id);
create index if not exists organizations_created_by_idx on public.organizations(created_by);
create index if not exists vehicles_created_by_idx on public.vehicles(created_by);
create index if not exists fuel_events_approved_by_idx on public.fuel_events(approved_by);
create index if not exists fuel_events_created_by_idx on public.fuel_events(created_by);
create index if not exists vehicle_off_days_created_by_idx on public.vehicle_off_days(created_by);
create index if not exists organization_settings_updated_by_idx on public.organization_settings(updated_by);
create index if not exists audit_logs_actor_user_idx on public.audit_logs(actor_user_id);
do $$ begin if not exists (select 1 from pg_constraint where conname = 'vehicles_id_org_unique' and conrelid = 'public.vehicles'::regclass) then alter table public.vehicles add constraint vehicles_id_org_unique unique (id, organization_id); end if; end $$;
alter table public.fuel_events drop constraint if exists fuel_events_vehicle_id_fkey;
alter table public.fuel_events drop constraint if exists fuel_events_vehicle_org_fkey;
alter table public.fuel_events add constraint fuel_events_vehicle_org_fkey foreign key (vehicle_id, organization_id) references public.vehicles(id, organization_id) on delete cascade;
alter table public.vehicle_off_days drop constraint if exists vehicle_off_days_vehicle_id_fkey;
alter table public.vehicle_off_days drop constraint if exists vehicle_off_days_vehicle_org_fkey;
alter table public.vehicle_off_days add constraint vehicle_off_days_vehicle_org_fkey foreign key (vehicle_id, organization_id) references public.vehicles(id, organization_id) on delete cascade;
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
