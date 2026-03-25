# Database Schema Documentation

The Finance modules utilize several tables and server-side functions in Supabase (PostgreSQL).

## 📊 Tables

### `petty_cash_categories`
Catalog for transaction and budget categorization.
- `name`: Human-readable name (e.g., "Ventas", "Servicios").
- `slug`: Machine name used for logic/routing.

### `petty_cash_movements`
The main transactional table.
- `org_id`: Foreign key to organization.
- `type`: `INCOME` or `EXPENSE`.
- `amount`: Numeric value.
- `receipt_url`: Link to Supabase Storage.
- `RLS`: Policies restrict view/edit to members of the same organization.

### `budgets`
Monthly financial targets.
- `org_id`, `category_id`, `month`, `year`: Unique constraint for upserts.
- `amount`: Target value for the period.

## ⚙️ Functions (RPCs)

### `fn_petty_cash_balance(p_org_id UUID)`
Computes the current balance.
- **Logic**: `SUM(amount) WHERE type = 'INCOME' - SUM(amount) WHERE type = 'EXPENSE'`.

## 🔒 Security (RLS)
All tables in the Finance schema have Row Level Security enabled.
- **Select**: Allowed if `auth.uid()` belongs to the movement's `org_id`.
- **Insert/Update**: Restricted to authenticated users with `admin` or `manager` roles.
- **Audit Logging**: A trigger-like pattern on the API side logs all mutations to the `audit_logs` table.
