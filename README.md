# Omni-Fleet Fuel Monitoring

**Product requirement: mobile app only.** The primary experience is Android/mobile-first; desktop web is not a target UI. Any hosted deployment is for mobile app delivery/testing or backend APIs, not a separate desktop product.

## Migration status

- [x] Create separate Supabase project: `omni-fleet-fuel` (`mmgnyumsotudcbilvqep`).
- [x] Create core tables for organizations, profiles, memberships, vehicles, fuel events, off-days, settings, audit logs, and the mobile app state store.
- [x] Enable row-level security and role-based organization access policies. Security advisor scan is currently clean.
- [x] Ensure new Supabase Auth signups receive a new empty organization workspace; no demo fleet records are inserted.
- [x] Import and verify the current AppDeploy source snapshot on `migration/appdeploy-source`.
- [x] Replace the frontend AppDeploy API client with a Supabase Auth/data adapter.
- [ ] Retire the unused AppDeploy-only backend files after confirming no migration-only functionality depends on them.
- [x] Use phone number + password for account signup/sign-in; no SMS OTP provider is required for the selected flow.
- [x] Add Capacitor Android configuration and an automated APK build workflow.
- [ ] Complete Android APK build verification and test the app on a real Android phone, including biometric unlock on a device with enrolled biometrics.
- [x] Implement phone/password signup and sign-in with parent-name and birth-date recovery verification.
- [x] Queue verified password recovery requests for administrator assistance; direct password changes are not allowed from the recovery form.
- [x] Add optional native Face ID/fingerprint unlock using the device's biometric prompt.
- [x] Add an in-app administrator queue for password recovery, scoped to the caller's organization and protected by server-side role checks.
- [ ] Connect User Management to real Supabase Auth users and organization memberships; the existing User Management screen is still local UI state only. requests; pending requests are currently stored securely for administrator handling.
- [ ] Connect the User Management screen to real Supabase Auth invitations and organization memberships; its current list is still app-state data, not actual login accounts.
- [ ] Configure Vercel environment variables for mobile testing/API hosting, without touching Omni-dirsha.
- [ ] Verify working-day/fuel calculations, calendar, reports, Excel export, and Amharic/English.
- [ ] Keep the original AppDeploy version untouched until the replacement passes testing.

## Backend

- Supabase URL: `https://mmgnyumsotudcbilvqep.supabase.co`
- Supabase project ref: `mmgnyumsotudcbilvqep`
- Region: `eu-central-1` (Frankfurt)
- Each organization’s users, vehicles, fuel events, off-days, settings, and audit logs are isolated by organization ID and RLS.
- Never put a Supabase service-role key in mobile app code. Only the publishable/anon key may be used client-side with RLS enabled.

## Important

This branch is still a validation build, not a production release. The Android APK must pass the latest build and real-device tests before release. The User Management screen is not yet connected to real Supabase Auth accounts and organization memberships, and password-recovery requests still need an in-app administrator queue. Keep the original AppDeploy version untouched until the replacement passes testing.

## Source branch

Current AppDeploy source snapshot: `migration/appdeploy-source`.
