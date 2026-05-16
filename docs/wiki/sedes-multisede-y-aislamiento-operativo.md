---
title: "Sedes multiregión y aislamiento operativo"
slug: sedes-multisede-aislamiento
date: 2026-05-15
updated: 2026-05-15
tags: [wiki, sede, baja-california, rbac, rls, multitenancy]
status: active
audience: [engineering, product, operations]
related_components:
  - org_locations
  - org_members
  - sidebar-nav
  - ih-billing
---

# Sedes multiregión y aislamiento operativo

Guía para operar **Sonora**, **Baja California** y **Nuevo León** en una sola organización (`org_id`) sin que el personal operativo vea datos de otra sede. Complementa [COORDINACIONES_LEC_ARQUITECTURA.md](../COORDINACIONES_LEC_ARQUITECTURA.md) y la [auditoría de sidebar](./auditoria-coordinaciones-sidebar.md).

---

## 1. Problema de negocio

- LEC tiene presencia en varias regiones; **Baja California** es una sede con logística, CxC IH, eventos y personal propios.
- Hoy un operador con acceso a módulos de exámenes puede ver **datos globales de la org** si la API no filtra por sede.
- **No** se recomienda duplicar módulos en el sidebar (“Exámenes BC” vs “Exámenes Sonora”): duplica mantenimiento y confunde permisos.

**Solución objetivo:** sede como **atributo** del usuario y de los registros, con filtro en API/RLS.

---

## 2. Modelo de datos actual

### 2.1 Catálogo de sedes

| Tabla | Migración | Uso |
|-------|-----------|-----|
| `org_locations` | `20260521_org_locations_catalog.sql` | Nombres normalizados por org |

Seed típico: **SONORA**, **BAJA CALIFORNIA**, **NUEVO LEON** (+ sedes legacy migradas desde texto libre en invitaciones).

### 2.2 Usuario y membresía

| Campo | Tabla | Comportamiento |
|-------|-------|----------------|
| `location` | `org_members` | Texto validado contra `org_locations` al invitar |
| `location` | `org_invitations` | Obligatorio en flujo actual |

Lectura en auth: `get-member.ts` expone `member.location` a handlers.

### 2.3 Datos operativos (parcial)

| Dominio | Campo sede | Archivo / nota |
|---------|------------|----------------|
| Aplicadores | `location_zone` | `applicators-dashboard.tsx` — filtro BC |
| IH Billing | `region` (SONORA / BC) | `ih-billing-dashboard.tsx` — tabs |
| Pagos import | columna `SEDE` → `location` | `payments/import/route.ts` |
| Concentrado LEC | `department_id` = “Baja California” | Dimensión de **reporte**, no seguridad |

### 2.4 Lo que aún no filtra por sede

- Listados de `events`, `payroll`, inventario global
- Mayoría de APIs bajo Coordinación Exámenes
- RLS: políticas actuales son por `org_id`, no por sede

---

## 3. Modelo objetivo (tres capas)

```text
┌─────────────────────────────────────────────────────────┐
│ Capa 1 — RBAC (qué módulos ve)                        │
│   member_module_access + rol admin/supervisor/operador   │
└───────────────────────────┬─────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│ Capa 2 — Alcance sede (qué filas ve)                    │
│   org_members.location (+ org_member_locations futuro)   │
│   RLS o query: WHERE location_scope matches row        │
└───────────────────────────┬─────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│ Capa 3 — UI (cómo lo expresa)                           │
│   Selector sede bajo Coordinación Exámenes              │
│   Badge en header: «Sede: Baja California»              │
└─────────────────────────────────────────────────────────┘
```

### 3.1 Reglas por rol (propuesta)

| Rol | Módulos | Datos |
|-----|---------|-------|
| `operador` | Según `member_module_access` | Solo filas de su `member.location` |
| `supervisor` | Amplios | Una o varias sedes (tabla puente opcional) |
| `admin` | Todos | Sin filtro de sede |
| `applicator` | Portal | Solo sus eventos/nómina (`applicator_id`) |

