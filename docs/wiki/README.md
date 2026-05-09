---
title: "LEC Orb Wiki — índice temático"
slug: wiki-index
date: 2026-05-09
updated: 2026-05-09
tags: [wiki, moc, index, knowledge-map]
status: active
audience: [engineering]
related_components:
  - documentation
---

# Wiki LEC Orb — índice temático (Knowledge Map)

Este documento agrupa el conocimiento del repo **por dominio de negocio y por dependencias**, enlazando las páginas existentes en `docs/` (y documentos clave en la raíz). Sirve para navegación profunda junto con el **[MOC principal](../index.md)**.

**Cómo usarlo:** elige un bloque temático → abre el enlace. Las páginas wiki dedicadas van enlazadas en cada sección; el historial de huecos cerrados está al final.

---

## A. Plataforma y narrativa

| Tema | Documentos | Notas (por qué importa) |
|------|------------|-------------------------|
| Visión y mensaje ejecutivo | [LEC_EXECUTIVE_BRIEF](../LEC_EXECUTIVE_BRIEF.md) | Alinea prioridades con stakeholders. |
| Mapa maestro de la app | [LEC_ORB_MASTER_MAP](../LEC_ORB_MASTER_MAP.md) | **Mapa de dependencias conceptuales** entre módulos. |
| Brechas ERP | [ERP_GAP_MATRIX_AND_MODULES](../ERP_GAP_MATRIX_AND_MODULES.md) | Qué falta vs ERP clásico. |
| Roadmap | [ROADMAP](../ROADMAP.md) | Dirección temporal de entregables. |
| Changelog | [CHANGELOG](../CHANGELOG.md) | Historial de cambios publicados. |

**Dependencias cruzadas:** `PROJECT_CONTEXT.md` (raíz) complementa visión + contexto para agentes.

---

## B. Arranque, repo y continuidad

| Tema | Documentos |
|------|------------|
| Setup y uso | [README](../../README.md) |
| Continuidad entre equipos | [HANDOFF](../../HANDOFF.md) |
| Contexto de proyecto | [PROJECT_CONTEXT](../../PROJECT_CONTEXT.md) |
| Infra / estado | [INFRASTRUCTURE_STATUS](../../INFRASTRUCTURE_STATUS.md) |
| Automatización / agentes | [AGENTS](../../AGENTS.md), [CLAUDE](../../CLAUDE.md) |

---

## C. API, datos y permisos

| Tema | Documentos |
|------|------------|
| Módulos y APIs | [API_MODULES](../API_MODULES.md) |
| Esquema de datos | [DATABASE_SCHEMA](../DATABASE_SCHEMA.md) |
| RBAC / grupos | [RBAC_9_GROUPS_VALIDATION](../RBAC_9_GROUPS_VALIDATION.md) |
| Modo demo | [DEMO_MODE](../DEMO_MODE.md) |

**Índice de dependencias sugerido:** `module_registry` (Supabase) ↔ [API_MODULES](../API_MODULES.md) ↔ sidebar Next (`src/components/sidebar-nav.tsx`). Actualizar los tres cuando cambie categoría de un módulo.

---

## D. Autenticación, invitaciones y onboarding

| Tema | Documentos | ADR |
|------|------------|-----|
| UX auth | [AUTH_UI_UX_AUDIT](../AUTH_UI_UX_AUDIT.md) | — |
| Invitaciones / guías | [ONBOARDING_INVITACIONES_Y_GUIAS](../ONBOARDING_INVITACIONES_Y_GUIAS.md) | [ADR-001](../adr/ADR-001-invitation-rpc.md) |
| **Contrato técnico POST invitaciones** | **[invitaciones-campos-y-api](./invitaciones-campos-y-api.md)** | — |

Detalle de validación (Zod, sede, puesto, orden 400 vs 403): **[invitaciones-campos-y-api](./invitaciones-campos-y-api.md)**.

---

## E. Project management (empresa) y coordinación

| Tema | Documentos | ADR |
|------|------------|-----|
| Módulo PM | [PROJECT_MANAGEMENT_MODULE](../PROJECT_MANAGEMENT_MODULE.md) | [ADR-007](../adr/ADR-007-project-management-module-foundation.md) |
| Rutas PM | [PM_PATHS_AND_ROUTES](../PM_PATHS_AND_ROUTES.md) | |
| Runbook PM | [PM_RUNBOOK](../PM_RUNBOOK.md) | |

**Rutas de aplicación (referencia rápida):** `/dashboard/proyectos-global/*`, `/dashboard/proyectos` — detalle en [PM_PATHS_AND_ROUTES](../PM_PATHS_AND_ROUTES.md).

---

## F. Eventos, documentación por examen y “Coordinación de Exámenes”

**Wiki dedicada:** **[eventos-documentos-coordinacion](./eventos-documentos-coordinacion.md)** (rutas, tags, migraciones, permisos, planner).

