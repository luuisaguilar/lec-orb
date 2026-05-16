---
title: "Plan de documentación backend — auditoría LEC Orb"
slug: backend-documentation-plan
date: 2026-05-15
updated: 2026-05-15
status: active
implementation:
  step_1: completed
  step_2: completed
  step_3: pending
  step_4: pending
audience: [engineering, product, operations]
related_components:
  - DATABASE_SCHEMA
  - API_MODULES
  - BACKEND_FLOWS
---

# Plan de documentación backend (4 pasos)

Plan maestro para cerrar brechas de **schema**, **API**, **flujos E2E** y **trazabilidad doc↔código**, alineado con la auditoría de mayo 2026 y con las **coordinaciones LEC** ya documentadas.

**Regla de ejecución:** completar **un paso a la vez**, marcar checklist, luego pasar al siguiente. No mezclar paso 3 (script) antes de terminar paso 1 (contenido base).

| Paso | Nombre | Entregable principal | Esfuerzo estimado |
|------|--------|----------------------|-------------------|
| **1** | Schema + API (huecos) | `DATABASE_SCHEMA` §17–22 + `API_MODULES` CRM/IH/PM/inventory/courses | 2–3 días |
| **2** | Flujos E2E | `BACKEND_FLOWS.md` (7 diagramas + narrativa) | 1–2 días |
| **3** | Drift check API | `check:api-docs-drift` + CI opcional | 0.5–1 día |
| **4** | Implementado vs plan | Badges + tabla en docs clave | 0.5 día |

**Total orientativo:** 4–6 días de enfoque documental (una persona), o 2 sprints si se hace entre features.

---

## Contexto — qué ya existe (no repetir)

| Recurso | Estado |
|---------|--------|
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | §1–16 core; falta CRM, IH, inventory, PM, courses, org_locations |
| [API_MODULES.md](./API_MODULES.md) | ~40 módulos; faltan CRM, IH, PM, courses, portal, planning, payroll extendido |
| [COORDINACIONES_LEC_ARQUITECTURA.md](./COORDINACIONES_LEC_ARQUITECTURA.md) | Producto coordinaciones — **hecho** |
| [wiki/sedes-multisede-y-aislamiento-operativo.md](./wiki/sedes-multisede-y-aislamiento-operativo.md) | **Planificado** (RLS sede) |
| `npm run check:sidebar-docs` | Sidebar ↔ wiki coordinaciones — **hecho** |
| ADRs | Invitaciones, SGC, PM, CRM-009, ejecutivo |

---

## Paso 1 — Completar `DATABASE_SCHEMA` + `API_MODULES`

### Objetivo

Un auditor puede responder *“qué tablas y qué endpoints tiene CRM/IH/PM/inventario”* **solo leyendo docs**, con referencia a migración y módulo RBAC.

### 1.1 `DATABASE_SCHEMA.md` — nuevas secciones

| § | Dominio | Migración(es) fuente | Tablas principales |
|---|---------|---------------------|-------------------|
| **17** | Catálogo sedes | `20260521_org_locations_catalog.sql` | `org_locations`; columna `org_members.location` |
| **18** | CRM comercial | `20260512_crm_prospects.sql`, `20260513_crm_foundation_v2.sql` | `crm_contacts`, `crm_opportunities`, `crm_activities`, `crm_prospects` (si sigue activa) |
| **19** | IH Billing (CxC) | `20260429_ih_billing.sql` + deltas | `ih_tariffs`, `ih_invoices`, `ih_sessions`, `ih_payments`, `ih_payment_sessions` |
| **20** | Inventario feria | `20260510_sprint_4_courses_inventory.sql` | `inventory_*`, `courses` (simulador) |
| **21** | Project Management | `20260515_project_management_module_phase1.sql` | `pm_projects`, `pm_boards`, `pm_columns`, `pm_tasks`, `pm_labels`, `pm_task_labels` |
| **22** | RPCs y buckets (ampliar) | grep en `supabase/migrations/` | Añadir RPCs CRM/IH; buckets `cenni-certificates`, `viaticos-receipts`, etc. |

**Plantilla por tabla** (igual que §1–16):

- Columnas clave + tipos + FK  
- UNIQUE / CHECK relevantes  
- RLS en una línea (quién SELECT / INSERT / UPDATE)  
- Nota “implementado” vs “columna legacy” si aplica  

**Tarea transversal Paso 1.1:**

- [ ] Añadir en §“Notas de seguridad” enlace a futura matriz RLS (Paso 4).  
- [ ] Documentar en §17 que **RLS por sede en datos operativos = planificado** (enlace wiki sedes).

### 1.2 `API_MODULES.md` — nuevos capítulos

