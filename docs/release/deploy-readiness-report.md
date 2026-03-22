# Deploy Readiness Report

## status: conditionally ready

## resolved blockers

- Registration bootstrap is aligned with the live `organizations.slug` contract.
  Evidence:
  - [`20260322_organizations_slug_alignment.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20260322_organizations_slug_alignment.sql) makes slug generation database-owned and reproducible.
  - [src/app/(auth)/register/page.tsx](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/(auth)/register/page.tsx) now relies on the DB bootstrap contract instead of client-side organization creation.
  Outcome:
  - The prior runtime blocker around `organizations.slug` is resolved in code and migration strategy.

- Org document storage is now provisioned as versioned infrastructure.
  Evidence:
  - [`20260322_org_documents_storage.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20260322_org_documents_storage.sql) creates the `org-documents` bucket and tenant-isolated storage policies.
  - [docs/fixes/org-documents-storage-provisioning.md](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/docs/fixes/org-documents-storage-provisioning.md) defines the path contract, policy model, and smoke checks.
  Outcome:
  - Document upload/download no longer depends on tacit manual bucket setup.

- Audit log read/write/schema drift is aligned to a canonical multi-tenant contract.
  Evidence:
  - [`20260322_audit_log_schema_alignment.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20260322_audit_log_schema_alignment.sql) introduces the non-destructive compatibility migration.
  - [src/app/api/v1/audit-logs/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/audit-logs/route.ts) reads canonical columns and normalizes output for the dashboard.
  Outcome:
  - The audit module no longer has an unresolved contract mismatch at the application layer.

- Demo mode can no longer activate accidentally in Preview or Production.
  Evidence:
  - [src/lib/demo/config.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/demo/config.ts) only enables demo mode when `NEXT_PUBLIC_DEMO_MODE === "true"` and `NODE_ENV === "development"`.
  - [src/lib/supabase/env.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/supabase/env.ts) fails explicitly on missing or placeholder Supabase config.
  Outcome:
  - Misconfigured deploys fail fast instead of silently degrading to demo behavior.

- Supabase public env loading is now safe for the browser bundle.
  Evidence:
  - [src/lib/supabase/env.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/supabase/env.ts) reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` via direct `process.env.NEXT_PUBLIC_*` access instead of dynamic lookup.
  Outcome:
  - Browser clients no longer risk seeing configured Vercel env vars as missing due to non-inlined dynamic access.

- Release validation now has an explicit runtime smoke path.
  Evidence:
  - [docs/release/staging-smoke-test-plan.md](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/docs/release/staging-smoke-test-plan.md)
  - [docs/release/staging-smoke-test-results-template.md](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/docs/release/staging-smoke-test-results-template.md)
  Outcome:
  - There is now a reproducible path to validate runtime readiness before production promotion.

## remaining warnings

- There is still no executed staging evidence in the repository showing that the Preview deployment passed runtime smoke tests against a real Supabase environment.
  Risk:
  - Without that evidence, this cannot be promoted to `ready`.

- Supabase migration history is still not safe to treat as a clean bootstrap path for a brand-new environment.
  Evidence:
  - [docs/fixes/supabase-migration-bootstrap-strategy.md](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/docs/fixes/supabase-migration-bootstrap-strategy.md) documents overlapping schema eras, destructive migrations, and the need for a consolidated baseline.
  Risk:
  - New empty environments remain vulnerable to drift if someone assumes `supabase db push` on the full inherited folder is replay-safe.

- The runtime fixes depend on migration rollout in the target Supabase environment.
  Affected areas:
  - slug alignment
  - storage provisioning
  - audit log alignment
  Risk:
  - If the target staging/production project is missing those migrations, runtime behavior can still fail even though the branch builds successfully.

- Supabase and Vercel configuration still require human correctness.
  Evidence:
  - [docs/deployment/environment-variables.md](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/docs/deployment/environment-variables.md) documents required env vars and explicit failure behavior.
  Risk:
  - Wrong env configuration will fail loudly, which is safer, but still blocks release until fixed.

- CI validates compile/build quality only.
  Evidence:
  - [docs/deployment/ci-cd.md](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/docs/deployment/ci-cd.md)
  Risk:
  - A green GitHub check still does not prove RLS, auth bootstrap, storage, or invitation flows in staging.

- Lint still reports 39 warnings.
  Risk:
  - This does not block release, but it remains technical debt and weakens CI signal.

## passed checks

- Scripts reviewed in [package.json](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/package.json):
  - `typecheck`
  - `lint`
  - `build`
  - `check`
- Node runtime is pinned in `package.json` with `engines.node = 20.x`, aligned with CI.
- Environment example exists in [`.env.example`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/.env.example).
- Environment documentation exists in [docs/deployment/environment-variables.md](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/docs/deployment/environment-variables.md).
- Demo mode hardening is documented in [docs/fixes/demo-mode-hardening.md](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/docs/fixes/demo-mode-hardening.md).
- Browser-safe loading of public Supabase env vars is documented in:
  - [docs/deployment/environment-variables.md](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/docs/deployment/environment-variables.md)
  - [docs/fixes/demo-mode-hardening.md](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/docs/fixes/demo-mode-hardening.md)
- CI workflow exists in [`.github/workflows/ci.yml`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/.github/workflows/ci.yml).
- Supabase release documentation exists in [docs/deployment/supabase-release-checklist.md](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/docs/deployment/supabase-release-checklist.md).
- Registration slug alignment is documented in [docs/fixes/registration-slug-alignment.md](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/docs/fixes/registration-slug-alignment.md).
- Document storage provisioning is documented in [docs/fixes/org-documents-storage-provisioning.md](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/docs/fixes/org-documents-storage-provisioning.md).
- Audit log alignment is documented in [docs/fixes/audit-log-schema-alignment.md](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/docs/fixes/audit-log-schema-alignment.md).
- Smoke test plan and results template exist in:
  - [docs/release/staging-smoke-test-plan.md](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/docs/release/staging-smoke-test-plan.md)
  - [docs/release/staging-smoke-test-results-template.md](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/docs/release/staging-smoke-test-results-template.md)

Fresh command evidence from `2026-03-22`:

```bash
npm run typecheck
npm run lint
npm run build
npm run check
```

Observed results:

- `npm run typecheck`: passed
- `npm run lint`: passed with 39 warnings and 0 errors
- `npm run build`: passed
- `npm run check`: passed outside the local sandbox; the earlier `spawn EPERM` was an execution-environment restriction, not a project build failure

## manual steps still required in Vercel

- Add `NEXT_PUBLIC_SUPABASE_URL` for Development, Preview, and Production.
- Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` for Development, Preview, and Production.
- Keep `NEXT_PUBLIC_DEMO_MODE` unset or `false` in Preview and Production.
- Confirm Vercel uses Node 20 to match `package.json` and CI.
- Pull the configured vars locally with `vercel env pull .env.local` before the staging smoke run.
- Create or refresh the Preview deployment for the release candidate commit.

## manual steps still required in Supabase

- Snapshot the target staging project before applying migrations.
- Review the current remote migration state with:

```bash
supabase link --project-ref <project-ref>
supabase migration list
```

- Rehearse the exact migration set against staging before touching production.
- Apply the candidate runtime migrations required for this release, including:
  - `20260322_organizations_slug_alignment.sql`
  - `20260322_org_documents_storage.sql`
  - `20260322_audit_log_schema_alignment.sql`
- Verify the target schema contains the tables, RPCs, triggers, and RLS state documented in [docs/deployment/supabase-release-checklist.md](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/docs/deployment/supabase-release-checklist.md).
- Verify `public.get_users_emails(UUID[])` exists and is executable by the app.
- Verify `member_module_access` rows exist for non-admin users who need access.

## final release recommendation

The project is now **conditionally ready**:

- ready to enter a formal staging validation cycle
- not yet ready for direct production promotion

Release manager decision:

1. Approve this branch as a **staging release candidate**.
2. Apply the candidate migration set to Supabase staging.
3. Run the smoke suite in [docs/release/staging-smoke-test-plan.md](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/docs/release/staging-smoke-test-plan.md) and record evidence in [docs/release/staging-smoke-test-results-template.md](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/docs/release/staging-smoke-test-results-template.md).
4. Promote to `ready` only if:
   - critical smoke tests pass
   - no cross-tenant leakage is observed
   - Preview and staging Supabase are using the exact release candidate commit and migration set
   - no unresolved high-severity issue remains
