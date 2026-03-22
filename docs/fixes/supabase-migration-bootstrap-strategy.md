# Supabase Migration Bootstrap Strategy

## Summary

This repository contains two overlapping schema eras:

- a numbered baseline family: `001_core_schema.sql` through `006_cenni.sql`
- a dated operational family: `20240227_...` through `20240310_...`

They are not a single replay-safe migration chain. Some files overlap structurally, some mutate earlier assumptions, some backfill legacy data, and some are environment-specific or destructive.

Because of that, **`supabase db push` against an empty project must not be treated as safe with the current historical folder as-is**.

The safe release posture is now dual:

1. **Existing environments:** preserve the current history, classify it, and apply only vetted pending migrations after staging rehearsal.
2. **New environments:** do not bootstrap from the full historical folder. Adopt a **consolidated baseline** for clean bootstrap, then continue with post-baseline migrations only.

## Core Findings

### What is dangerous today

- `001..006` and `20240227..20240310` overlap in the same domains
- some migrations are explicitly manual SQL Editor patches
- some migrations are destructive:
  - [`006_cenni.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/006_cenni.sql)
  - [`20240305_audit_log.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240305_audit_log.sql)
- some migrations are environment-specific:
  - [`20240302_fix_existing_users.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240302_fix_existing_users.sql)
  - [`20240304_assign_applicator_zones.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240304_assign_applicator_zones.sql)
- some migrations intentionally weaken or later harden RLS, so replay order changes security semantics

### What must not be assumed

- do not assume `supabase db push` on a blank project reproduces the intended app schema
- do not assume the numbered files are simply “older” and the dated files are strictly additive
- do not assume CENNI, events, auth bootstrap, and audit are represented by one canonical history in the current folder

## Strategy For Existing Environments

For existing Supabase projects that already have real lineage:

1. Treat the **remote database as the source of truth for lineage**, not the folder alone.
2. Link the repo and inspect applied migrations:

```bash
supabase link --project-ref <project-ref>
supabase migration list
```

3. Snapshot or back up the environment before any promotion.
4. Rehearse pending migrations against a staging clone of the target environment.
5. Apply only the vetted pending set.
6. Never manually re-run destructive or environment-specific migrations against a live environment unless the procedure is explicitly reviewed for that environment.

### Existing-environment rule of thumb

- If an environment is already alive, **increment forward from its proven current state**.
- Do not try to “normalize” it by replaying the full folder from scratch.

## Strategy For New Environments

### Short-term safe path

For a brand new staging environment **today**, the safest approach is:

1. Create a disposable project.
2. Populate it from a **vetted staging/prod-like source** or a curated rehearsal environment.
3. Validate the schema and app behavior there.
4. Use that proven state as the reference for the future baseline.

If cloning is not available, use a manually curated rehearsal path only for staging experiments. Do **not** treat the current migration folder as a one-shot clean bootstrap chain.

### Medium-term recommended path

Create a new **consolidated baseline** from a vetted, app-aligned schema state after:

- latest required RLS/security fixes
- registration slug alignment
- storage provisioning
- documents, notifications, module registry, and module records support

Then use:

- baseline for new empty environments
- post-baseline incremental migrations for future changes

## Recommended Baseline Proposal

This is a proposal only. It does **not** rewrite or delete the old history.

### Proposed structure

```text
supabase/
  baselines/
    20260322_000_prod_aligned_bootstrap.sql
  migrations/
    20260323_<feature>.sql
    20260324_<feature>.sql
    ...
```

### Proposed naming rule

- baseline: `YYYYMMDD_000_<name>.sql`
- post-baseline migration: `YYYYMMDD_<feature>.sql`

### What the baseline should contain

The baseline should represent the canonical schema for **new environments only**, including:

- multi-tenant core tables and auth bootstrap
- final organization slug behavior
- final events model actually used by the app
- final CENNI model actually used by the app
- finance/exam tables with hardened org-scoped RLS already baked in
- module registry and module records
- documents + storage provisioning
- notifications
- required RPCs and trigger functions

### What the baseline should not contain

- environment-specific user repair scripts
- manual backfills aimed at historical data repair
- destructive drop/recreate patterns carried forward from legacy transitions
- transitional permissive RLS states that were later hardened

## Dangerous Migrations

These should be treated as explicit hazards:

- [`006_cenni.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/006_cenni.sql)
  Drops `cenni_cases` before recreating it.

- [`20240305_audit_log.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240305_audit_log.sql)
  Drops `public.audit_log CASCADE`, which can remove dependent triggers and create schema drift.