| Capítulo | Rutas (`src/app/api/v1/`) | RBAC module slug |
|----------|---------------------------|------------------|
| **CRM** | `crm/contacts`, `crm/opportunities`, `crm/activities` (+ `[id]`) | `crm-pipeline`, `crm-directory`, `crm-activities` (ver `permissions.ts`) |
| **IH Billing** | `finance/ih/sessions`, `invoices`, `payments`, `tariffs`, `summary`, `import` | `ih-billing` / alias `finanzas` |
| **PM** | `pm/projects`, `pm/tasks`, `pm/tasks/[id]/move` | `project-management` |
| **Courses** | `courses` | `courses` |
| **Inventario** | Ya parcial vía `packs`/`scan` — **separar** o aclarar relación `inventory` vs `packs` | `inventory` |

**Por endpoint documentar (mínimo):**

- Métodos HTTP  
- Query/body (Zod si existe)  
- Response shape (ej. `{ opportunities: [] }` — gotcha CRM)  
- Módulo + acción RBAC  
- `logAudit` en mutaciones (sí/no)  

**Índice rápido:** actualizar tabla al inicio de `API_MODULES.md`.

### 1.3 Fuentes de verdad al escribir (orden obligatorio)

1. `supabase/migrations/<archivo>.sql`  
2. `src/app/api/v1/<ruta>/route.ts`  
3. `src/lib/auth/permissions.ts` (`Module`, `MODULE_ALIAS_MAP`)  
4. Tests: `src/tests/api/*.test.ts`  
5. ADR existente ([ADR-009](./adr/ADR-009-crm-module-foundation.md), [FINANCE_MODULES](./FINANCE_MODULES.md), [PROJECT_MANAGEMENT_MODULE](./PROJECT_MANAGEMENT_MODULE.md))

### 1.4 Criterios de aceptación — Paso 1

- [ ] `DATABASE_SCHEMA` tiene §17–22 con todas las tablas listadas arriba.  
- [ ] `API_MODULES` índice incluye CRM, IH, PM, Courses; cada uno con al menos GET/POST documentados.  
- [ ] [index.md](./index.md) y [wiki/README.md](./wiki/README.md) enlazan el plan o las secciones nuevas.  
- [ ] Entrada en [CHANGELOG.md](./CHANGELOG.md).  
- [ ] Revisión cruzada: ningún FK en `lec_program_projects` apunta a tabla sin doc.

### 1.5 Orden interno recomendado (sub-pasos)

```text
1.1a  §17 org_locations
1.1b  §19 IH (negocio crítico CxC)
1.1c  §18 CRM
1.1d  §20 inventory + courses
1.1e  §21 PM
1.1f  §22 RPCs/buckets
1.2a  API CRM (copiar patrón CENNI)
1.2b  API IH
1.2c  API PM + courses
1.2d  Actualizar índice + RBAC matrix al final de API_MODULES
```

---

## Paso 2 — `BACKEND_FLOWS.md` (flujos E2E as-built)

### Objetivo

Un solo documento con **flujos de punta a punta** que un auditor o coordinador nuevo pueda seguir. Cada flujo: diagrama Mermaid + pasos numerados + tablas/APIs tocadas + **estado implementado**.

### 2.1 Flujos obligatorios (7)

| ID | Flujo | Actores | APIs / tablas principales | Docs existentes a fusionar |
|----|-------|---------|---------------------------|----------------------------|
| **F1** | Invitación → alta en org | Admin, invitado | `invitations`, `fn_accept_invitation`, `member_module_access` | [wiki/invitaciones-campos-y-api.md](./wiki/invitaciones-campos-y-api.md), ADR-001 |
| **F2** | Evento Cambridge (ciclo operativo) | Coordinación, aplicadores | `events`, `event_sessions`, `event_staff`, `schools` | [wiki/eventos-documentos-coordinacion.md](./wiki/eventos-documentos-coordinacion.md), CAMBRIDGE_LOGISTICS |
| **F3** | Nómina por evento | Coordinación, portal | `payroll_*`, `payroll_line_items` | AGENTS.md gotchas, FINANCE parcial |
| **F4** | IH CxC (sesión → factura → pago) | Finanzas, coordinación | `ih_sessions`, `ih_invoices`, `ih_payments` | CLAUDE.md Sprint 2, ADR negocio |
| **F5** | Portal aplicador | Applicator | `portal/*`, `withApplicatorAuth` | HANDOFF portal |
| **F6** | Concentrado LEC (hub) | Supervisor, operador | `lec_*`, coordinacion-proyectos API | [COORDINACION_PROYECTOS_LEC.md](./COORDINACION_PROYECTOS_LEC.md) |
| **F7** | CRM oportunidad → cotización (parcial) | Comercial | `crm_opportunities`, `quotes` | ADR-009 Fase 3 pendiente |

### 2.2 Plantilla por flujo (copiar en `BACKEND_FLOWS.md`)

