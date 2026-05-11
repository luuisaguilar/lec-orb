---
title: "Sprint A — Estabilización del módulo Finanzas"
slug: finance-sprint-a-stabilization
date: 2026-05-11
updated: 2026-05-11
status: in_progress
audience: [engineering]
related_components:
  - finanzas
  - supabase
  - rls
related_docs:
  - ./FINANCE_MODULE_AUDIT_2026-05.md
  - ./FINANCE_ROADMAP.md
  - ./adr/ADR-009-finance-engine-v2-consolidation.md
---

# Sprint A — Estabilización del módulo Finanzas

**Estado:** 🟡 En ejecución  
**Duración estimada:** 1-2 semanas (1 dev senior)  
**Prioridad:** P0 — bloqueante para cualquier evolución posterior  
**Origen:** [Auditoría Finanzas 2026-05](./FINANCE_MODULE_AUDIT_2026-05.md) §3 (Hallazgos P0-1 a P2-3)

---

## Progreso

- [x] **A2 (Día 1)** — RLS `payments` (cierre de fuga multi-tenant)
  - **DB/RLS**: migración `supabase/migrations/20260527_payments_org_scoping.sql`
    - Agrega `org_id` (si faltaba), hace backfill por `created_by → org_members`, valida que no queden `NULL`, aplica `NOT NULL`.
    - Elimina la policy permisiva (`USING (true)`) y crea policies org-scoped para `SELECT/INSERT/UPDATE/DELETE`.
  - **API**: `src/app/api/v1/payments/route.ts` (GET) filtra por `.eq("org_id", member.org_id)` como defensa en profundidad.
  - **Test**: `src/tests/api/payments.test.ts` valida que el GET aplique el filtro por `org_id`.
  - **Validación manual (post-migración)**:
    - `SELECT COUNT(*) FROM public.payments WHERE org_id IS NULL;` debe ser **0**
    - Con usuario de org A: `SELECT * FROM public.payments;` debe retornar **solo** org A (por RLS)

- [x] **A3 (Día 2)** — Folios autogenerados (`fn_next_folio`)
  - **DB**: `supabase/migrations/20260528_folio_sequences.sql` — contador global por `(doc_type, year)` (compatibilidad con `UNIQUE(folio)` en tablas); `fn_next_folio` en `SECURITY DEFINER` valida membresía en `p_org_id`.
  - **API**: `src/lib/finance/next-folio.ts` + POST en `quotes`, `purchase_orders`, `payments`.
  - **UI**: sin campo folio en `AddQuoteDialog`, `AddOrderDialog`, `RegisterPaymentDialog`.
  - **Tests**: `quotes.test.ts`, `purchase-orders.test.ts`, `payments.test.ts`.

- [x] **A5 (Día 3)** — `exceljs` en imports de finanzas (pagos + caja legacy)
  - **Dependencia**: `exceljs` añadido; **`xlsx` se mantiene** para exports y demás imports no migrados (A5.6).
  - **Código**: `src/lib/import/exceljs-sheet-json.ts`, `exceljs-guard.ts`; `import-xlsx.ts` (caja legacy); `payments/import/route.ts`.
  - **Límites**: `EXCEL_IMPORT_MAX_BYTES` (5 MB) + `guardExcelImportSize` / `guardExcelImportBuffer` en `xlsx-guard.ts`; validación de forma del libro vía `guardExceljsWorkbook`.
  - **Sanitización**: `sanitizeImportString` en celdas de texto hacia inserts.

## Objetivos

1. ✅ Eliminar la deuda arquitectónica del **Finance Engine V1 vs V2 huérfano**.
2. ✅ Cerrar la **fuga multi-tenant de `payments`** (P0 de seguridad).
3. ✅ Profesionalizar `quotes`, `purchase_orders` y `payments` (importes, folios autogenerados, IVA).
4. ✅ Sustituir `xlsx` por `exceljs` en imports (vulnerabilidad HIGH activa).
5. ✅ Dejar el módulo listo para construir Sprint B (CxC), C (CxP), D (GL).

## Definition of Done global

