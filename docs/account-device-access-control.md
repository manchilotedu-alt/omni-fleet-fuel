# Account and device access control

## Status

This feature is being developed on `feat/device-and-account-access-control`. The migration is a schema-only scaffold; it has not been applied to the connected Supabase project, and no production Edge Function or app behavior has been changed.

## Production migration-history warning

The connected production Supabase project currently reports migration versions/names that do not match several checked-in migration filenames in this repository. The password-recovery tables are present in production, but the history names alone do not establish that every repository migration has been applied in the same order. **Do not run a production migration push or apply the older tenant-security migration blindly.** First reconcile the production migration baseline with the repository and review the exact SQL that would run. The tenant-security migration in this branch has been syntax-corrected for clean setups, but it drops and recreates foreign-key constraints; that deserves a planned, reviewed rollout rather than an unverified production push.

## Required enforcement

- Account block is global to the auth user: deny sign-in and deny all app data operations from every phone.
- Device block is global to the device registration: deny sign-in/signup and app data for every account on that device.
- New/unrecognized device registrations default to `pending`; do not silently approve them.
- Unblocking an account must not unblock a device, and unblocking a device must not unblock an account.
- Record administrator, reason, and timestamps for approval/block transitions in an append-only audit table; status changes and audit events are written atomically.
- Never delete users, organization memberships, or fleet data as a side effect of blocking.
- Control tables are service-role-only; clients must not read or write them directly.
- All existing sessions must be rechecked against server-side account and device status, not only at login.

## First-device enrollment

Devices first seen after the enforcement migration remain pending unless an already-approved administrator approves them. A brand-new self-signup has no approved administrator device yet, so its first device requires a trusted platform-operator approval/provisioning step; do not add a self-approval exception, because that would let a device-block bypass create a new account.

## Coordinated release

The enforcement migration deliberately denies database access to sessions that have not been registered to an approved device and bound to the current Supabase session. Do not apply it separately from the matching Edge Function and client release. Older sideloaded APKs may not send the new device/session fields and may lose access until updated. Build and test the replacement APK, prepare first-device approvals, and rehearse the rollout in a non-production environment before applying either migration to production.

## Trusted first-device provisioning (operator-only)

New signups intentionally cannot self-approve their first device. For a verified first-time organization owner, a trusted operator can inspect pending registrations in the Supabase SQL editor (never expose service-role credentials in the app):

```sql
select d.id, d.status, d.device_label, d.first_seen_at,
       m.user_id, p.full_name, p.phone, m.organization_id
from public.device_access_controls d
join public.device_access_memberships m on m.device_id = d.id
left join public.profiles p on p.id = m.user_id
where d.status = 'pending'
order by d.first_seen_at desc;
```

Verify the person and organization out-of-band before approving the exact device ID. Replace both UUID placeholders with the verified operator's auth user ID and the pending device ID:

```sql
update public.device_access_controls
set status = 'approved',
    approved_by = 'OPERATOR_AUTH_USER_UUID',
    reason = 'First device verified by support',
    updated_at = now(),
    blocked_at = null
where id = 'VERIFIED_PENDING_DEVICE_UUID'
  and status = 'pending';
```

The operator should confirm exactly one row was updated. The user then signs in again so the Edge Function binds the approved device to the new Supabase session. Never approve a device solely because the requester says their previous phone was blocked.

## Device identity limitation

A sideloaded Android APK cannot reliably prove that two installations before and after a factory reset are the same physical phone using an app-generated UUID alone. Reinstall/reset may erase local identifiers. Unknown registrations must therefore remain pending by default. For a stronger same-physical-device guarantee across factory reset, the deployment needs supported Android Enterprise/MDM device ownership or an appropriate managed-device attestation strategy. Do not advertise a normal sideloaded APK as factory-reset-proof.

## Acceptance tests before release

1. Block an account; its existing session and sign-in on another phone are denied.
2. Block a device; a second account on the same registered device is denied.
3. Account unblocking does not lift device blocking.
4. Device unblocking does not lift account blocking.
5. Unknown device is pending/denied until approved.
6. Existing data and memberships remain intact after either kind of block.
7. Non-admin users cannot list, approve, unblock, or block accounts/devices.
8. Every data operation rechecks access server-side; UI-only checks do not count.
9. Existing sign-in, recovery, organization isolation, Android back button, and fuel workflows pass regression tests.
10. No production migration/function deployment until the branch has passed review and explicit release approval.
