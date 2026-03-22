# Audit Log Schema Alignment

## Summary

The repository had two incompatible `audit_log` contracts:

- canonical app writers used `org_id`, `action`, `performed_by`, `created_at`
- the audit feed route and dashboard expected `operation`, `changed_by`, `changed_at`

That mismatch was unsafe in a multi-tenant app because the legacy `20240305_audit_log.sql` shape also dropped `org_id`, which weakens tenant isolation.

The new source of truth is the canonical multi-tenant contract:

- `org_id`
- `table_name`
- `record_id`
- `action`
- `performed_by`
- `created_at`
- `old_data`
- `new_data`

## What Changed

### App writes

- [src/lib/audit/log.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/audit/log.ts) remains the canonical writer helper
- [src/app/api/v1/cenni/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/cenni/route.ts) now uses that helper instead of inserting a divergent payload directly

### Audit feed reads

- [src/app/api/v1/audit-logs/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/audit-logs/route.ts) now queries canonical columns only
- the route filters by `member.org_id`
- the route normalizes response fields for the existing dashboard contract through [src/lib/audit/feed.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/audit/feed.ts)

Compatibility fields still returned by the API:

- `operation` -> alias of `action`
- `changed_by` -> alias of `performed_by`
- `changed_at` -> alias of `created_at`

This keeps the dashboard stable while the database and app converge on the canonical names.

### Database compatibility migration

[`20260322_audit_log_schema_alignment.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20260322_audit_log_schema_alignment.sql) is intentionally non-destructive:

- creates `public.audit_log` if it does not exist
- adds missing canonical columns without dropping legacy columns
- backfills canonical columns from `operation`, `changed_by`, and `changed_at` when those exist
- reintroduces multi-tenant RLS through `public.org_members`
- replaces `public.fn_audit_log()` so only tenant-attributable events enter the tenant-facing feed

## Tenant-Facing Feed Scope

The tenant-facing audit feed only includes events whose `org_id` can be derived safely.

### Included by default

Events with direct `org_id` in row data:

- `schools`
- `applicators`
- `events`
- `cenni_cases`
- `payroll_periods`
- `quotes`
- `purchase_orders`
- `payments`
- `documents`
- `module_records`
- `org_members`
- any other audited row that already contains `org_id`

Events with derived `org_id`:

- `event_sessions` via `event_id -> events.org_id`
- `event_staff` via `event_id -> events.org_id`
- `event_slots` via `event_id -> events.org_id`
- `toefl_administrations` via `school_id -> schools.org_id`
- `rooms` via `school_id -> schools.org_id`

### Excluded by default

If `org_id` cannot be derived safely, the trigger does not insert a tenant-facing audit row.

Examples:

- `payment_concepts`
- `toefl_codes`
- `exam_codes`
- any legacy row whose snapshots do not include enough tenant context

This is deliberate. The tenant feed must fail closed instead of leaking cross-org activity.

## Transition Rules

- the canonical schema above is now the source of truth
- legacy columns may still exist temporarily in inherited environments
- the API no longer relies on legacy column names
- the old `20240305_audit_log.sql` contract must not be treated as the live contract going forward

## Rollout Notes

Apply the migration before relying on the audit UI in staging or production:

```bash
supabase link --project-ref <project-ref>
supabase migration list
supabase db push
```

Then verify:

1. create/update/delete actions in tenant-scoped modules produce rows with canonical columns populated
2. `/api/v1/audit-logs` only returns rows for the caller's organization
3. dashboard activity still renders because API aliases `operation`, `changed_by`, and `changed_at`