- [ ] `npm run build` exit 0
- [ ] `npm run lint` sin nuevos errors
- [ ] `npm run test` con cobertura mínima de cada nueva ruta API
- [ ] Smoke test E2E (Playwright) de caja chica, presupuesto, pagos
- [ ] Migración SQL aplicada en producción sin pérdida de datos
- [ ] `database.types.ts` regenerado (UTF-8) y commiteado
- [ ] Auditoría manual: `SELECT * FROM payments` retorna sólo movimientos de mi org
- [ ] Audit log con eventos correctos por cada nueva mutación
- [ ] Documentación actualizada en `docs/FINANCE_MODULE_AUDIT_2026-05.md` § decisiones

---

## Historias de usuario

### A1 — Migrar Caja Chica UI/API al Finance Engine V2 `[DB][API][UI]`

**Story points:** 8

**Contexto:**

`20260326_finance_engine_v2.sql` renombró `petty_cash_movements → petty_cash_movements_legacy` y creó V2 con multi-fondo y enlace a `budget_lines`. La UI/API actuales asumen schema V1; verificación en producción (2026-05-11) confirma que `petty_cash_movements` (V2) está vacía y `petty_cash_movements_legacy` existe. La migración a V2 es ahora **viable y necesaria** (decisión Luis 2026-05-11).

**Schema V2 (canónico, ya en DB):**

```sql
-- Estructura presupuestal (jerárquica)
budget_categories  (id, org_id, name, sort_order, is_active)
  └─ budget_items  (id, org_id, category_id, code, name, channel_scope)
       └─ budget_lines (id, org_id, item_id, fiscal_year, month, channel,
                        budgeted_amount, actual_amount, notes)

-- Caja chica con fondos
petty_cash_funds (id, org_id, fiscal_year, name, custodian_id,
                  initial_amount, current_balance, status open/closed)

replenishment_requests (id, org_id, fund_id, request_date, requested_amount,
                        justification, status pending/approved/rejected,
                        approved_by, approved_at)

petty_cash_movements (id, org_id, fund_id, budget_line_id,
                      replenishment_request_id, movement_date, concept,
                      amount_in, amount_out, balance_after, receipt_url,
                      registered_by, approved_by, status posted/cancelled)
```

**Triggers y RPCs existentes (NO tocar):**

- `fn_recalculate_fund_balance(p_fund_id UUID)` — recalcula balance del fondo.
- `fn_sync_movement_to_ledger()` — trigger BEFORE INSERT/UPDATE/DELETE en `petty_cash_movements` que sincroniza balance de fondo + `actual_amount` de `budget_lines`.
- `fn_handle_replenishment_approval()` — trigger AFTER UPDATE en `replenishment_requests` que crea movimiento `amount_in` al aprobar.
- `fn_is_finance_admin(p_org_id)` — helper RLS.

**Pre-requisitos antes de codear:**

1. Validar en producción (script idempotente):
   ```sql
   -- Estos queries DEBEN correrse antes de mergear A1
   SELECT to_regclass('petty_cash_movements_legacy');  -- esperado: existe
   SELECT to_regclass('budgets_legacy');                -- esperado: existe
   SELECT COUNT(*) FROM petty_cash_movements;           -- esperado: 0
   SELECT COUNT(*) FROM petty_cash_movements_legacy;    -- registrar nº — datos a preservar
   SELECT COUNT(*) FROM budgets_legacy;                 -- registrar nº — datos a preservar
   ```
2. **Tomar snapshot de las tablas legacy** antes de cualquier cambio:
   ```sql
   CREATE TABLE _backup_petty_cash_movements_legacy AS
       SELECT * FROM petty_cash_movements_legacy;
   CREATE TABLE _backup_budgets_legacy AS
       SELECT * FROM budgets_legacy;
   ```
3. Asegurar que ningún cron job activo escribe en V1 (búsqueda en `src/app/api/v1/cron/`).

**Tareas:**

- [ ] **A1.1 [DB]** Crear migración `20260527_finance_v2_seed_default_fund_and_categories.sql` que, por cada org existente:
  - Crea un fondo default `Caja Chica General` con custodio = admin de la org y `initial_amount = (SELECT initial_balance FROM petty_cash_settings WHERE org_id=...)`.
  - Crea categorías presupuestales mínimas a partir de las `petty_cash_categories` actuales (Papelería, Limpieza, Oficina, …) → ahora son `budget_categories`.
  - Por cada categoría legacy, crea **1 `budget_item`** con `code = slug` + `channel_scope='non_fiscal'`.
  - **Backfill opcional** de movimientos legacy → V2 (si la org lo solicita; por default omitido porque legacy está vacía en prod).
