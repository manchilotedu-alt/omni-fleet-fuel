create table public.organization_app_state (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  data jsonb not null default '{"vehicles":[],"fuel":[],"offDays":[],"users":[],"settings":{}}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.organization_app_state enable row level security;
create policy "members can read app state" on public.organization_app_state
for select to authenticated using (private.is_org_member(organization_id));
create policy "authorized roles can create app state" on public.organization_app_state
for insert to authenticated with check (
  private.has_org_role(organization_id, array['admin','manager','supervisor','data_entry'])
  and updated_by = (select auth.uid())
);
create policy "authorized roles can update app state" on public.organization_app_state
for update to authenticated using (
  private.has_org_role(organization_id, array['admin','manager','supervisor','data_entry'])
) with check (
  private.has_org_role(organization_id, array['admin','manager','supervisor','data_entry'])
  and updated_by = (select auth.uid())
);
grant select, insert, update on public.organization_app_state to authenticated;
