# Propuesta de esquema (Dashboards y Observabilidad)

Este documento NO es una migracion. Define el esquema sugerido si se requieren tablas de cache/agregados/alertas.

Reglas:
- Todas las tablas con `org_id` y RLS desde el dia 1.
- Evitar duplicar fuentes: snapshots y agregados son derivaciones, no "source of truth".

---

## 1) `executive_kpi_snapshots` (opcional)

Objetivo: cache historico de KPIs para cargar rapido Home Ejecutivo y series.

Campos sugeridos:
- `id uuid pk`
- `org_id uuid not null`
- `kpi_key text not null` (ej. `revenue_mtd`, `payroll_mtd`)
- `period_start date not null`
- `period_end date not null`
- `value numeric not null`
- `meta jsonb not null default '{}'` (unidad, currency, fuente, notas)
- `computed_at timestamptz not null default now()`

Indices sugeridos:
- `(org_id, kpi_key, period_start, period_end)` unique
- `(org_id, computed_at desc)`

Notas:
- Se puede poblar por job/cron o bajo demanda con upsert.

---

## 2) `ops_alerts` (opcional)

Objetivo: registrar alertas activas e historial de disparos.

Campos sugeridos:
- `id uuid pk`
- `org_id uuid not null`
- `alert_key text not null` (ej. `error_rate_high`, `payroll_processing_stuck`)
- `severity text not null` (`info`|`warn`|`critical`)
- `status text not null` (`open`|`ack`|`resolved`)
- `title text not null`
- `description text not null`
- `entity_type text null` (ej. `endpoint`, `payroll_period`)
- `entity_id uuid null`
- `detected_at timestamptz not null default now()`
- `resolved_at timestamptz null`
- `last_seen_at timestamptz not null default now()`
- `meta jsonb not null default '{}'` (thresholds, samples, links)

Indices sugeridos:
- `(org_id, status, severity, last_seen_at desc)`
- `(org_id, alert_key, detected_at desc)`

---

## 3) `ops_error_fingerprints` (opcional)

Objetivo: agrupar errores por firma para UI de "Error Monitor".

Campos sugeridos:
- `id uuid pk`
- `org_id uuid not null`
- `fingerprint text not null` (hash o firma estable)
- `first_seen_at timestamptz not null`
- `last_seen_at timestamptz not null`
- `count_24h int not null default 0`
- `count_7d int not null default 0`
- `sample_message text not null`
- `sample_stack text null`
- `top_endpoints jsonb not null default '[]'`
- `meta jsonb not null default '{}'`

Indices sugeridos:
- `(org_id, last_seen_at desc)`
- `(org_id, fingerprint)` unique

Notas:
- Puede alimentarse desde logs estructurados o integracion con Sentry (si aplica).

---

## 4) `ops_request_logs` (solo si se decide persistir logs en DB)

Recomendacion: evitar persistir TODO en Postgres si no es necesario. Si se persiste:

Campos sugeridos:
- `id uuid pk`
- `org_id uuid not null`
- `request_id text not null`
- `user_id uuid null`
- `method text not null`
- `path text not null`
- `status int not null`
- `latency_ms int not null`
- `error_code text null`
- `message text null`
- `meta jsonb not null default '{}'`
- `created_at timestamptz not null default now()`

Indices sugeridos:
- `(org_id, created_at desc)`
- `(org_id, request_id)` unique
- `(org_id, path, created_at desc)`

Consideraciones:
- Rotacion (TTL) por job: 7-30 dias.
- Alternativa recomendada: logs en proveedor externo + UI solo consulta agregados.

---

## 5) Politicas RLS (patron)

Todas las tablas anteriores:
- Select: miembros de la org.
- Insert/Update/Delete: solo `admin`/`supervisor` o rol tecnico (segun politica de ops).

---

## 6) Contratos API (referencia)

Los endpoints ejecutivos deben retornar:
- `asOf` (timestamp)
- `range` (period_start, period_end)
- `filters` (org_id, unit_id opcional)
- `kpis` (lista tipada)
- `series` (cuando aplique)

Los endpoints de observabilidad deben soportar:
- paginacion
- filtros por `org_id`, `user_id`, `path`, `status`
- busqueda por `request_id`
