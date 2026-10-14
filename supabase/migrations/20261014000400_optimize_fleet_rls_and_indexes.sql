
create index if not exists fuel_events_vehicle_org_idx on public.fuel_events(vehicle_id, organization_id);
create index if not exists vehicle_off_days_vehicle_org_idx on public.vehicle_off_days(vehicle_id, organization_id);
create index if not exists organization_app_state_updated_by_idx on public.organization_app_state(updated_by);

drop policy if exists "users can view own profile" on public.profiles;
create policy "users can view own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "authenticated members can add audit logs" on public.audit_logs;
create policy "authenticated members can add audit logs" on public.audit_logs for insert to authenticated
with check (private.is_org_member(organization_id) and actor_user_id = (select auth.uid()));

drop policy if exists "admins can manage memberships" on public.organization_members;
create policy "admins can add memberships" on public.organization_members for insert to authenticated
with check (private.has_org_role(organization_id, array['admin']));
create policy "admins can update memberships" on public.organization_members for update to authenticated
using (private.has_org_role(organization_id, array['admin']))
with check (private.has_org_role(organization_id, array['admin']));
create policy "admins can delete memberships" on public.organization_members for delete to authenticated
using (private.has_org_role(organization_id, array['admin']));

drop policy if exists "admins can manage organization settings" on public.organization_settings;
create policy "admins can add organization settings" on public.organization_settings for insert to authenticated
with check (private.has_org_role(organization_id, array['admin']));
create policy "admins can update organization settings" on public.organization_settings for update to authenticated
using (private.has_org_role(organization_id, array['admin']))
with check (private.has_org_role(organization_id, array['admin']));
create policy "admins can delete organization settings" on public.organization_settings for delete to authenticated
using (private.has_org_role(organization_id, array['admin']));
