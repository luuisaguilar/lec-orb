# Finance Modules Technical Documentation

This document describes the architecture and logic of the **Caja Chica** and **Presupuesto** modules within the LEC Platform.

## 🏦 Caja Chica (Petty Cash)
The Petty Cash module tracks daily transactional flows across all business units.

### Core Logic
- **Balance Calculation**: Performed server-side using the `fn_petty_cash_balance` SQL function to ensure $100\%$ accuracy. It sums all `INCOME` and subtracts all `EXPENSE` movements.
- **Organization Scoping**: All movements are strictly tied to an `org_id`.
- **Receipts**: Integrated with Supabase Storage (`petty-cash-receipts` bucket).

### API Endpoints
- `GET /api/v1/finance/petty-cash`: List movements with pagination and filters (search, category, type, dates).
- `POST /api/v1/finance/petty-cash`: Create a new movement. Triggers an audit log entry.
- `GET /api/v1/finance/petty-cash/balance`: Efficiently fetch the current balance for an organization.

---

## 📅 Presupuesto (Budgeting)
The Budgeting module allows administrators to set monthly targets and track performance.

### Core Logic
- **Upsert-Driven**: Budgets are managed via an upsert pattern on `(org_id, category_id, month, year)`.
- **Comparative Analysis**: The system calculates the variance between the defined budget and real movements recorded in the same month/category.

### API Endpoints
- `GET /api/v1/finance/budget`: Fetch entries for a specific month and year.
- `POST /api/v1/finance/budget`: Bulk upsert budget items.

---

## 📈 Data Portability
- **Excel Export**: Uses `xlsx` to generate multi-tenant reports.
- **Legacy Import**: A specialized utility in `src/lib/finance/import-xlsx.ts` parses multi-sheet Excel files from legacy systems, mapping them to the new schema.
