# Omni-Fleet Fuel Monitoring

This repository is the source-code home for the Omni-Fleet Fuel Monitoring application.

## Migration status

- [x] Create repository documentation.
- [x] Import and verify the current AppDeploy source snapshot on the `migration/appdeploy-source` branch.
- [ ] Replace AppDeploy-specific frontend and backend SDK dependencies.
- [ ] Migrate authentication, sessions, OTP/recovery, and fleet persistence to Supabase.
- [ ] Add organization-scoped data access and row-level security.
- [ ] Configure Vercel environment variables and deploy a test version.
- [ ] Verify working-day/fuel calculations, calendar, reports, Excel export, and Amharic/English.
- [ ] Keep the original AppDeploy version untouched until the replacement passes testing.

## Important

The source snapshot is **not yet ready to deploy outside AppDeploy**. The frontend calls `/api/auth/*` and `/api/fleet-data`; the backend currently imports `@appdeploy/sdk`. Those routes and data services must be migrated before the Vercel build can be considered complete.

## Data isolation goal

Each organization must have isolated users, vehicles, drivers, working-day records, fuel events, settings, and reports, enforced by Supabase Auth and row-level security.

## Source branch

Current AppDeploy source snapshot: `migration/appdeploy-source`.
