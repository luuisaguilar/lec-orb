# Supabase Release Checklist

This repository stores database history only in [`supabase/migrations`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations). It does **not** currently include `supabase/config.toml`, local seed files, or storage provisioning scripts.

That means the project has enough SQL to describe a large part of the schema, but not enough Supabase project metadata to guarantee a clean, reproducible environment from scratch without manual review.

## Migration Strategy

### Environment strategy

Treat environment bootstrap as two separate problems:

- **existing environments:** apply only vetted pending migrations on top of the environment's proven current lineage
- **new environments:** do not assume the full historical folder is replay-safe on an empty project

For a brand new environment, the current recommendation is:

1. use a vetted staging/prod-like schema state for rehearsal
2. adopt a consolidated baseline for future clean bootstrap
3. avoid treating the full inherited folder as the supported bootstrap chain

### Current state of the migration history

The migration folder mixes two styles:

- a numbered baseline series: `001_core_schema.sql` through `006_cenni.sql`
- a dated incremental series: `20240227_...` through `20240310_...`

This is a release risk because the history is not a single clean linear story. Several later migrations look like historical patches applied after ad hoc SQL-editor work, while the numbered files look like a later “revised baseline”.

### High-risk migration patterns in this repo

- [`supabase/migrations/006_cenni.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/006_cenni.sql) contains `DROP TABLE IF EXISTS cenni_cases;`
- [`supabase/migrations/20240305_audit_log.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240305_audit_log.sql) contains `DROP TABLE IF EXISTS public.audit_log CASCADE;`
- [`supabase/migrations/20240302_fix_existing_users.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240302_fix_existing_users.sql) hardcodes specific user UUIDs and organization creation, so it is not portable across environments
- multiple files explicitly say “run this in SQL Editor”, which is a strong sign they were authored as manual patches rather than a fully replay-safe migration chain

### Ambiguous or overlapping schema eras

The repo appears to contain overlapping schema generations:

- core auth/multitenancy:
  - [`001_core_schema.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/001_core_schema.sql)
  - [`20240227_schema.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240227_schema.sql)
- inventory/events:
  - [`002_inventory.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/002_inventory.sql)
  - [`20240227_inventory_schema.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240227_inventory_schema.sql)
  - [`004_events.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/004_events.sql)
  - [`20240302_events_schema.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240302_events_schema.sql)
- CENNI:
  - [`006_cenni.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/006_cenni.sql)
  - [`20240302_cenni_schema.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240302_cenni_schema.sql)

These overlaps do not automatically mean the chain is broken, but they do mean a fresh environment should be validated in staging before trusting a direct production apply.

### Recommended remote release sequence

For an existing remote Supabase environment:

1. Take a backup or snapshot in Supabase before applying anything.
2. Link the repo to the target project:

```bash
supabase link --project-ref <project-ref>
```

3. Inspect migration state:

```bash
supabase migration list
```

4. Rehearse the exact migration set against a disposable staging project first.
5. Only after staging passes, apply pending migrations to the remote environment:

```bash
supabase db push
```

For a new environment, do **not** assume this history is safe to replay blindly. First prove it on staging because the chain includes destructive and manual patch migrations.

If a clean environment must be created before a consolidated baseline exists, treat that work as a staging rehearsal only, not as a production bootstrap standard.

### Existing vs new environment rule

- existing remote project: `supabase migration list` -> rehearse pending set -> push vetted pending set only
- new empty project: do **not** default to `supabase db push`; use the documented bootstrap strategy in [docs/fixes/supabase-migration-bootstrap-strategy.md](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/docs/fixes/supabase-migration-bootstrap-strategy.md)

### Baseline recommendation

The recommended long-term fix is to add a consolidated baseline for new environments, for example:

```text
supabase/baselines/20260322_000_prod_aligned_bootstrap.sql
```

Then keep future incremental changes as post-baseline migrations:

```text
supabase/migrations/20260323_<feature>.sql
```

Until that baseline exists and is validated, do not present the current migration folder as clean-bootstrap safe.

### Migrations that should be treated as patches or backfills

- [`supabase/migrations/20240302_fix_existing_users.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240302_fix_existing_users.sql)
  Environment-specific recovery script, not a generic release migration.
- [`supabase/migrations/20240304_fix_event_staff_and_speaking_date.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240304_fix_event_staff_and_speaking_date.sql)
  Adds/backfills event-session related fields.
- [`supabase/migrations/20240304_link_slots_to_sessions.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240304_link_slots_to_sessions.sql)
  Adds session linkage and backfills existing records.
- [`supabase/migrations/20240308_toefl_administrations.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240308_toefl_administrations.sql)
  Backfills `name` and `end_date`.
- [`supabase/migrations/20240309_finance_org_scoping.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240309_finance_org_scoping.sql)
  Adds `org_id`, backfills, and temporarily allows `org_id IS NULL` fallback in RLS.
