# Platform Owner-managed accounts

## Branch and rollout safety

- Feature branch: `feat/device-and-account-access-control`
- Pull request: [Draft PR #3](https://github.com/manchilotedu-alt/omni-fleet-fuel/pull/3)
- Platform Owner schema: `supabase/migrations/20261017000300_platform_owner_user_management.sql`
- Platform Owner Edge Function: `supabase/functions/platform-admin/index.ts`
- Shared session/device/payment enforcement: `supabase/functions/account-auth/index.ts`
- Public self-registration is denied server-side. The login screen directs new users to contact the Platform Owner.
- Changes remain on the feature branch. Do not merge the PR, apply live migrations, or deploy Edge Functions without explicit release approval.
- The connected Supabase project currently reports a different migration baseline and only the existing `account-auth` Edge Function. The new schema/function have not been deployed.

## Account and access model

There are only two platform-level account types: the explicitly allowlisted Platform Owner and normal fleet users. Organization membership remains a separate tenant-level concept; existing organizations and fleet data are retained.

The Platform Owner UI supports:

- Create a user with full name, required main phone, optional alternate phone, a temporary password and trial duration.
- List users and review trial/payment state, account access state and forced-password-change status.
- Block or restore account access without deleting organization or fleet records.
- Update payment/trial details and reset a user's password to a new temporary password.
- Force newly created/reset users to change their temporary password before entering the fleet app.

The backend validates the caller's Auth user, active server-bound Supabase session, approved device and explicit `platform_owner_access` allowlist row for all Platform Owner actions. Temporary passwords are not written to application tables or audit details.

## Data model

- `platform_owner_access`: explicit server-side allowlist for Platform Owner access. The initial row must be provisioned by a trusted operator after verifying the owner's Auth user UUID.
- `platform_user_subscriptions`: trial start/end, payment status, paid-through date and notes. Subscription state is separate from account/device access.
- `platform_owner_audit_events`: append-only history of Platform Owner account and subscription actions. Passwords and secrets must never be included.
- `profiles.alternate_phone`: optional alternate contact number.
- `account_access_controls` and `device_access_controls`: account-wide and device-wide access status remain independent.
- Existing `organizations`, `organization_members`, vehicles, fuel history and app-state references are retained. The existing Auth bootstrap trigger provisions an organization and admin membership for newly created Auth users.

## Server-side subscription enforcement

The `account-auth` `access-check` action now checks subscription status after validating session, device and account access:

- A current trial is allowed only while `trial_ends_at` is in the future.
- `paid` is allowed if `paid_through` is empty or has not passed.
- `comped` accounts remain allowed.
- `unpaid`, `overdue`, `expired`, expired trials and invalid trial records are denied access to fleet API operations.
- Existing users without a subscription row remain usable for rollout compatibility. New Platform Owner-created users receive a subscription row.

This policy requires the schema migration and matching Edge Function version to be deployed together. Until that approved rollout occurs, live payment enforcement is not active.

## Required first-time provisioning and release checks

The initial Platform Owner cannot authorize themselves through the app. Before enabling this feature, a trusted operator must:

1. Reconcile the live migration history against the checked-in branch migrations; do not push the feature migrations blindly.
2. Apply the reviewed schema in a non-production environment first and verify the RLS, constraints and audit triggers.
3. Verify the Platform Owner's existing Auth user UUID out-of-band and insert that exact UUID into `platform_owner_access`.
4. Verify and approve the exact first owner device registration through the existing account/device procedure. Do not auto-approve an unknown device.
5. Deploy the reviewed migration and matching `account-auth` and `platform-admin` Edge Functions together, then validate the owner UI against the deployed schema.
6. Complete manual regression tests for owner/non-owner authorization, user creation, duplicate phone handling, password change/reset, trial expiry, payment extension, account/device blocking, data preservation, recovery, organization isolation and fuel/calendar/report flows.

Example seed for a reviewed environment only (replace the placeholder with the verified Auth UUID; never guess it):

```sql
insert into public.platform_owner_access (user_id, is_active, reason)
values ('VERIFIED_OWNER_AUTH_USER_UUID', true, 'Initial Platform Owner provisioned by trusted operator')
on conflict (user_id) do update
set is_active = true, revoked_at = null, reason = excluded.reason;
```

## Validation status

- The latest observed GitHub Actions run for the prior branch head passed the Android debug APK build and Deno checks for both Edge Functions.
- A subsequent change added server-side trial/payment checks; the workflow must run again on that updated commit before this branch can be considered validated.
- Manual end-to-end tests and live schema/function rollout are still pending.
- PR #3 remains draft and must not be merged or deployed without explicit approval.