| Artefacto | Ubicación |
|-----------|-----------|
| UI lista / detalle / checklist | `src/app/(dashboard)/dashboard/coordinacion-examenes/` |
| Redirecciones legacy | `src/app/(dashboard)/dashboard/institucional/` → rutas nuevas |
| Registro módulo documentos | `supabase/migrations/20260507_event_documents_module.sql` |
| Categorías sidebar | `supabase/migrations/20260524_coordinacion_examenes_sidebar.sql` |
| Navegación | `src/components/sidebar-nav.tsx` |

**Enlaces de dominio relacionados:** [CAMBRIDGE_LOGISTICS_IMPORT_MATRIX](../CAMBRIDGE_LOGISTICS_IMPORT_MATRIX.md), [API_MODULES](../API_MODULES.md) (módulo `event-documents`).

---

## G. Finanzas

| Tema | Documentos |
|------|------------|
| Módulos financieros | [FINANCE_MODULES](../FINANCE_MODULES.md) |
| Backlog Caja Chica | [LEC_Backlog_POA_CajaChica](../../LEC_Backlog_POA_CajaChica.md) |

---

## H. SGC (calidad)

| Tema | Documentos | ADR |
|------|------------|-----|
| Módulo | [SGC_MODULE](../SGC_MODULE.md) | [ADR-005](../adr/ADR-005-sgc-domain-model-phase1.md), [ADR-006](../adr/ADR-006-sgc-workflow-rules-in-database.md) |
| Matrices | [SGC_MATRICES](../SGC_MATRICES.md) | |
| Planificación sprint | [SGC_SPRINT_PLAN](../SGC_SPRINT_PLAN.md), [SGC_SPRINT01_EXECUTION_BOARD](../SGC_SPRINT01_EXECUTION_BOARD.md) | |
| Backlog | [BACKLOG_SGC](../BACKLOG_SGC.md) | |

---

## I. Cambridge / CENNI / datos auxiliares

| Tema | Documentos |
|------|------------|
| Matriz logística Cambridge | [CAMBRIDGE_LOGISTICS_IMPORT_MATRIX](../CAMBRIDGE_LOGISTICS_IMPORT_MATRIX.md) |
| CSV trámites CENNI | [CSV](../cenni/TRAMITE%20CENNIs%20-%20TRAMITES%20(1).csv) (no Markdown) |

---

## J. Observabilidad y dashboards ejecutivos

Entrada: [executive-observability/README](../executive-observability/README.md).

| Subtema | Documento |
|---------|-----------|
| Handoff dashboards | [HANDOFF_DASHBOARDS](../executive-observability/HANDOFF_DASHBOARDS.md) |
| Rutas | [PATHS_AND_ROUTES](../executive-observability/PATHS_AND_ROUTES.md) |
| KPIs / pantallas | [SCREENS_AND_KPIS](../executive-observability/SCREENS_AND_KPIS.md) |
| Runbook | [RUNBOOK_DASHBOARD_OBSERVABILITY](../executive-observability/RUNBOOK_DASHBOARD_OBSERVABILITY.md) |
| Esquema propuesto | [DB_SCHEMA_PROPOSAL](../executive-observability/DB_SCHEMA_PROPOSAL.md) |
| Backlog MVP v2 | [BACKLOG_MVP_V2](../executive-observability/BACKLOG_MVP_V2.md) |
| Tickets / sprint | [TICKETS_SPRINT_BOARD](../executive-observability/TICKETS_SPRINT_BOARD.md) |
| Decisión arquitectura | [ADR-008](../adr/ADR-008-executive-dashboard-and-observability.md) |

---

## K. Operación general y calidad de software

| Tema | Documentos |
|------|------------|
| Runbook app | [RUNBOOK](../RUNBOOK.md) |
| Guía de testing | [TESTING_GUIDE](../TESTING_GUIDE.md) |
| Patrones de tests | [TESTING_PATTERNS](../TESTING_PATTERNS.md) |

---

## L. Design system y patrones de app

| Tema | ADR |
|------|-----|
| UI premium / sistema visual | [ADR-004](../adr/ADR-004-premium-saas-design-system.md) |
| Params async Next.js 15 | [ADR-003](../adr/ADR-003-async-params-nextjs15.md) |
| Server Actions sin throw | [ADR-002](../adr/ADR-002-server-actions-no-throw.md) |

---

## Páginas Wiki añadidas (huecos cerrados)

| Tema | Archivo |
|------|---------|
| Coordinación de exámenes + documentos de evento | [eventos-documentos-coordinacion](./eventos-documentos-coordinacion.md) |
| Invitaciones — campos y API | [invitaciones-campos-y-api](./invitaciones-campos-y-api.md) |

---

## Grafo rápido (texto)

```text
README / HANDOFF
       ↓
LEC_ORB_MASTER_MAP ←→ API_MODULES ←→ DATABASE_SCHEMA
       ↓                      ↓
  RBAC validation      module_registry / sidebar-nav
       ↓
ONBOARDING + ADR-001 → invitations API → join flow
       ↓
PM module (ADR-007) ↔ proyectos-global / proyectos
       ↓
SGC (ADR-005/006) — Finance — Executive observability (ADR-008)
```

---

Volver al **[MOC principal](../index.md)**.
