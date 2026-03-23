# Staging Validation Report

## Metadata

- date: `2026-03-22`
- branch: `fix/staging-release-candidate-hardening`
- commit SHA validated locally: `daadb63c8ed2b4212f11e2ced6a51a8d45138b99`
- repository: `luuisaguilar/lec-orb`
- validation scope:
  - local release-candidate verification
  - staging runtime verification readiness review
- environment validated:
  - local workspace: executed
  - deployed environment reported by release owner: `orb.luisaguilaraguila.com`
  - Vercel Preview + Supabase staging: partially evidenced by user-provided screenshots and operator confirmation, not independently queried from this workspace

## Executive Summary

The release candidate branch is still **`conditionally ready`**.

The codebase and release documentation are aligned for a staging rollout:

- the browser-safe Supabase public env fix is applied
- `typecheck`, `lint`, `build`, and `check` pass when run outside the local sandbox restriction
- the three candidate runtime migrations exist and are documented
- the staging smoke suite now explicitly covers document delete in addition to upload/download and cross-tenant denial
- user-provided staging evidence shows the login page is reachable and the authenticated dashboard loads successfully
- user confirmed that the required Vercel env vars are correct in the deployed environment
- user confirmed that the candidate Supabase migrations are already applied in staging

However, this report still lacks a complete smoke run and does **not** independently prove which exact Vercel deployment SHA is serving the validated environment. Because that evidence remains incomplete, the staging validation result is recorded as **`fail`** for completion status and the overall release state remains **`conditionally ready`**.

## Code State Verified

### Supabase public env loading

Verified in [src/lib/supabase/env.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/supabase/env.ts):