- [ ] **A1.2 [API]** Reescribir `src/app/api/v1/finance/petty-cash/route.ts`:
  - GET con paginación + filtros por `fund_id`, `budget_line_id`, fecha, concepto.
  - POST con schema V2 (`amount_in XOR amount_out`, `budget_line_id` requerido para egresos).
  - Quitar `category_id` del body (ahora viene implícito a través de `budget_line_id`).
  - Mantener `logAudit` + `withAuth({ module: "finanzas", action: "view|edit" })`.
- [ ] **A1.3 [API]** Nueva ruta `GET /api/v1/finance/petty-cash/funds` (listar fondos de la org).
- [ ] **A1.4 [API]** Nueva ruta `POST /api/v1/finance/petty-cash/funds` (crear fondo — admin only).
- [ ] **A1.5 [API]** Nueva ruta `/api/v1/finance/petty-cash/replenishments` con GET (listar) y POST (solicitar).
- [ ] **A1.6 [API]** `PATCH /api/v1/finance/petty-cash/replenishments/[id]` con acción `approve` / `reject` (admin only).
- [ ] **A1.7 [UI]** Refactorizar `src/app/(dashboard)/dashboard/finanzas/caja-chica/page.tsx`:
  - Selector de **fondo** (dropdown con todos los fondos abiertos de la org).
  - Selector de **partida presupuestal** (`budget_line` del mes en curso) al registrar egreso.
  - Tab nueva **"Reposiciones"** con listado + solicitar reposición.
  - Mostrar `balance_after` por movimiento + `current_balance` del fondo.
- [ ] **A1.8 [UI]** Página de gestión de fondos `/dashboard/finanzas/caja-chica/fondos` (admin only).
- [ ] **A1.9 [UI]** Refactorizar `src/app/(dashboard)/dashboard/finanzas/presupuesto/page.tsx`:
  - Mantener `poa_lines` para POA estratégico (texto libre).
  - Agregar segunda tab "Partidas Presupuestales" que opera sobre `budget_categories/items/lines` (catálogo formal usado por caja chica).
- [ ] **A1.10 [TEST]** Tests en `src/tests/api/finance/petty-cash.v2.test.ts`:
  - POST egreso sin `budget_line_id` → 400.
  - POST egreso > balance del fondo → 400 (validar trigger).
  - Aprobar replenishment → crea movimiento automático.
  - Verificar `actual_amount` de budget_line se actualiza.
- [ ] **A1.11 [DB]** Una vez verificado todo, **eliminar tablas legacy**:
  ```sql
  -- Migración 20260528_drop_petty_cash_legacy.sql
  DROP TABLE IF EXISTS petty_cash_movements_legacy CASCADE;
  DROP TABLE IF EXISTS budgets_legacy CASCADE;
  -- Mantener _backup_* por 30 días, luego DROP
  ```
- [ ] **A1.12** Regenerar `src/types/database.types.ts` (UTF-8 con `Out-File -Encoding utf8`).
- [ ] **A1.13** Actualizar `docs/FINANCE_MODULES.md` (deprecar mención a V1, agregar V2).
- [ ] **A1.14** Actualizar `docs/DATABASE_SCHEMA.md` reflejando el nuevo modelo de Caja Chica.

**Riesgos y mitigaciones:**

| Riesgo | Mitigación |
|---|---|
| Datos de producción se pierden al hacer DROP de legacy | Snapshot `_backup_*` por 30 días + verificar `COUNT(*)` antes |
| Triggers V2 fallan con datos malformados | Tests de integración antes de habilitar UI |
| UI rompe acceso al módulo durante migración | Feature flag `NEXT_PUBLIC_FINANCE_V2_ENABLED` (toggle por org en `org_settings`) |
| Custodios sin definir bloquean creación de fondos | Default custodian = primer admin de la org |

---

### A2 — Tightening RLS de `payments` `[DB][RLS]`

**Story points:** 3  
**Severidad:** 🔴 CRÍTICA — fuga multi-tenant activa

**Tareas:**