### 3.2 Módulos prioritarios para RLS

1. `ih-billing` / sesiones IH  
2. `payroll` / nóminas y `payroll_line_items`  
3. `events` / `event_sessions` / staff  
4. `inventory_*` alineado a `inventory_locations` ↔ `org_locations`  
5. `lec_program_projects` filtro por `department_id` o nuevo `location_id`

---

## 4. UI — contexto de sede en sidebar

**No** crear categoría «Baja California» en `module_registry`.

**Sí** (Fase 2–3):

- Subgrupo o selector bajo **Coordinación de Exámenes**: Sonora | Baja California | Todas (supervisor+).
- Persistir selección en URL (`?sede=`) o contexto React; propagar a fetches SWR.
- Reutilizar patrón de tabs IH (`ih-billing-dashboard.tsx`) de forma consistente.

Implementación: extender `sidebar-nav.tsx` solo si hace falta entrada “Sedes”; el filtro puede vivir en layout de `coordinacion-examenes/`.

---

## 5. Implementación técnica (checklist)

### Fase A — Esquema

- [ ] Añadir `location_id uuid REFERENCES org_locations(id)` en tablas operativas clave (migración nueva).
- [ ] Backfill desde `region`, `location_zone` o texto legacy.
- [ ] Índices `(org_id, location_id)` en tablas grandes.

### Fase B — API

- [ ] Helper `getMemberLocationScope(member)` en `src/lib/auth/`.
- [ ] `applyLocationScope(query, scope)` antes de `.select()` en rutas sensibles.
- [ ] Admin: `scope = null` → sin filtro extra.

### Fase C — RLS (opcional pero recomendado)

- [ ] Políticas `SELECT` que comparen `location_id` con sede del miembro vía función `fn_member_location_ids()`.
- [ ] Mantener fail-closed: sin sede asignada → operador no ve filas regionales (o solo “sin sede”).

### Fase D — Pruebas

- [ ] Vitest: operador BC no lista eventos Sonora.
- [ ] E2E: invitación con sede BC + login + assert listados.

---

## 6. Invitaciones y onboarding

Al crear usuario operativo de BC:

1. Elegir sede **BAJA CALIFORNIA** en diálogo de invitación ([invitaciones-campos-y-api.md](./invitaciones-campos-y-api.md)).
2. Asignar solo módulos necesarios (`member_module_access`).
3. Tras Fase 3, la sede restringe datos automáticamente.

**Supervisor regional:** `location` null o tabla `org_member_locations` con múltiples filas.

---

## 7. Distinciones importantes

| Concepto | Qué es | Qué no es |
|----------|--------|-----------|
| `org_locations.name` | Sede geográfica LEC | Departamento del concentrado |
| Depto «Baja California» en `lec_cp_departments` | Etiqueta de reporte KPI | Control de acceso |
| `cenni` estatus `BC` | Estado de caso CENNI | Baja California geográfica |
| `applicators.location_zone` | Zona del aplicador | Sede del usuario staff |

---

## 8. Riesgos si no se implementa RLS

- Operador BC ve nóminas o eventos de Sonora.
- Importaciones masivas mezclan regiones en un mismo listado.
- CxC IH muestra tab BC en UI pero API podría devolver ambas regiones.

---

## 9. Referencias

| Recurso | Ruta |
|---------|------|
| Migración sedes | `supabase/migrations/20260521_org_locations_catalog.sql` |
| Invitaciones + sede | [invitaciones-campos-y-api.md](./invitaciones-campos-y-api.md) |
| Arquitectura coordinaciones | [COORDINACIONES_LEC_ARQUITECTURA.md](../COORDINACIONES_LEC_ARQUITECTURA.md) |
| Auditoría sidebar | [auditoria-coordinaciones-sidebar.md](./auditoria-coordinaciones-sidebar.md) |
| RBAC general | [RBAC_9_GROUPS_VALIDATION.md](../RBAC_9_GROUPS_VALIDATION.md) |

---

Volver al **[índice wiki](./README.md)**.
