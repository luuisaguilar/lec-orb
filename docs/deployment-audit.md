# Deployment Audit: Vercel Readiness

## Executive summary

This repository is not ready to deploy to Vercel yet.

Fresh verification on `2026-03-22` shows that `npm run build` fails during TypeScript compilation, so the current branch cannot produce a deployable Next.js build. The primary blockers are concentrated in API route typing and context mismatches, with the most important one matching the exact pattern requested for review: `zod` schemas using `optional().nullable()` produce `undefined`, while downstream code expects `null`.

The second class of issues is deployment integrity: the Supabase schema and the app are not fully aligned, there is no `.env.example`, the README is still the default Next.js template, and the repository lacks deploy/runbook documentation for Vercel or database migration order. There are also runtime risks that would survive a successful build, especially around onboarding, native-module routing, storage bucket setup, and permission resolution for non-admin users.

Verification performed:

- `npm.cmd install`
- `npm.cmd run build`
- `npx.cmd tsc --noEmit`
- `npm.cmd run lint`

Observed results:

- `build`: fails
- `typecheck`: fails
- `lint`: passes with 40 warnings and 0 errors
- `npm install`: completed, reported 6 vulnerabilities total

## Current blockers

1. TypeScript build failure in CENNI bulk import due to `undefined` vs `null`.
   Evidence: [src/app/api/v1/cenni/bulk/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/cenni/bulk/route.ts#L6) defines `celular`, `correo`, `certificado`, `datos_curp`, `cliente`, and `estatus_certificado` as `optional().nullable()`, and [src/app/api/v1/cenni/bulk/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/cenni/bulk/route.ts#L30) spreads them into `addBulkMockCenni(newCases)`, which expects `null` but not `undefined`.

2. Type errors in event availability and payments export/import routes from implicit `any`.
   Evidence: [src/app/api/v1/events/staff-availability/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/events/staff-availability/route.ts#L16), [src/app/api/v1/events/staff-availability/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/events/staff-availability/route.ts#L26), [src/app/api/v1/payments/export/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/payments/export/route.ts#L25), and [src/app/api/v1/payments/import/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/payments/import/route.ts#L99).

3. `withAuth` context and consumer mismatch in dynamic module record routes.
   Evidence: [src/app/api/v1/modules/[slug]/records/[recordId]/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/modules/[slug]/records/[recordId]/route.ts#L46) and [src/app/api/v1/modules/[slug]/records/[recordId]/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/modules/[slug]/records/[recordId]/route.ts#L81) destructure `enrichAudit`, but `AuthContext` in [src/lib/auth/with-handler.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/auth/with-handler.ts#L6) does not provide it. Even after typing is fixed, the current code would still throw at runtime if those branches execute.

4. `users/me` route references a property that is not loaded from Supabase.
   Evidence: [src/app/api/v1/users/me/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/users/me/route.ts#L22) returns `member.organizations`, but the member object defined by [src/lib/auth/get-member.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/auth/get-member.ts#L15) only contains `id`, `org_id`, `role`, and `location`.

5. `users` route has multiple implicit `any` failures under strict mode.
   Evidence: [src/app/api/v1/users/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/users/route.ts#L14), [src/app/api/v1/users/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/users/route.ts#L20), and [src/app/api/v1/users/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/users/route.ts#L31).

## Risks by severity

### Critical

- Build is currently blocked by TypeScript errors.
  Impact: Vercel deployment fails before runtime.
  Evidence: `npm run build` and `npx tsc --noEmit`.

- Registration/onboarding flow is inconsistent with the declared schema.
  Impact: new user signup can fail to create an organization, leaving auth partially completed.
  Evidence: [supabase/migrations/001_core_schema.sql](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/001_core_schema.sql#L15) requires `organizations.slug NOT NULL`, but [src/app/(auth)/register/page.tsx](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/(auth)/register/page.tsx#L80) inserts only `{ name }`. The later trigger rewrite in [supabase/migrations/20240302_trigger_schools_applicators.sql](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240302_trigger_schools_applicators.sql#L1) still inserts organizations without `slug`.

- Permission resolution for non-admin API users is brittle and likely wrong in production.
  Impact: supervisors/operators can receive unexpected `403` responses after deploy.
  Evidence: [src/lib/auth/permissions.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/auth/permissions.ts#L208) defines `MODULE_ALIAS_MAP`, but [src/lib/auth/permissions.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/auth/permissions.ts#L252) never uses it and hard-fails when no exact `member_module_access.module` row exists. Several API routes use module names such as `finanzas` instead of seeded module slugs like `payments`, `quotes`, or `purchase-orders`.

### High

- Native module routing is inconsistent with seeded module slugs.
  Impact: admin users can be routed to incorrect or nonexistent pages after login.
  Evidence: [supabase/migrations/20240310_documents_dms.sql](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240310_documents_dms.sql#L39) seeds slug `documents`, but [src/components/sidebar-nav.tsx](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/components/sidebar-nav.tsx#L48) maps `documentos` instead. [supabase/migrations/20240310_notifications.sql](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240310_notifications.sql#L62) seeds slug `notifications`, but [src/components/sidebar-nav.tsx](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/components/sidebar-nav.tsx#L173) falls back to `/dashboard/m/notifications`. The safety net in [src/app/(dashboard)/dashboard/m/[slug]/page.tsx](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/(dashboard)/dashboard/m/[slug]/page.tsx#L52) also lacks `documents`, `notifications`, `suppliers`, `toefl-codes`, and `studio`.

- Supabase document storage is only partially provisioned.
  Impact: document upload/download APIs can fail immediately after deploy even if the web app builds.
  Evidence: [src/app/api/v1/documents/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/documents/route.ts#L40) and [src/app/api/v1/documents/download/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/documents/download/route.ts#L12) require the `org-documents` bucket, but [supabase/migrations/20240310_documents_dms.sql](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240310_documents_dms.sql#L5) creates only the metadata table and RLS policies. No storage bucket creation or storage RLS policies are present in `supabase/migrations/`.

- Environment configuration is not documented or validated.
  Impact: Vercel deploy may build but fail at runtime with missing Supabase config, or silently enter demo mode.
  Evidence: there is no `.env.example` in the repo root; [src/lib/supabase/client.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/supabase/client.ts#L3), [src/lib/supabase/server.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/supabase/server.ts#L4), and [src/lib/supabase/proxy.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/supabase/proxy.ts#L5) use non-null assertions on env vars; [src/lib/demo/config.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/demo/config.ts#L5) enables demo mode whenever `NEXT_PUBLIC_SUPABASE_URL` equals the placeholder URL.

- Database migration history is divergent and under-documented.
  Impact: a fresh Supabase project can end up with a schema different from what the app expects, depending on migration order and reruns.
  Evidence: [supabase/migrations/001_core_schema.sql](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/001_core_schema.sql#L15) and [supabase/migrations/20240227_schema.sql](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240227_schema.sql#L1) define overlapping baseline structures for `organizations`, `profiles`, and membership tables.

### Medium

- Documentation and operational handoff are insufficient for another developer or release engineer.
  Impact: high manual setup risk on Vercel and Supabase.
  Evidence: [README.md](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/README.md#L1) is still the default Next.js template; there is no deploy guide, no `.env.example`, no `docs/` before this audit, and no CI workflow under `.github/`.

- Support scripts are not actually runnable from declared dependencies.
  Impact: local verification scripts give false confidence or fail unexpectedly.
  Evidence: [scripts/test-supabase.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/scripts/test-supabase.ts#L2) and [check_db.js](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/check_db.js#L3) require `dotenv`, but [package.json](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/package.json#L11) does not declare `dotenv`. There is also no script in `package.json` to execute these files.

- Repository hygiene is noisy for deployment work.
  Impact: higher risk of confusion during release and build debugging.
  Evidence: root-level artifacts such as `build_output.txt`, `eslint_report.json`, `lint_summary_clean.txt`, `fase2`, `fase3`, and the empty `lec-platform/` directory are committed alongside the app.

- No explicit `typecheck` script or CI gate exists.
  Impact: the current TypeScript regressions reached `main` without a deploy-quality gate.
  Evidence: [package.json](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/package.json#L5) defines `dev`, `build`, `start`, and `lint`, but no dedicated `typecheck`.

### Low

- Lint warnings are non-blocking but indicate cleanup debt in production code paths.
  Impact: lower code signal and more friction when tightening CI later.
  Evidence: `npm run lint` reported 40 warnings, mostly unused variables and unstable memo dependencies.

- No custom `vercel.json` is present.
  Impact: not a blocker by itself, but all deploy behavior currently depends on framework auto-detection and project settings in Vercel UI.

## Required fixes before Vercel deploy

1. Fix all current TypeScript errors so `npm run build` and `npx tsc --noEmit` pass.
   Scope:
   - normalize `optional().nullable()` payloads to explicit `null` before spreading into domain objects
   - type array mapping callbacks in strict routes
   - align `AuthContext` usage with what `withAuth` actually provides
   - correct `users/me` response shape

2. Resolve the organization/signup schema mismatch.
   Scope:
   - choose one canonical onboarding path
   - either generate `organizations.slug` consistently or remove the column constraint in schema and code together
   - avoid double-creating `profiles` and `org_members` if the trigger already handles them

3. Fix module slug routing for all seeded native modules.
   Scope:
   - align `module_registry` slugs, sidebar route map, and `/dashboard/m/[slug]` safety redirects
   - explicitly decide whether `notifications` has a page route or should stay UI-only and be hidden from navigation

4. Make Supabase storage deployable.
   Scope:
   - add migration(s) for `org-documents` bucket creation and storage policies
   - document bucket requirements for production environments

5. Make environment setup explicit and fail-fast.
   Scope:
   - add `.env.example`
   - document required Vercel env vars and optional demo mode
   - consider central env validation to fail with a clear message instead of runtime `undefined`

6. Document the production deployment path.
   Scope:
   - README section for local setup, Supabase migrations, Vercel variables, build command, and rollback basics
   - mention required order of database setup vs web deploy

## Recommended follow-up improvements

- Add CI that runs `npm install`, `npx tsc --noEmit`, `npm run build`, and `npm run lint` on every push/PR.
- Add a dedicated `typecheck` script to `package.json`.
- Clean root-level diagnostic artifacts from the repository or move them under a non-runtime diagnostics folder ignored by release workflows.
- Decide whether support scripts should be maintained; if yes, add missing dependencies and npm scripts, otherwise remove them.
- Review production dependency vulnerabilities reported during `npm install` and decide whether any are exploitable in this runtime.
- Add a Supabase project bootstrap guide or `supabase/config.toml` if the team expects reproducible local database setup from this repo alone.

## File-by-file findings

- [package.json](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/package.json#L5)
  `build` and `lint` exist, but there is no `typecheck`, no deploy helper scripts, no `engines`, and no declared `dotenv` dependency even though support scripts use it.

- [README.md](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/README.md#L1)
  Still the default `create-next-app` README. It does not document Supabase setup, Vercel environment variables, migration execution, or deployment verification.

- Repo root
  No `.env.example`, no deploy runbook, no CI under `.github/`, and several committed local artifacts increase release noise.

- [src/lib/supabase/client.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/supabase/client.ts#L3)
  Browser client hard-assumes `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

- [src/lib/supabase/server.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/supabase/server.ts#L4)
  Server client does the same, without central validation or an explanatory failure mode.

- [src/lib/supabase/proxy.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/supabase/proxy.ts#L5)
  Session middleware depends on the same envs and will fail at runtime if they are absent or invalid.

- [src/proxy.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/proxy.ts#L8)
  The proxy matcher intentionally skips `/api`, so API auth correctness depends entirely on route-level wrappers. That is acceptable, but it raises the cost of permission mismatches.

- [src/lib/demo/config.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/demo/config.ts#L5)
  Placeholder Supabase URL automatically activates demo mode. This is convenient for development, but risky if someone uses placeholder values in a deployed environment.

- [src/app/api/v1/cenni/bulk/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/cenni/bulk/route.ts#L6)
  Primary build blocker from `optional().nullable()` payloads propagating `undefined`.

- [src/app/api/v1/events/staff-availability/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/events/staff-availability/route.ts#L16)
  Strict-mode typing gaps. Easy fix, but build-blocking today.

- [src/app/api/v1/payments/export/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/payments/export/route.ts#L25)
  Strict-mode typing gap in export mapper.

- [src/app/api/v1/payments/import/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/payments/import/route.ts#L99)
  Strict-mode typing gap in duplicate folio scan.

- [src/app/api/v1/modules/[slug]/records/[recordId]/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/modules/[slug]/records/[recordId]/route.ts#L46)
  Consumes `enrichAudit` that does not exist in `withAuth`; also uses audit payload keys `operation` and `changed_by` that do not match `logAudit` conventions.

- [src/app/api/v1/users/me/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/users/me/route.ts#L22)
  Returns `member.organizations` without selecting it. This route also powers sidebar permissions, so the bug affects both API correctness and UI bootstrapping.

- [src/app/api/v1/users/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/users/route.ts#L14)
  Strict-mode typing failures in core user listing API.

- [src/lib/auth/permissions.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/auth/permissions.ts#L208)
  Alias map exists but is unused; `checkServerPermission` fail-closes on exact module-string matches only.

- [src/components/sidebar-nav.tsx](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/components/sidebar-nav.tsx#L48)
  Native route map is out of sync with seeded module slugs. `documents` and `notifications` are the clearest mismatches.

- [src/app/(dashboard)/dashboard/m/[slug]/page.tsx](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/(dashboard)/dashboard/m/[slug]/page.tsx#L52)
  Native-route safety net is incomplete, so unknown native slugs can fall into the generic dynamic module path.

- [src/app/api/v1/modules/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/modules/route.ts#L5)
  Admins receive all native modules from `module_registry`, so routing inconsistencies are visible immediately after deploy for admin accounts.

- [src/app/api/v1/documents/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/documents/route.ts#L40)
  Web app expects the `org-documents` storage bucket to exist and be writable/readable in production.

- [src/app/api/v1/documents/download/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/documents/download/route.ts#L12)
  Signed download flow also depends on the same bucket.

- [supabase/migrations/001_core_schema.sql](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/001_core_schema.sql#L15)
  Canonical schema currently requires `organizations.slug`, but application code and later trigger migrations do not honor that constraint.

- [supabase/migrations/20240227_schema.sql](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240227_schema.sql#L1)
  Overlapping baseline migration introduces historical ambiguity. It is not safe to assume a new developer will reproduce the intended schema without guidance.

- [supabase/migrations/20240310_documents_dms.sql](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240310_documents_dms.sql#L39)
  Seeds `documents` in `module_registry`, but does not provision storage.

- [supabase/migrations/20240310_notifications.sql](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240310_notifications.sql#L62)
  Seeds `notifications` as a native module, but there is no corresponding dashboard page route in this repo.

- [scripts/test-supabase.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/scripts/test-supabase.ts#L2)
  Requires `dotenv`, which is not declared, and is not wired into package scripts.

- [check_db.js](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/check_db.js#L3)
  Same issue as above.

## Prioritized backlog

| ID | task | severity | area | recommended owner | estimated effort |
| --- | --- | --- | --- | --- | --- |
| DEP-001 | Fix all current TypeScript build failures and re-run `build` plus `tsc` | Critical | Next.js API routes | Full-stack engineer | 0.5-1 day |
| DEP-002 | Normalize nullable payloads in CENNI and similar routes to eliminate `undefined` leakage | Critical | Type safety / data normalization | Full-stack engineer | 0.5 day |
| DEP-003 | Align `withAuth` context contract with dynamic module record routes, including audit logging behavior | Critical | Auth / API architecture | Full-stack engineer | 0.5 day |
| DEP-004 | Resolve organization signup schema mismatch (`slug`, trigger behavior, duplicate org/profile creation) | Critical | Auth / Supabase schema | Full-stack engineer + DB owner | 0.5-1 day |
| DEP-005 | Fix permission resolution so non-admin API access uses canonical module slugs or alias mapping correctly | Critical | Auth / RBAC | Full-stack engineer | 0.5-1 day |
| DEP-006 | Provision `org-documents` bucket and storage policies in Supabase migrations | High | Supabase storage | DB owner | 0.5 day |
| DEP-007 | Align seeded native module slugs with dashboard route maps and remove broken nav targets | High | Frontend routing | Frontend engineer | 0.5 day |
| DEP-008 | Add `.env.example` and document required Vercel env vars plus demo-mode behavior | High | Release / documentation | Release engineer | 0.5 day |
| DEP-009 | Rewrite README with setup, migrations, build verification, and Vercel deploy steps | High | Documentation | Release engineer | 0.5 day |
| DEP-010 | Decide the intended handling for `notifications` as a native module: page route, hidden module, or non-nav feature | High | Product / frontend architecture | Full-stack engineer | 0.25-0.5 day |
| DEP-011 | Add CI for install, typecheck, build, and lint | Medium | Release engineering | DevOps / release engineer | 0.5 day |
| DEP-012 | Add `typecheck` script and optionally pin Node version for reproducible Vercel builds | Medium | Tooling | Full-stack engineer | 0.25 day |
| DEP-013 | Repair or remove unsupported root support scripts and declare missing dependencies if kept | Medium | Repo hygiene | Full-stack engineer | 0.25 day |
| DEP-014 | Clean committed local artifacts and empty directories that do not belong to runtime or docs | Medium | Repo hygiene | Maintainer | 0.25 day |
| DEP-015 | Review the 6 reported npm vulnerabilities and decide remediation priority | Low | Dependency maintenance | Maintainer | 0.25-0.5 day |

## Recommended branch name

`release/vercel-readiness-audit-fixes`