- [ ] **A2.1 [DB]** Crear migración `20260527_payments_org_scoping.sql`:
  ```sql
  -- 1. Agregar org_id si no existe (probablemente ya existe vía 20240308_payments_expansion)
  ALTER TABLE public.payments
      ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

  -- 2. Back-fill por created_by → org_members
  UPDATE public.payments p
  SET org_id = om.org_id
  FROM public.org_members om
  WHERE om.user_id = p.created_by AND p.org_id IS NULL;

  -- 3. Verificar — si quedan NULL, asignar a una org default o eliminar (soft delete)
  -- (paso manual antes de aplicar paso 4)

  -- 4. NOT NULL + index
  ALTER TABLE public.payments ALTER COLUMN org_id SET NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_payments_org ON public.payments(org_id);

  -- 5. Drop policy permisiva
  DROP POLICY IF EXISTS "Allow authenticated full access to payments" ON public.payments;

  -- 6. Recrear policies org-scoped
  CREATE POLICY "payments_select_org_members"
      ON public.payments FOR SELECT TO authenticated
      USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

  CREATE POLICY "payments_insert_org_members"
      ON public.payments FOR INSERT TO authenticated
      WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

  CREATE POLICY "payments_update_org_members"
      ON public.payments FOR UPDATE TO authenticated
      USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

  CREATE POLICY "payments_delete_org_members"
      ON public.payments FOR DELETE TO authenticated
      USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));
  ```
- [ ] **A2.2 [API]** Actualizar `src/app/api/v1/payments/route.ts` GET para filtrar `.eq("org_id", member.org_id)`.
- [ ] **A2.3 [API]** Actualizar `src/app/api/v1/payments/[id]/route.ts` (PATCH/DELETE) idem.
- [ ] **A2.4 [API]** Actualizar `src/app/api/v1/payments/bulk-delete/route.ts` para filtrar por `org_id`.
- [ ] **A2.5 [API]** Actualizar `src/app/api/v1/payments/import/route.ts` para inyectar `org_id: member.org_id`.
- [ ] **A2.6 [TEST]** Test multi-tenant: crear pago en org-A, autenticarse como user de org-B, verificar 0 resultados en GET.

---

### A3 — Folios autogenerados (quotes, purchase_orders, payments) `[DB][API]`

**Story points:** 3

**Tareas:**

- [x] **A3.1 [DB]** `supabase/migrations/20260528_folio_sequences.sql` (secuencia global por `doc_type`+`year`; RPC `SECURITY DEFINER`).
- [x] **A3.2 [API]** POST quotes / purchase-orders / payments: sin `folio` → `rpc('fn_next_folio')`; con `folio` → validación `PREFIX-AAAA-NNNNN`.
- [x] **A3.3 [UI]** Sin input de folio en los tres diálogos; mensaje de asignación automática.
- [x] **A3.4 [TEST]** Dos POST seguidos sin folio → RPC dos veces (cobertura anti-colisión en cliente).

---

### A4 — Importes en `quotes` y `purchase_orders` `[DB][API][UI]`

**Story points:** 5

**Tareas:**

- [ ] **A4.1 [DB]** Migración `20260528_quotes_orders_amounts.sql`:
  ```sql
  ALTER TABLE public.quotes
      ADD COLUMN IF NOT EXISTS subtotal NUMERIC(15,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS taxes    NUMERIC(15,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total    NUMERIC(15,2) GENERATED ALWAYS AS (subtotal + taxes) STORED,
      ADD COLUMN IF NOT EXISTS currency CHAR(3) DEFAULT 'MXN',
      ADD COLUMN IF NOT EXISTS valid_until DATE,
      ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id),
      ADD COLUMN IF NOT EXISTS notes TEXT;

  -- Idem para purchase_orders
  ALTER TABLE public.purchase_orders
      ADD COLUMN IF NOT EXISTS subtotal NUMERIC(15,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS taxes    NUMERIC(15,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total    NUMERIC(15,2) GENERATED ALWAYS AS (subtotal + taxes) STORED,
      ADD COLUMN IF NOT EXISTS currency CHAR(3) DEFAULT 'MXN',
      ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id),
      ADD COLUMN IF NOT EXISTS expected_delivery DATE,
      ADD COLUMN IF NOT EXISTS notes TEXT;

  -- Tabla de partidas (line items)
  CREATE TABLE IF NOT EXISTS public.quote_items (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      quote_id    UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      quantity    NUMERIC(12,4) NOT NULL DEFAULT 1,
      unit_price  NUMERIC(15,2) NOT NULL DEFAULT 0,
      subtotal    NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
      tax_rate    NUMERIC(5,4) DEFAULT 0.16,  -- 16% IVA default
      sort_order  INT DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS public.purchase_order_items (
      -- estructura idéntica con quote_item_id como referencia opcional
      ...
  );

  ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "quote_items: org members" ON quote_items FOR ALL TO authenticated
      USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));
  -- Idem purchase_order_items
  ```