- [`supabase/migrations/20240310_rls_security_fix.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240310_rls_security_fix.sql)
  Hardens RLS, adds more `org_id` columns, backfills, and removes some fallback policies.

## Pre-Deploy Database Requirements

The application should not be deployed unless the target database already has these requirements satisfied.

### Core tenant and auth tables

These must exist and be queryable:

- `organizations`
- `profiles`
- `org_members`
- `member_module_access`
- `org_invitations`

Relevant migrations:

- [`001_core_schema.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/001_core_schema.sql)
- [`20240308_granular_permissions.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240308_granular_permissions.sql)
- [`20240308_job_title_expansion.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240308_job_title_expansion.sql)
- [`20240308_locations_expansion.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240308_locations_expansion.sql)

### Module system tables

These must exist before the dashboard and Studio features work correctly:

- `module_registry`
- `module_permissions`
- `module_fields`
- `module_records`

Relevant migrations:

- [`20240309_module_registry.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240309_module_registry.sql)
- [`20240309_module_fields_records.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240309_module_fields_records.sql)

### Documents module requirements

The code depends on both database metadata and Storage:

- table `documents`
- storage bucket `org-documents`
- storage access policies that allow upload, signed URL generation, and delete for the intended org scope

Relevant code:

- [src/app/api/v1/documents/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/documents/route.ts)
- [src/app/api/v1/documents/download/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/documents/download/route.ts)

Relevant migration:

- [`20240310_documents_dms.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240310_documents_dms.sql)
- [`20260322_org_documents_storage.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20260322_org_documents_storage.sql)

Critical note:

- the repo creates the `documents` table
- the repo now provisions the private `org-documents` bucket and tenant-isolated `storage.objects` policies via SQL migration
- the bucket path contract is `<org_id>/<module_slug>/<record_id|general>/<timestamp>.<ext>`
- the upload path is constructed server-side from authenticated membership context, not from client-supplied `org_id`
- download requests are validated server-side against the caller's `member.org_id` before signed URL creation
- the app remains responsible for module/action authorization and signed URL issuance

Before deploy, verify that the storage migration has been applied and run the document smoke tests.

### Audit log requirements

Audit now has a canonical multi-tenant contract:

- `org_id`
- `table_name`
- `record_id`
- `action`
- `performed_by`
- `created_at`
- `old_data`
- `new_data`

Relevant files:

- [src/lib/audit/log.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/audit/log.ts)
- [src/app/api/v1/audit-logs/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/audit-logs/route.ts)
- [`20260322_audit_log_schema_alignment.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20260322_audit_log_schema_alignment.sql)
- [docs/fixes/audit-log-schema-alignment.md](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/docs/fixes/audit-log-schema-alignment.md)

Important release notes:

- [`20240305_audit_log.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240305_audit_log.sql) is legacy history and must not be treated as the live contract
- the compatibility migration is additive; it does not drop `audit_log`
- the API reads canonical columns only and aliases legacy response keys for the current dashboard
- tenant-facing audit rows are only recorded when `org_id` can be derived safely
- events without safe tenant derivation are excluded from the tenant-facing feed by design

### Registration schema requirement

`organizations.slug` is now a database-owned field.

Relevant migrations:

- [`001_core_schema.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/001_core_schema.sql)
- [`20260322_organizations_slug_alignment.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20260322_organizations_slug_alignment.sql)

Current contract:

- `slug` is always generated and normalized on `INSERT`
- on `UPDATE`, the slug remains stable unless an explicit new slug is provided or the stored slug is blank
- `handle_new_user()` inserts only `organizations.name`; the slug trigger resolves the final unique slug
- the web registration flow no longer bootstraps `profiles`, `organizations`, or `org_members` from the client

Before deploy, verify that this migration has been applied and that signup produces:

- a `profiles` row
- an `organizations` row with non-null unique `slug`
- an `org_members` row linking the new user as `admin`

### Event schema requirement

The app currently depends on:

- `events`
- `event_sessions`
- `event_staff`
- `event_slots`

plus later-added fields such as `speaking_date`, `session_id`, `component`, and related backfills from the 20240304 and 20240305 patches.

Do not assume the older `event_exams` / `slots` schema in [`004_events.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/004_events.sql) matches the app’s actual expectations.

## Auth And Permissions Dependencies

### Supabase Auth dependencies

The release depends on `auth.users` integration and a working profile/org membership path.

Required objects:

- `profiles` table
- `org_members` table
- trigger `on_auth_user_created`
- function `public.handle_new_user()`

Relevant migration:

- [`001_core_schema.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/001_core_schema.sql)

### Invitation flow dependencies

The join flow depends on:

- `org_invitations.token`
- `org_invitations.status`
- `org_invitations.accepted_at`
- relation from `org_invitations.org_id` to `organizations.id`

Relevant code:

- [src/app/join/[token]/page.tsx](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/join/[token]/page.tsx)
- [src/app/api/v1/invitations/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/invitations/route.ts)

### Member access dependency

Non-admin access currently depends on rows existing in `member_module_access`.

[src/lib/auth/permissions.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/auth/permissions.ts) now fails closed when no granular row exists. That means:

- admins are unaffected
- non-admin users can be locked out of modules if `member_module_access` rows are missing

The migration history creates the table and adds `can_view`, `can_edit`, `can_delete`, but it does not clearly seed rows for all existing members and modules.

Before deploy, verify that every non-admin member who should access the app has the expected `member_module_access` rows.

### RPC dependency

The users module depends on a security-definer RPC:

- [`supabase/migrations/20240308_get_user_emails_rpc.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240308_get_user_emails_rpc.sql)

