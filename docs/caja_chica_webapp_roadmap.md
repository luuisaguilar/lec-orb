# Caja Chica and Budget Roadmap

> Canonical status reference for the finance work inside `lec-orb`.
> Last updated: April 2026

## Current Status

### Phase 1 - Foundation and movement capture

- [x] Supabase auth and org-scoped permissions
- [x] Core finance schema and API v1 routes
- [x] Movement registration UI
- [x] Unified movement table
- [x] Server-side balance calculation via `fn_petty_cash_balance`
- [x] CRUD foundation for petty cash movements

### Phase 2 - Filters and operating workflow

- [x] Search by concept
- [x] Filter by category and movement type
- [x] Pagination support at the API layer
- [x] Excel import/export utilities in the app layer
- [ ] Consolidated multi-org finance dashboard
- [ ] Rich KPI cards for income, expense, and trend summaries
- [ ] Category charts based on live aggregated data

### Phase 3 - Budget and comparative analysis

- [x] Monthly budget module
- [x] Bulk budget upsert flow
- [x] Budget-vs-actual comparative API
- [x] Comparative UI tab in the dashboard
- [ ] Over-budget alerts and thresholding
- [ ] Deeper reporting and month-over-month trends

### Phase 4 - Refinement and UX

- [x] Invitation flow for user onboarding
- [x] RBAC foundation for admin, supervisor, operador, applicator
- [x] Receipt upload to Supabase Storage
- [x] Audit logging for finance mutations
- [ ] Receipt preview/download polish inside the movement list
- [ ] Additional mobile UX refinement for finance-heavy screens

## Canonical Routes

- `/dashboard/finanzas/caja-chica`
- `/dashboard/finanzas/presupuesto`
- `/dashboard/users`
- `/api/v1/finance/petty-cash`
- `/api/v1/finance/petty-cash/balance`
- `/api/v1/finance/petty-cash/categories`
- `/api/v1/finance/budget`
- `/api/v1/finance/budget/comparative`

## Technical Notes

- Auth is Supabase-based, not NextAuth.
- Finance mutations are always tenant-scoped by `org_id`.
- Receipt uploads store `receipt_url`, not `comprobante_url`.
- Comparative analysis is implemented at the API layer and rendered in the UI.

## Simplified Data Model

### Movement

| Field | Type | Notes |
|---|---|---|
| `id` | `UUID` | Primary key |
| `org_id` | `UUID` | Tenant boundary |
| `category_id` | `UUID` | FK to `petty_cash_categories` |
| `date` | `Date` | Required |
| `concept` | `String` | Movement description |
| `type` | `Enum` | `INCOME` or `EXPENSE` |
| `amount` | `Decimal` | Positive numeric value |
| `partial_amount` | `Decimal?` | Optional |
| `receipt_url` | `String?` | Storage-backed receipt URL |
| `notes` | `String?` | Optional |
| `created_by` | `UUID` | Auth user id |

### Budget

| Field | Type | Notes |
|---|---|---|
| `id` | `UUID` | Primary key |
| `org_id` | `UUID` | Tenant boundary |
| `category_id` | `UUID` | FK to `petty_cash_categories` |
| `month` | `Int` | 1-12 |
| `year` | `Int` | Calendar year |
| `amount` | `Decimal` | Budgeted amount |
| `updated_at` | `DateTime` | Audit/support field |
| `updated_by` | `UUID` | Auth user id |

## Remaining Backlog

- Multi-org consolidated finance dashboard
- Better visual analytics
- Staging smoke tests with real auth/data
- Receipt preview UX