```markdown
## F{n} — {Título}

| Campo | Valor |
|-------|--------|
| Estado | Implementado / Parcial / Planificado |
| Módulos sidebar | … |
| Última revisión | YYYY-MM-DD |

### Diagrama

```mermaid
sequenceDiagram
  …
```

### Pasos

1. …
2. …

### Tablas y APIs

| Paso | API | Tabla(s) |

### Errores y permisos frecuentes

- 403: …
- 400: …

### Enlaces

- …
```

### 2.3 Criterios de aceptación — Paso 2

- [ ] Archivo `docs/BACKEND_FLOWS.md` creado con frontmatter.  
- [ ] Los 7 flujos tienen diagrama + tabla APIs.  
- [ ] Cada flujo marca **Implementado | Parcial | Planificado**.  
- [ ] Enlaces desde [COORDINACIONES_LEC_ARQUITECTURA.md](./COORDINACIONES_LEC_ARQUITECTURA.md) § mantenimiento.  
- [ ] [index.md](./index.md) § nueva “Flujos backend”.  
- [ ] CHANGELOG actualizado.

### 2.4 Orden interno recomendado

```text
2a  F1 Invitaciones (más documentado — calentamiento)
2b  F4 IH CxC (crítico negocio)
2c  F2 Evento Cambridge
2d  F3 Nómina
2e  F5 Portal
2f  F6 Concentrado LEC
2g  F7 CRM (marcar Parcial explícito)
```

---

## Paso 3 — `check:api-docs-drift` (automatización)

### Objetivo

Detectar cuando alguien añade `route.ts` sin actualizar `API_MODULES.md` (mismo espíritu que `check:sidebar-docs`).

### 3.1 Diseño del script

| Entrada | Salida |
|---------|--------|
| Glob `src/app/api/v1/**/route.ts` | Lista de prefijos API (ej. `crm/opportunities`, `finance/ih/sessions`) |
| Parse índice de `API_MODULES.md` | Rutas documentadas |
| Allowlist opcional | Rutas internas/cron que no van al índice público |

**Comportamiento:**

- Exit **0**: toda ruta en allowlist o mencionada en índice/cuerpo del markdown.  
- Exit **1**: lista rutas huérfanas + sugerencia de sección.  
- Flag `--write-hint`: imprime plantilla markdown para pegar (opcional v2).

**Archivos:**

- `scripts/check-api-docs-drift.ts`  
- `package.json` → `"check:api-docs": "npx tsx scripts/check-api-docs-drift.ts"`  
- Meta-script opcional: `check:docs` → sidebar + api  

### 3.2 Allowlist inicial (no fallar en falso positivo)

| Prefijo | Motivo |
|---------|--------|
| `auth/post-login-redirect` | Interno auth |
| `cron/*` | Jobs |
| `users/me` | Ya documentado bajo Users |
| `portal/*` | Documentar en Paso 1.2 ampliación o allowlist hasta Paso 2 F5 |

Decisión en ejecución Paso 3: **preferir documentar portal** en API_MODULES antes que allowlist permanente.

### 3.3 Criterios de aceptación — Paso 3

- [ ] Script corre local sin errores tras Paso 1 completado.  
- [ ] Documentado en [BACKEND_FLOWS.md](./BACKEND_FLOWS.md) o RUNBOOK § “Calidad de docs”.  
- [ ] Opcional: job CI en GitHub Actions `npm run check:api-docs` (solo si Paso 1 verde).  
- [ ] CHANGELOG.

### 3.4 Dependencia

**Bloqueado hasta:** Paso 1.2d (índice API_MODULES actualizado). Si se corre antes, fallará con lista enorme — es esperado.

---

## Paso 4 — Marcar **Implementado** vs **Planificado**

### Objetivo

Evitar que auditoría o operaciones asuman que sede RLS, feria completa o CRM Fase 3 están en producción porque aparecen en un diagrama.

### 4.1 Convención visual (markdown)

| Badge | Significado |
|-------|-------------|
| `🟢 Implementado` | En prod: UI + API + tablas + RLS org_id |
| `🟡 Parcial` | Alguna capa falta (ej. UI sin RLS sede) |
| `🔵 Planificado` | Solo diseño/doc; sin API o sin RLS |
| `⚪ Propuesto` | Idea / ADR / backlog |

### 4.2 Archivos a actualizar

| Archivo | Qué marcar |
|---------|------------|
| [wiki/sedes-multisede-y-aislamiento-operativo.md](./wiki/sedes-multisede-y-aislamiento-operativo.md) | Encabezado **🔵 Planificado** (RLS Fase 3) |
| [COORDINACIONES_LEC_ARQUITECTURA.md](./COORDINACIONES_LEC_ARQUITECTURA.md) | Tabla §9 fases con badges |
| [BACKEND_FLOWS.md](./BACKEND_FLOWS.md) | Columna Estado por flujo (Paso 2) |
| [ERP_GAP_MATRIX_AND_MODULES.md](./ERP_GAP_MATRIX_AND_MODULES.md) | Nota al pie: matriz = gap producto, no estado técnico |
| Nuevo: **`docs/IMPLEMENTATION_STATUS.md`** (opcional, 1 página) | Tabla maestra módulo × estado |