- [ ] **A4.2 [API]** Actualizar `POST /api/v1/quotes` para aceptar `items[]` y calcular totales.
- [ ] **A4.3 [API]** Actualizar `POST /api/v1/purchase-orders` idem + endpoint nuevo `POST /api/v1/quotes/[id]/convert-to-po` (genera OC desde cotización aprobada).
- [ ] **A4.4 [UI]** Refactorizar `AddQuoteDialog` y `AddOrderDialog` con tabla de partidas (agregar/eliminar líneas).
- [ ] **A4.5 [UI]** Página de detalle `/dashboard/cotizaciones/[id]` con vista PDF-like.
- [ ] **A4.6 [TEST]** Conversión quote→PO preserva items y totales.

---

### A5 — Sustituir `xlsx` por `exceljs` en imports `[SEC][API]`

**Story points:** 3  
**Razón:** SheetJS tiene CVE HIGH (prototype pollution, ReDoS) sin parche upstream.

**Tareas:**

- [x] **A5.1** `npm install exceljs` — `xlsx` **no** desinstalado aún (exports y otros módulos siguen con SheetJS).
- [x] **A5.2** `src/lib/finance/import-xlsx.ts` migrado a ExcelJS.
- [x] **A5.3** `src/app/api/v1/payments/import/route.ts` migrado a ExcelJS.
- [x] **A5.4** Tamaño máximo de import **5 MB** (`EXCEL_IMPORT_MAX_BYTES`, `guardExcelImportSize` / `guardExcelImportBuffer`).
- [x] **A5.5** Sanitización de strings con `sanitizeImportString` al mapear filas a inserts.
- [ ] **A5.6** Plan: migrar también export y resto de imports cliente/servidor en sprints futuros.
- [ ] **A5.7** Re-correr `npm audit` tras retirar `xlsx` del árbol (pendiente de migración global).

---

### A6 — Pulido y observabilidad `[INFRA][TEST]`

**Story points:** 2

- [ ] **A6.1** Agregar dashboard Sentry para errores del módulo finanzas (tag `module=finanzas`).
- [ ] **A6.2** Agregar event tags en `logAudit` para filtrar por subdomain (`caja-chica`, `presupuesto`, `pagos`, `ih-billing`).
- [ ] **A6.3** Smoke test E2E Playwright: crear movimiento caja chica V2, ver en lista, eliminar.
- [ ] **A6.4** Actualizar `INFRASTRUCTURE_STATUS.md` con el progreso del Sprint A.

---

## Total story points del Sprint A: **24**

(Equivale a ~1.5 semanas para 1 dev senior dedicado, o 2 semanas con interrupciones.)

---

## Orden recomendado de ejecución

| Día | Tareas | Razón |
|---|---|---|
| **1** | A2 (RLS payments) | Seguridad — hay fuga activa, prioridad máxima |
| **2** | A3 (folios) | Bloqueante para A4 |
| **3** | A5 (exceljs) | Independiente, bajo riesgo, alto valor de seguridad |
| **4-6** | A1.1 a A1.6 (DB + API de V2) | Backend antes que frontend |
| **7-9** | A1.7 a A1.10 (UI + tests V2) | Frontend cuando backend está sólido |
| **10** | A1.11-A1.14 (drop legacy + docs) | Limpieza final |
| **11-12** | A4 (importes en quotes/PO) | Habilita Sprint C |
| **13** | A6 (observabilidad + smoke E2E) | Pulido |

---

## Pre-conditions antes de empezar

- [ ] Aprobación del ADR-009.
- [ ] Backup completo de la DB de producción.
- [ ] Verificación manual de los queries de §A1 "Pre-requisitos".
- [ ] Feature flag `NEXT_PUBLIC_FINANCE_V2_ENABLED` agregado al `.env.example`.

## Post-Sprint A: ¿qué sigue?

- **Sprint B** — CxC robusta + aging multi-cliente. Ver [FINANCE_ROADMAP.md](./FINANCE_ROADMAP.md).
- **Sprint C** — Compras y CxP completo. Ver [FINANCE_ROADMAP.md](./FINANCE_ROADMAP.md).
- En paralelo: decisiones build-vs-buy para Sprint D y E.
