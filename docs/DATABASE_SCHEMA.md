# Database Schema Documentation

The finance modules rely on tenant-scoped Supabase tables plus a small set of RPC-backed calculations.

## Core Tables

### `petty_cash_categories`

Catalog for petty cash and budget categorization.

- `id`
- `name`
- `slug`
- `is_active`
- `sort_order`

### `petty_cash_movements`

Primary finance transaction table.

- `org_id`: tenant boundary
- `category_id`: FK to `petty_cash_categories`
- `type`: `INCOME` or `EXPENSE`
- `amount`: numeric value
- `receipt_url`: optional Supabase Storage URL
- `created_by` / `updated_by`: auth user ids
- `deleted_at`: soft-delete support

### `budgets`

Monthly budget targets.

- `org_id`
- `category_id`
- `month`
- `year`
- `amount`

The canonical uniqueness pattern is `org_id + category_id + month + year`.

## RPCs and Server-Side Calculations

### `fn_petty_cash_balance`

Used by the petty cash balance route to calculate:

`SUM(INCOME) - SUM(EXPENSE)`

This keeps the balance authoritative at the database layer instead of re-deriving it in the client.

## Security and RBAC Notes

- Tenant scoping is enforced by `org_id` plus Supabase RLS.
- The active application roles are `admin`, `supervisor`, `operador`, and `applicator`.
- Route handlers enforce permissions through `withAuth` and `checkServerPermission`.
- Finance mutations are also audited through API-side `logAudit` calls.

## Important Naming Notes

- The app uses `receipt_url`, not `comprobante_url`.
- Budget comparative data is assembled in the API layer, not stored as a separate table.