### 4.3 Tabla maestra sugerida (`IMPLEMENTATION_STATUS.md`)

Columnas: `Módulo | Schema | API | UI | RLS org | RLS sede | Doc API | Doc schema | Tests`

Filas iniciales: Coordinación Exámenes, Feria/inventory, Académica, Hub LEC, CRM, IH, PM, Portal, SGC, Finanzas V2.

### 4.4 Criterios de aceptación — Paso 4

- [ ] Convención de badges en este plan + README wiki.  
- [ ] Sedes doc marcada Planificado salvo catálogo `org_locations` (Implementado).  
- [ ] `IMPLEMENTATION_STATUS.md` o tabla equivalente en BACKEND_FLOWS anexo.  
- [ ] CHANGELOG.

### 4.5 Dependencia

Ideal **después** de Pasos 1–2 (estados basados en verdad documentada).

---

## Calendario sugerido (una persona)

| Semana | Día | Paso |
|--------|-----|------|
| 1 | Lun–Mié | **Paso 1** (schema + API) |
| 1 | Jue | **Paso 2** (flujos F1–F4) |
| 1 | Vie | **Paso 2** (F5–F7) + revisión |
| 2 | Lun | **Paso 3** (script + CI) |
| 2 | Mar | **Paso 4** (badges + status table) |
| 2 | Mié | Buffer + PR único o 4 PRs pequeños |

---

## Estrategia de PRs

| PR | Contenido | Revisores ideales |
|----|-----------|-------------------|
| PR-1 | Paso 1 solo (`DATABASE_SCHEMA` + `API_MODULES`) | Backend + alguien negocio IH/CRM |
| PR-2 | Paso 2 `BACKEND_FLOWS.md` | Producto + coordinación |
| PR-3 | Paso 3 script + npm script | DevOps |
| PR-4 | Paso 4 badges + `IMPLEMENTATION_STATUS.md` | Product |

Ventaja: PR-1 desbloquea auditoría de datos; PR-3 solo merge cuando PR-1 esté verde.

---

## Checklist global (marcar al cerrar cada paso)

### Paso 1 — Schema + API
- [x] §17–22 en DATABASE_SCHEMA
- [x] CRM, IH, PM, courses en API_MODULES
- [x] Índice y CHANGELOG

### Paso 2 — Flujos
- [x] BACKEND_FLOWS.md con 7 flujos
- [x] Enlaces desde index y coordinaciones

### Paso 3 — Drift API
- [ ] `npm run check:api-docs`
- [ ] RUNBOOK o plan actualizado

### Paso 4 — Estados
- [ ] Badges en docs clave
- [ ] IMPLEMENTATION_STATUS (o anexo)

---

## Cómo pedir cada paso al agente (copy-paste)

**Paso 1:**
```text
Ejecuta Paso 1 del docs/BACKEND_DOCUMENTATION_PLAN.md:
añade DATABASE_SCHEMA §17–22 y API_MODULES para CRM, IH, PM, courses/inventory.
Sigue migraciones y route.ts; actualiza index y CHANGELOG.
```

**Paso 2:**
```text
Ejecuta Paso 2 del BACKEND_DOCUMENTATION_PLAN.md:
crea docs/BACKEND_FLOWS.md con flujos F1–F7 (Mermaid + tablas APIs + estado).
```

**Paso 3:**
```text
Ejecuta Paso 3 del BACKEND_DOCUMENTATION_PLAN.md:
scripts/check-api-docs-drift.ts y npm run check:api-docs.
```

**Paso 4:**
```text
Ejecuta Paso 4 del BACKEND_DOCUMENTATION_PLAN.md:
badges Implementado/Parcial/Planificado y docs/IMPLEMENTATION_STATUS.md.
```

---

## Referencias

| Documento | Uso en este plan |
|-----------|------------------|
| [COORDINACIONES_LEC_ARQUITECTURA.md](./COORDINACIONES_LEC_ARQUITECTURA.md) | Producto coordinaciones (ya hecho) |
| [BACKEND_DOCUMENTATION_PLAN.md](./BACKEND_DOCUMENTATION_PLAN.md) | Este archivo |
| [RUNBOOK.md](./RUNBOOK.md) | Añadir § verificación docs post-deploy |
| [TESTING_GUIDE.md](./TESTING_GUIDE.md) | Enlazar tests API por módulo |

---

Volver a [index.md](./index.md) · [wiki/README.md](./wiki/README.md)
