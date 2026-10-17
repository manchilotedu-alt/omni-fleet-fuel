# Platform Owner-managed accounts

## Branch and rollout safety

- Feature branch: `feat/device-and-account-access-control`
- Platform Owner schema: `supabase/migrations/20261017000300_platform_owner_user_management.sql`
- Admin Edge Function: `supabase/functions/platform-admin/index.ts`
- Public self-registration is denied in `account-auth`; sign-in, recovery and device-control actions remain separate.
- The new migration and function are committed to the feature branch only. They have **not** been applied/deployed to the connected Supabase project.
- Do not merge the PR or apply production migrations/functions without explicit release approval.

## Data model

- `platform_owner_access`: explicit server-side allowlist for Edmar/Platform Owner. The initial row must be provisioned by a trusted operator after verifying the owner's auth user UUID.
- `platform_user_subscriptions`: trial start/end, payment status, paid-through date and notes. This is independent from account/device access state.
- `platform_owner_audit_events`: append-only intent log for account and subscription changes. Passwords and secrets must never be included.
- `profiles.alternate_phone`: optional alternate contact number.
- Existing `organizations`, `organization_members`, vehicles, fuel history and app-state references are retained. Account creation invokes the existing auth bootstrap behavior; no existing fleet rows are deleted or rewritten.

## Edge Function actions

The new `platform-admin` function includes:
- `list-users`
- `create-user` (full name, main phone, optional alternate phone, temporary password and trial duration)
- `set-subscription`
- `set-account-access`
- `reset-user-password`
- `change-own-password`

Each action verifies the caller's Supabase session, explicit Platform Owner allowlist entry and approved-device binding. Service-role credentials are used only server-side. User creation sets `app_metadata.must_change_password = true`; password reset sets the same flag. The UI/client must still be wired to call the function and force a password change before normal app use.

## Required first-time provisioning

The first owner cannot authorize themselves through the app, and a new account's first device must not auto-approve itself. Before enabling this feature, a trusted operator must:
1. Reconcile the live migration history against the checked-in branch migrations; the live project currently has a different migration naming/baseline. Do not push migrations blindly.
2. Apply the reviewed schema migration in a non-production environment first.
3. Verify Edmar's existing Auth user UUID out-of-band and add that exact UUID to `platform_owner_access`.
4. Verify and approve the exact first owner device registration using the existing account/device procedure.
5. Deploy the matching Edge Functions and UI together only after tests and explicit release approval.

Example owner allowlist seed for a reviewed environment (replace the UUID with the verified Auth user ID; do not guess it):

```sql
insert into public.platform_owner_access (user_id, is_active, reason)
values ('VERIFIED_OWNER_AUTH_USER_UUID', true, 'Initial Platform Owner provisioned by trusted operator')
on conflict (user_id) do update
set is_active = true, revoked_at = null, reason = excluded.reason;
```

## Important incomplete items

This is the backend/schema foundation, not a finished user-management screen. The existing app UI still needs:
- Platform Owner-only navigation and create/list/edit controls wired to `platform-admin`.
- A forced password-change screen that checks `must_change_password` after sign-in.
- A safe way to communicate the temporary password once; it must not be persisted in app state, audit details, logs or the database.
- End-to-end tests for owner/non-owner access, duplicate phone handling, subscription changes, account block/unblock, password reset/change and existing fuel workflows.
- A regression review of existing sign-in, recovery, device approvals and the current organization data isolation model.

The API intentionally does not treat payment status as account/device status. Payment/trial restrictions need a separate server-side enforcement policy before the UI can claim that expired/unpaid accounts are actually prevented from using the fleet app.