- `NEXT_PUBLIC_SUPABASE_URL` is read via `process.env.NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is read via `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`
- placeholder URLs still fail explicitly
- `getSupabasePublicEnv()` contract is unchanged

This closes the Next.js client-bundle bug where dynamic env lookup (`process.env[name]`) could leave browser code seeing configured Vercel env vars as missing.

### Candidate migrations reviewed

Reviewed migrations:

- [supabase/migrations/20260322_organizations_slug_alignment.sql](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20260322_organizations_slug_alignment.sql)
- [supabase/migrations/20260322_org_documents_storage.sql](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20260322_org_documents_storage.sql)
- [supabase/migrations/20260322_audit_log_schema_alignment.sql](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20260322_audit_log_schema_alignment.sql)

Findings:

- `20260322_organizations_slug_alignment.sql` may be partially redundant in environments whose lineage already includes a live `organizations.slug` column from [001_core_schema.sql](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/001_core_schema.sql).
- Even in that case, the migration is still materially required because it also:
  - backfills/normalizes existing slugs
  - defines the current slug trigger behavior
  - redefines `handle_new_user()` to align signup with the DB-owned slug contract
- `20260322_org_documents_storage.sql` is required to provision the private `org-documents` bucket and `storage.objects` tenant-isolation policies.
- `20260322_audit_log_schema_alignment.sql` is required to align `audit_log` to the canonical multi-tenant contract and org-scoped RLS.

### Staging linkage evidence available locally

Current workspace evidence does **not** fully prove staging execution:

- no checked-in `.vercel/` linkage metadata was found
- no local evidence links commit `daadb63c8ed2b4212f11e2ced6a51a8d45138b99` to a concrete Vercel Preview deployment
- no local evidence of a completed staging smoke run was found in `docs/release/`
- the repository documentation explicitly treats remote migration state as something that must be checked with:

```bash
supabase link --project-ref <project-ref>
supabase migration list
```

Additional user-provided evidence now available:

- operator confirmed that staging Supabase already has:
  - `20260322_organizations_slug_alignment.sql`
  - `20260322_org_documents_storage.sql`
  - `20260322_audit_log_schema_alignment.sql`
- operator confirmed that Vercel env vars are correct for the deployed environment
- screenshots show:
  - `/login` reachable at `orb.luisaguilaraguila.com/login`
  - authenticated access to `/dashboard`

## Validations Run

Fresh commands executed on `2026-03-22`:

```bash
npm run typecheck
npm run lint
npm run build
npm run check
node tests/demo-mode-hardening.test.mjs
```

Observed results:

- `npm run typecheck`: passed
- `npm run lint`: passed with `39 warnings` and `0 errors`
- `npm run build`: failed inside the local sandbox with `spawn EPERM`, then passed when rerun outside the sandbox
- `npm run check`: failed inside the local sandbox with the same `spawn EPERM`, then passed when rerun outside the sandbox
- `node tests/demo-mode-hardening.test.mjs`: passed

Environment note:

- the `spawn EPERM` is consistent with the local execution environment restriction already seen in previous runs
- it is not treated as a repository regression because the same commands completed successfully outside the sandbox with the same code state

## Expected Staging State

Before a real staging validation can pass, staging should be aligned as follows:

- Vercel Preview uses commit `daadb63c8ed2b4212f11e2ced6a51a8d45138b99` or a newer explicitly approved candidate
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly in Vercel
- `NEXT_PUBLIC_DEMO_MODE` is unset or `false`
- staging Supabase has applied:
  - `20260322_organizations_slug_alignment.sql`
  - `20260322_org_documents_storage.sql`
  - `20260322_audit_log_schema_alignment.sql`

User-reported staging state on `2026-03-22`:

- required migrations: applied
- Vercel env vars: correct
- login page: reachable
- authenticated dashboard: reachable

## Smoke Test Status

Source of truth:

- [docs/release/staging-smoke-test-plan.md](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/docs/release/staging-smoke-test-plan.md)
- [docs/release/staging-smoke-test-results-template.md](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/docs/release/staging-smoke-test-results-template.md)

### Results by Test

| test ID | area | status | notes |
| --- | --- | --- | --- |
| STG-01 | Login | pass | User-provided evidence shows successful entry to the platform and authenticated session reaching `/dashboard` |
| STG-02 | Dashboard Load | pass | User-provided screenshot shows protected dashboard content rendering successfully |
| STG-03 | `/api/v1/users/me` | not executed | No authenticated staging API capture available |
| STG-04 | Signup / org bootstrap | not executed | Candidate migration reviewed, but no runtime staging execution evidence |
| STG-05 | Organization Read Consistency | not executed | Depends on executed signup test |
| STG-06 | Invitation Acceptance | not executed | No staging invitation evidence |
| STG-07 | Non-admin access / `member_module_access` | not executed | No staging role-based runtime evidence |
| STG-08 | Document Upload | not executed | Storage migration reviewed; no staging upload evidence |
| STG-09 | Document Download | not executed | No signed URL/download evidence |
| STG-10 | Document Delete | not executed | Route and policy support exist; no staging deletion evidence |
| STG-11 | Cross-tenant Document Denial | not executed | No runtime cross-tenant denial evidence |
| STG-12 | Audit Log Listing | not executed | No staging audit feed evidence |

## Incidents / Findings

1. Partial staging evidence now exists, but the smoke suite is still incomplete.
2. No local repository evidence proves which exact Vercel deployment SHA is serving the validated environment.
3. `/api/v1/users/me`, signup/bootstrap, invitations, documents, audit logs, and cross-tenant denial still lack recorded staging evidence.
4. The local sandbox still produces `spawn EPERM` during `next build`, but the same build succeeds outside the sandbox.
5. The smoke plan previously omitted explicit document delete validation; this report corrects that gap in the release documentation.

## Final Decision

- staging validation decision: `fail`
- release state: `conditionally ready`

Rationale:

- the branch is locally healthy enough to serve as a staging release candidate
- the code and documentation are aligned with the intended runtime contracts
- partial staging evidence now exists for env effectiveness, login, and dashboard access
- but the required smoke coverage and deployment-to-SHA traceability are still incomplete, so this cannot be promoted to `ready`

## What Must Happen Next

1. Record the exact Vercel deployment/Preview metadata that maps the validated environment to commit `daadb63c8ed2b4212f11e2ced6a51a8d45138b99` or a newer explicitly approved SHA.
2. Execute the remaining smoke tests in staging:
   - `/api/v1/users/me`
   - signup / org bootstrap
   - invitations
   - document upload / download / delete
   - audit log listing
   - cross-tenant denial
   - session persistence beyond the initial dashboard landing
3. Record evidence in the results template.
4. Update [docs/release/deploy-readiness-report.md](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/docs/release/deploy-readiness-report.md) only if the executed evidence justifies a status change.
