# Paths, Rutas y Ownership

Mapa sugerido para implementar el Dashboard Ejecutivo y el Modulo de Observabilidad.

> Nota: los paths son propuesta base para mantener consistencia con App Router actual.

---

## 1) UI Paths (Next.js)

## Dashboard Ejecutivo
- `src/app/(dashboard)/dashboard/executive/page.tsx`
- `src/app/(dashboard)/dashboard/executive/finanzas/page.tsx`
- `src/app/(dashboard)/dashboard/executive/operacion/page.tsx`
- `src/app/(dashboard)/dashboard/executive/riesgo/page.tsx`

## Observabilidad (admin/ops)
- `src/app/(dashboard)/dashboard/ops/observability/page.tsx`
- `src/app/(dashboard)/dashboard/ops/observability/logs/page.tsx`
- `src/app/(dashboard)/dashboard/ops/observability/errors/page.tsx`
- `src/app/(dashboard)/dashboard/ops/observability/apis/page.tsx`
- `src/app/(dashboard)/dashboard/ops/observability/audit/page.tsx`

---

## 2) API Routes sugeridas

## Ejecutivo
- `src/app/api/v1/executive/overview/route.ts`
- `src/app/api/v1/executive/finanzas/route.ts`
- `src/app/api/v1/executive/operacion/route.ts`
- `src/app/api/v1/executive/riesgo/route.ts`
- `src/app/api/v1/executive/resumen-semanal/route.ts`

## Observabilidad
- `src/app/api/v1/ops/logs/route.ts`
- `src/app/api/v1/ops/errors/route.ts`
- `src/app/api/v1/ops/metrics/route.ts`
- `src/app/api/v1/ops/audit/route.ts`
- `src/app/api/v1/ops/alerts/route.ts`

---

## 3) Libs / Servicios sugeridos

- `src/lib/executive/kpis.ts` (formulas y transformaciones)
- `src/lib/executive/summary.ts` (resumen narrativo)
- `src/lib/observability/log-parser.ts` (normalizacion)
- `src/lib/observability/metrics.ts` (agregaciones)
- `src/lib/observability/alerts.ts` (reglas)

---

## 4) Componentes UI sugeridos

- `src/components/executive/kpi-card.tsx`
- `src/components/executive/trend-chart.tsx`
- `src/components/executive/risk-traffic-light.tsx`
- `src/components/observability/log-table.tsx`
- `src/components/observability/error-list.tsx`
- `src/components/observability/api-health-chart.tsx`

---

## 5) Datos / tablas sugeridas (orientativo)

## Reuso esperado
- `audit_log` (linea de auditoria)
- tablas financieras existentes (ingresos, nomina, viaticos, presupuesto)
- tablas operativas existentes (eventos, sesiones, estatus de procesos)

## Nuevas agregadas opcion MVP+
- `executive_kpi_snapshots` (opcional, cache historico)
- `ops_alerts` (estado de alertas)
- `ops_error_fingerprints` (agrupacion de errores)

---

## 6) Ownership por ruta

- `/dashboard/executive/*` -> Product + Frontend + Data
- `/dashboard/ops/observability/*` -> Engineering + SRE/Soporte
- `/api/v1/executive/*` -> Backend + Data
- `/api/v1/ops/*` -> Backend
