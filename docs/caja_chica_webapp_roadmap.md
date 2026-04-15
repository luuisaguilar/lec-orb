# Caja Chica WebApp Roadmap

> Conversión a Markdown del archivo HTML interactivo.
> **Última actualización:** Abril 2026 (Reflejando implementación en `lec-orb`)

## Índice

- [Roadmap](#roadmap)
- [Backlog](#backlog)
- [Stack técnico](#stack-tecnico)
- [Modelo de datos](#modelo-de-datos)

## Roadmap

### ✅ Fase 1 — Fundación y registro de gastos (COMPLETADA)
- Auth (Next-Auth + permissions wrapper)
- BD con empresas LEC / DISCOVER / URUS
- Formulario de registro de gasto (Implemented in `/src/app/(dashboard)/dashboard/finanzas/caja-chica`)
- Selector de empresa (Scoping por `org_id`)
- Tabla de movimientos unificada
- Cálculo de saldo en tiempo real (RPC `fn_petty_cash_balance`)
- CRUD de movimientos (API v1)

### 🚀 Fase 2 — Dashboard consolidado y filtros (EN PROGRESO)
- [x] Paginación de movimientos
- [x] Filtro por empresa / fecha / categoría (Query params in API)
- [x] Búsqueda de concepto
- [ ] Vista unificada todas las empresas (Dashboard multitenant)
- [ ] KPIs: saldo, entradas, salidas
- [ ] Gráfica gastos por categoría

### 📅 Fase 3 — Presupuesto y comparativa (EN PROGRESO)
- [x] Módulo de presupuesto mensual (API v1 implemented)
- [x] Presupuesto por empresa y categoría (Upsert pattern)
- [ ] Variación presupuesto vs real (Comparative Logic)
- [ ] Alertas por categoría excedida
- [ ] Exportar a Excel (Feature present in `src/lib/finance/import-xlsx.ts` context)

### 🛠️ Fase 4 — Refinamiento y experiencia (PLANIFICADA)
- [ ] Roles: admin / visor (RBAC foundation ready)
- [ ] Subida de comprobante (Supabase Storage integration)
- [ ] Auditoría de cambios (Audit logging service implemented)
- [ ] App mobile-first responsiva

---

## Backlog

- **NextAuth.js** — auth
- **ExcelJS** — export

### Estructura de rutas

- **/dashboard** — consolidado
- **/gastos** — registro y tabla
- **/gastos/nuevo** — formulario
- **/presupuesto** — por mes
- **/configuracion** — empresas, saldos
- **/api/...** — route handlers

### Decisiones de diseño

- **Caja única consolidada** — vs hojas separadas
- **Campo empresa en cada gasto** — filtrable
- **Saldo calculado en BD** — no en frontend
- **Categorías en tabla enum** — extensible
- **Multi-empresa desde día 1** — diseño

## Modelo de datos

### Empresa

| Campo | Tipo | Nota |
|---|---|---|
| `id` | `UUID` | PK |
| `nombre` | `String` | LEC, DISCOVER, URUS… |
| `saldo_inicial` | `Decimal` | configurable |
| `activa` | `Boolean` | default true |
| `createdAt` | `DateTime` | auto |

### Movimiento

| Campo | Tipo | Nota |
|---|---|---|
| `id` | `UUID` | PK |
| `empresa_id` | `UUID` | FK → Empresa |
| `fecha` | `Date` | requerido |
| `concepto` | `String` | descripción del gasto |
| `categoria` | `Enum` | Papelería, Limpieza… |
| `tipo` | `Enum` | ENTRADA | SALIDA |
| `monto` | `Decimal` | siempre positivo |
| `parcial` | `Decimal?` | opcional, sub-concepto |
| `comprobante_url` | `String?` | Fase 4 |
| `notas` | `String?` | Fase 4 |
| `createdAt` | `DateTime` | auto |
| `createdBy` | `UUID` | FK → Usuario |

### Presupuesto

| Campo | Tipo | Nota |
|---|---|---|
| `id` | `UUID` | PK |
| `empresa_id` | `UUID` | FK → Empresa |
| `mes` | `Int` | 1–12 |
| `año` | `Int` | ej. 2025 |
| `categoria` | `Enum` | mismas que Movimiento |
| `monto` | `Decimal` | monto presupuestado |
| `updatedAt` | `DateTime` | auto |