- [`20240302_fix_existing_users.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240302_fix_existing_users.sql)
  Hardcodes real user UUIDs and organization creation.

- [`20240304_assign_applicator_zones.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240304_assign_applicator_zones.sql)
  Hardcodes business-specific external IDs.

- [`20240302_trigger_schools_applicators.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240302_trigger_schools_applicators.sql)
  Overwrites `handle_new_user()` using assumptions from an older org schema.

## Precondition Rules

### For any environment

- back up before promotion
- verify `auth.users` trigger path
- verify required RPCs exist
- verify RLS state on finance, exams, documents, notifications

### For environments using current history

- choose one schema family per overlapping domain
- do not mix both event models in a clean replay
- do not mix both CENNI models in a clean replay
- do not mix both org/bootstrap models in a clean replay

## Staging Rehearsal Checklist

Use this before promoting any migration set:

1. Link staging project:

```bash
supabase link --project-ref <staging-project-ref>
supabase migration list
```

2. Record current migration state and schema notes.
3. Apply only the candidate pending migration set.
4. Verify:
   - signup
   - invitation acceptance
   - user listing RPC
   - finance RLS
   - exam RLS
   - documents storage
   - audit log behavior
5. Capture the exact migration set that passed.
6. Promote only that rehearsed set to production.

## Migration Classification Table

| filename | category | safe for clean bootstrap | notes |
| --- | --- | --- | --- |
| `001_core_schema.sql` | baseline structural | conditional | Foundational modern core schema, but overlaps with `20240227_schema.sql` and later trigger rewrites. |
| `002_inventory.sql` | baseline structural | conditional | Core inventory foundation, but defines an `audit_log` shape later replaced by another schema. |
| `003_catalogs.sql` | baseline structural | conditional | Creates schools/rooms/applicators/exam catalog; safe only within one coherent baseline family. |
| `004_events.sql` | baseline structural | no | Uses legacy `event_exams`/`slots` model that conflicts with the later `event_staff`/`event_slots` era. |
| `005_payroll.sql` | baseline structural | conditional | Standalone payroll schema; depends on the chosen catalog/core family. |
| `006_cenni.sql` | baseline structural | no | Destructive `DROP TABLE` and conflicts with the dated enum-based CENNI chain. |
| `20240227_inventory_schema.sql` | baseline structural | no | Early inventory/events family that overlaps with `002_inventory.sql` and `004_events.sql`. |
| `20240227_schema.sql` | baseline structural | no | Early org/auth family without `organizations.slug`; conflicts with `001_core_schema.sql`. |
| `20240302_applicators_schema_update.sql` | patch incremental | conditional | Adds applicator fields; depends on the applicators table already chosen. |
| `20240302_cenni_enums_update.sql` | patch incremental | conditional | Only valid in the dated enum-based CENNI family. |
| `20240302_cenni_schema.sql` | baseline structural | conditional | Canonical only for the dated CENNI family; conflicts with `006_cenni.sql`. |
| `20240302_events_schema.sql` | baseline structural | conditional | Canonical only for the dated events family; conflicts with `004_events.sql`. |
| `20240302_fix_existing_users.sql` | environment-specific or risky | no | Hardcoded user/org repair script; never treat as generic bootstrap. |
| `20240302_movements_and_rpc.sql` | patch incremental | conditional | Reintroduces/patches `movements` and RPC behavior; overlaps inventory baseline behavior. |
| `20240302_rls_patch.sql` | fix de seguridad/RLS | no | Transitional permissive signup/self-insert patch; not a clean-bootstrap default. |
| `20240302_schools_schema_update.sql` | patch incremental | conditional | Adds school columns; safe only if `schools` already exists in the chosen lineage. |
| `20240302_schools_schema_update_2.sql` | patch incremental | conditional | Duplicate follow-up of school columns; replay-safe technically, but redundant. |
| `20240302_trigger_schools_applicators.sql` | environment-specific or risky | no | Overwrites `handle_new_user()` under outdated org assumptions and mixes unrelated schema changes. |
| `20240304_add_event_classrooms.sql` | patch incremental | conditional | Event/session model patch; valid only in the dated events lineage. |
| `20240304_add_location_zone_to_applicators.sql` | backfill | conditional | Adds column plus heuristic backfill by city text. |
| `20240304_assign_applicator_zones.sql` | environment-specific or risky | no | Hardcoded business-specific external IDs; not portable. |
| `20240304_event_sessions_and_school_hours.sql` | patch incremental | conditional | Introduces `event_sessions`; depends on the dated events family. |
| `20240304_fix_event_staff_and_speaking_date.sql` | backfill | conditional | Alters constraints and backfills `speaking_date`; only valid after the dated events/session model exists. |
| `20240304_link_slots_to_sessions.sql` | backfill | conditional | Backfills `session_id` for legacy event rows; historical repair, not a pure bootstrap step. |
| `20240305_add_classrooms_to_sessions.sql` | patch incremental | conditional | Assumes `event_sessions` exists and removes an obsolete events column. |
| `20240305_add_component_to_slots.sql` | patch incremental | conditional | Assumes the later `event_slots` shape exists. |
| `20240305_audit_log.sql` | environment-specific or risky | no | Drops and recreates `audit_log` with a different contract; hazardous to replay or re-run blindly. |
| `20240307_add_cenni_status_values.sql` | patch incremental | conditional | Only meaningful for the enum-based CENNI lineage. |
| `20240307_exam_tables.sql` | baseline structural | conditional | Creates exam tables but starts with permissive `USING (true)` RLS that later must be hardened. |
| `20240307_finance_tables.sql` | baseline structural | conditional | Creates finance tables but with permissive access later replaced by org-scoped RLS. |
| `20240307_payment_catalog.sql` | baseline structural | conditional | Creates payment concepts/payments and seeds data; later security migrations are mandatory. |
| `20240308_audit_log_expansion.sql` | patch incremental | conditional | Attaches audit triggers to newer tables; only valid if the chosen audit schema is the `fn_audit_log` family. |
| `20240308_get_user_emails_rpc.sql` | patch incremental | yes | Focused RPC addition; replay-safe and required by the app. |
| `20240308_granular_permissions.sql` | fix de seguridad/RLS | conditional | Expands `member_module_access` and role editing; depends on modern core tables. |
| `20240308_job_title_expansion.sql` | patch incremental | yes | Simple additive column on `org_members`. |
| `20240308_locations_expansion.sql` | patch incremental | conditional | Adds `location` to `org_members` and `payments`; requires payments to exist first. |
| `20240308_payments_expansion.sql` | backfill | conditional | Expands `payments` and backfills names; requires the original payments table. |
| `20240308_toefl_administrations.sql` | backfill | conditional | Adds and backfills `name` and `end_date`; depends on existing `toefl_administrations`. |
| `20240308_toefl_codes_expansion.sql` | patch incremental | conditional | Extends `toefl_codes`; requires the exam tables lineage. |
| `20240309_finance_org_scoping.sql` | fix de seguridad/RLS | conditional | Adds `org_id`, backfills, and tightens finance RLS; required if using finance tables. |
| `20240309_module_fields_records.sql` | baseline structural | conditional | Modern Studio data tables; depends on `module_registry` first. |
| `20240309_module_registry.sql` | baseline structural | conditional | Modern plugin/module foundation; safe as part of the modern schema family. |
| `20240310_documents_dms.sql` | baseline structural | conditional | Creates `documents`; requires modern core/module tables and now pairs with storage provisioning. |
| `20240310_notifications.sql` | baseline structural | conditional | Creates notifications/templates and seeds defaults; depends on modern core/module tables. |
| `20240310_rls_security_fix.sql` | fix de seguridad/RLS | conditional | Mandatory if using finance/exam tables; backfills and replaces permissive policies. |
| `20260322_organizations_slug_alignment.sql` | fix de seguridad/RLS | conditional | Modern mandatory alignment for signup/org bootstrap; requires modern organizations/auth path. |
| `20260322_org_documents_storage.sql` | fix de seguridad/RLS | conditional | Provisions storage bucket and policies; requires `org_members` and the documents module. |

## Final Recommendation

### Recommended adoption

Adopt the dual strategy immediately:

- **Existing environments:** continue using the inherited history only as an incremental promotion record, with rehearsal and explicit hazard handling.
- **New environments:** stop treating the current full folder as bootstrap-safe; move to a consolidated baseline as the supported bootstrap mechanism.

### Practical next step

1. Rehearse the current app-aligned schema on staging.
2. Capture the vetted schema state.
3. Generate `supabase/baselines/20260322_000_prod_aligned_bootstrap.sql`.
4. From that point onward:
   - new empty environments use the baseline plus post-baseline migrations
   - existing environments continue from their current lineage without rewriting history

That is the cleanest way to reduce drift without destroying the historical record.