Required object:

- `public.get_users_emails(UUID[])`

If this function is missing, user-management screens can fail when trying to resolve auth emails.

### RLS hardening dependency

Finance and exam modules depend on later hardening migrations, not just the original table creation.

High-value security migrations:

- [`20240309_finance_org_scoping.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240309_finance_org_scoping.sql)
- [`20240310_rls_security_fix.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240310_rls_security_fix.sql)

Without these, some tables are either under-scoped or were historically too permissive across tenants.

## Rollback Considerations

There are no down migrations in this repo.

Rollback therefore means one of:

- restore from backup/snapshot
- apply a new corrective forward migration
- manually repair data and policies

### Why rollback is not trivial here

- some migrations are destructive:
  - [`006_cenni.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/006_cenni.sql)
  - [`20240305_audit_log.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240305_audit_log.sql)
- some migrations perform data backfills that are hard to reverse cleanly
- some migrations harden RLS, which can break behavior if the expected backfill did not complete
- at least one migration is environment-specific and should never be treated as generic rollback-safe history

### Safe rollback posture

- always snapshot before `supabase db push`
- treat production rollback as restore-or-forward-fix, not “undo migration”
- never rerun destructive migrations manually in SQL Editor against a live environment

## Manual Verification Checklist

Run this after migrations are applied in staging, and again after production release if the risk profile is high.

### Schema and objects

- [ ] `organizations`, `profiles`, `org_members`, `member_module_access`, `org_invitations` exist
- [ ] `module_registry`, `module_permissions`, `module_fields`, `module_records` exist
- [ ] `documents`, `notifications`, `notification_templates`, `payments`, `payment_concepts`, `quotes`, `purchase_orders`, `toefl_codes`, `toefl_administrations`, `exam_codes`, `cenni_cases` exist
- [ ] `event_sessions`, `event_staff`, `event_slots` exist with the columns the app uses
- [ ] `public.get_users_emails(UUID[])` exists and is executable by `authenticated`
- [ ] required triggers exist:
  - `on_auth_user_created`
  - `handle_updated_at_*` where expected
  - audit triggers only if the chosen `audit_log` schema matches the app

### Storage

- [ ] bucket `org-documents` exists
- [ ] `storage.objects` policies for `org-documents` exist for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`
- [ ] upload works through [src/app/api/v1/documents/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/documents/route.ts)
- [ ] upload path is created server-side and begins with the authenticated user's `org_id`
- [ ] signed URL download works through [src/app/api/v1/documents/download/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/documents/download/route.ts)
- [ ] download rejects paths whose first segment belongs to another organization
- [ ] delete works for authorized roles
- [ ] cross-org path access is denied even if another org path is guessed

### Auth and tenant bootstrap

- [ ] a new user can register without `organizations.slug` failing
- [ ] profile row exists after signup
- [ ] org row exists after signup
- [ ] org_members row exists after signup
- [ ] a user without org membership receives the expected denial, not a silent failure

### Permissions

- [ ] admin can access all expected native modules
- [ ] non-admin roles have `member_module_access` rows and can access only intended modules
- [ ] custom-module permissions in `module_permissions` work for supervisor / operador / applicator
- [ ] invitation acceptance can create `org_members` rows and mark invitation accepted

### Security / RLS

- [ ] cross-org reads are blocked for `payments`, `quotes`, `purchase_orders`, `toefl_codes`, `toefl_administrations`, `exam_codes`, `documents`, `notifications`
- [ ] rows created before `org_id` backfills do not remain `NULL` where hardened policies now expect org scoping
- [ ] no broad legacy RLS policies remain active on finance and exam tables

### Audit

- [ ] apply [`20260322_audit_log_schema_alignment.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20260322_audit_log_schema_alignment.sql)
- [ ] confirm `audit_log` has canonical columns populated: `org_id`, `action`, `performed_by`, `created_at`
- [ ] confirm broad legacy read policies are gone and org-scoped RLS via `org_members` is active
- [ ] if using trigger-based audit, verify only tenant-attributable events enter the feed
- [ ] verify `/api/v1/audit-logs` returns only rows for the caller's `member.org_id`
- [ ] verify dashboard activity still renders through API aliases: `operation`, `changed_by`, `changed_at`

## Suggested Supabase CLI Commands

These commands are appropriate when the repo is linked to a target project:

```bash
supabase link --project-ref <project-ref>
supabase migration list
supabase db push
```

If you want a more reproducible local Supabase workflow later, the repo should add:

- `supabase/config.toml`
- any storage provisioning SQL or scripts
- seed data strategy for non-admin permissions and required native module rows

Until then, treat this checklist as the release source of truth rather than assuming the folder is fully self-contained.
