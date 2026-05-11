# Finance Modules Technical Documentation

This document describes the architecture and logic of the **Caja Chica** and **Presupuesto** modules within the LEC Platform.

## Caja Chica (Petty Cash) — Finance Engine V2

The live model is **V2** (`petty_cash_funds`, `petty_cash_movements` with `amount_in` / `amount_out`, `budget_lines`, `replenishment_requests`). Legacy tables `petty_cash_movements_legacy` / `budgets_legacy` may still exist until a dedicated cleanup migration is applied in production.

### Core logic

- **Funds**: Each org has one or more `petty_cash_funds` per fiscal year; `current_balance` is maintained by DB triggers (`fn_sync_movement_to_ledger`, `fn_recalculate_fund_balance`).
- **Movements**: Egress requires a `budget_line_id` (non-fiscal line for the movement month). Income has `amount_in` only; egress has `amount_out` only.
- **Balance**: `GET /api/v1/finance/petty-cash/balance` without `fund_id` uses `fn_petty_cash_balance(org, year)` = sum of `current_balance` of **open** funds for that year. With `fund_id`, returns that fund’s balance.
- **RLS**: Fund listing is visible to all org members; inserts are allowed for the fund **custodian** (or finance admins via existing policies). Custodians may cancel movements in their open fund.

### API endpoints (V2)

- `GET/POST /api/v1/finance/petty-cash` — list / create movements (paginated; filters: `fund_id`, `budget_line_id`, `search`, dates).
- `GET/PATCH/DELETE /api/v1/finance/petty-cash/[id]` — update fields or cancel (`DELETE` sets `status = cancelled`).
- `GET /api/v1/finance/petty-cash/balance` — optional `fund_id`, else org+year aggregate.
- `GET/POST /api/v1/finance/petty-cash/funds` — list / create funds (POST: finance admin).
- `GET/POST /api/v1/finance/petty-cash/replenishments` — list / request replenishment.
- `PATCH /api/v1/finance/petty-cash/replenishments/[id]` — `approve` / `reject` (finance admin).
- `GET /api/v1/finance/budget-lines` — budget lines for dropdowns (`fiscal_year`, `month`, `channel`).
- `GET /api/v1/finance/budget-catalog` — nested categories → items → lines (Presupuesto tab).
- `GET /api/v1/finance/petty-cash/categories` — legacy global catalog (still used for labels / Excel mapping where applicable).

### UI

- **Caja Chica**: `/dashboard/finanzas/caja-chica` — fund selector, movements, replenishments tab, import/export.
- **Fondos**: `/dashboard/finanzas/caja-chica/fondos` — admin-only fund management.

### Receipts

- Supabase Storage bucket `petty-cash-receipts`.

---

## Presupuesto (Budgeting)

### POA operativo (free text)

- **Upsert-driven** POA lines via `/api/v1/finance/poa` (strategic lines by source `CAJA_CHICA` / `CUENTA_BAC`).

### Partidas presupuestales (V2 catalog)

- Formal tree: `budget_categories` → `budget_items` → `budget_lines` (month + `fiscal_year`, channels `fiscal` / `non_fiscal`).
- UI: second tab on `/dashboard/finanzas/presupuesto` loads `GET /api/v1/finance/budget-catalog`.

### Legacy note

- Older docs referred to `budgets` keyed by `petty_cash_categories`; after `20260326_finance_engine_v2.sql` the renamed legacy table is `budgets_legacy` if the migration ran.

---

## Data portability

- **Excel export**: `src/lib/finance/export-xlsx.ts` (SheetJS) — supports V2 movement shape (`movement_date`, `amount_in` / `amount_out`, nested `budget_lines`).
- **Legacy import**: `src/lib/finance/import-xlsx.ts` maps sheets to rows; the Caja Chica UI resolves category names to `budget_line_id` per movement month.
