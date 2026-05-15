---
title: "LEC Orb — Mapa de contenidos (MOC)"
slug: docs-index
date: 2026-05-09
updated: 2026-05-15
status: active
audience: [engineering, product, operations]
related_components:
  - next-app
  - supabase
  - module-registry
---

# Documentación LEC Orb — punto de entrada (MOC)

Este archivo es el **índice maestro** (*Map of Content*) del repositorio `lec-orb`: enlaza guías, runbooks, ADRs y material de producto **sin sustituir** el contenido de cada archivo. Para profundidad técnica por dominio, usa **[Wiki — índice temático](./wiki/README.md)**.

**Convención de rutas:** los enlaces son relativos a `docs/` salvo los que apuntan a la raíz del repo (`../`).

---

## 1. Arranque y contexto del repositorio

| Recurso | Para qué sirve |
|--------|----------------|
| [README principal](../README.md) | Instalación, scripts, stack y uso básico del proyecto. |
| [HANDOFF](../HANDOFF.md) | Estado operativo reciente, decisiones de sprint y continuidad entre personas. |
| [PROJECT_CONTEXT](../PROJECT_CONTEXT.md) | Contexto de negocio/plataforma para agentes y onboarding rápido. |
| [AGENTS](../AGENTS.md) | Reglas e instrucciones para asistentes / automatización en el repo. |
| [CLAUDE](../CLAUDE.md) | Guías específicas del proyecto para Claude / uso en IDE. |
| [INFRASTRUCTURE_STATUS](../INFRASTRUCTURE_STATUS.md) | Estado de infraestructura / dependencias externas (cuando aplica). |

---

## 2. Mapa y visión de producto (lectura ejecutiva + inventario)

| Recurso | Para qué sirve |
|--------|----------------|
| [LEC_EXECUTIVE_BRIEF](./LEC_EXECUTIVE_BRIEF.md) | Resumen ejecutivo: narrativa y foco de valor. |
| [LEC_ORB_MASTER_MAP](./LEC_ORB_MASTER_MAP.md) | Mapa maestro de módulos, flujos y relaciones en la plataforma. |
| [ERP_GAP_MATRIX_AND_MODULES](./ERP_GAP_MATRIX_AND_MODULES.md) | Brechas ERP vs capacidades actuales y módulos. |
| [ROADMAP](./ROADMAP.md) | Dirección de producto y entregables planificados. |
| [CHANGELOG](./CHANGELOG.md) | Historial de cambios documentados en releases/notas. |

---

## 3. API, módulos y datos

| Recurso | Para qué sirve |
|--------|----------------|
| [BACKEND_DOCUMENTATION_PLAN](./BACKEND_DOCUMENTATION_PLAN.md) | Roadmap para cerrar huecos de documentación backend (auditoría). |
| [BACKEND_FLOWS](./BACKEND_FLOWS.md) | Flujos E2E as-built (invitación, eventos, nómina, IH, portal, hub LEC, CRM). |
| [API_MODULES](./API_MODULES.md) | Catálogo de módulos API y convenciones. |
| [DATABASE_SCHEMA](./DATABASE_SCHEMA.md) | Esquema y convenciones de datos (alto nivel). |
| [RBAC_9_GROUPS_VALIDATION](./RBAC_9_GROUPS_VALIDATION.md) | Validación de grupos y permisos (RBAC). |
| [DEMO_MODE](./DEMO_MODE.md) | Modo demo: motivación y comportamiento esperado. |

---

## 4. Autenticación, invitaciones y onboarding

| Recurso | Para qué sirve |
|--------|----------------|
| [AUTH_UI_UX_AUDIT](./AUTH_UI_UX_AUDIT.md) | Auditoría UX/UI del flujo de autenticación. |
| [ONBOARDING_INVITACIONES_Y_GUIAS](./ONBOARDING_INVITACIONES_Y_GUIAS.md) | Onboarding, invitaciones y guías operativas. |

**ADRs relacionados:** [ADR-001](./adr/ADR-001-invitation-rpc.md).

---

## 5. Project management (PM) y proyectos globales

| Recurso | Para qué sirve |
|--------|----------------|
| [PROJECT_MANAGEMENT_MODULE](./PROJECT_MANAGEMENT_MODULE.md) | Módulo de gestión de proyectos: alcance y diseño. |
| [PM_PATHS_AND_ROUTES](./PM_PATHS_AND_ROUTES.md) | Rutas y paths del área PM. |
| [PM_RUNBOOK](./PM_RUNBOOK.md) | Runbook operativo PM. |
| [ADR-007 — PM foundation](./adr/ADR-007-project-management-module-foundation.md) | Decisión de arquitectura del PM. |

---

## 5b. Coordinaciones LEC (Exámenes, Feria, Académica, Proyectos)

| Recurso | Para qué sirve |
|--------|----------------|
| [BACKEND_DOCUMENTATION_PLAN](./BACKEND_DOCUMENTATION_PLAN.md) | **Plan en 4 pasos:** schema/API, flujos E2E, drift check, estados implementado vs planificado. |
| [COORDINACIONES_LEC_ARQUITECTURA](./COORDINACIONES_LEC_ARQUITECTURA.md) | **Entrada canónica:** cuatro ejes, sidebar objetivo, interconexión y roadmap. |
| [COORDINACION_PROYECTOS_LEC](./COORDINACION_PROYECTOS_LEC.md) | Hub KPI / concentrado: tablas, API, RBAC. |
| [Wiki — auditoría sidebar](./wiki/auditoria-coordinaciones-sidebar.md) | Inventario mayo 2026, matrices condensar/agregar. |
| [Wiki — sedes y BC](./wiki/sedes-multisede-y-aislamiento-operativo.md) | Multisede sin comprometer datos operativos. |
| [Wiki — operación hub LEC](./wiki/coordinacion-proyectos-lec.md) | Guía para coordinadores (pestañas, import, departamentos). |

---

## 6. Finanzas

| Recurso | Para qué sirve |
|--------|----------------|
| [FINANCE_MODULES](./FINANCE_MODULES.md) | Módulos financieros (caja chica, presupuesto, etc.). |
| [LEC_Backlog_POA_CajaChica](../LEC_Backlog_POA_CajaChica.md) | Backlog / POA específico de Caja Chica (raíz del repo). |

---

## 7. SGC (Sistema de Gestión de Calidad)

| Recurso | Para qué sirve |
|--------|----------------|
| [SGC_MODULE](./SGC_MODULE.md) | Descripción del módulo SGC. |
| [SGC_MATRICES](./SGC_MATRICES.md) | Matrices y referencias cruzadas SGC. |
| [SGC_SPRINT_PLAN](./SGC_SPRINT_PLAN.md) | Planificación por sprint (SGC). |
| [SGC_SPRINT01_EXECUTION_BOARD](./SGC_SPRINT01_EXECUTION_BOARD.md) | Tablero de ejecución Sprint 01. |
| [BACKLOG_SGC](./BACKLOG_SGC.md) | Backlog de trabajo SGC. |
| [ADR-005](./adr/ADR-005-sgc-domain-model-phase1.md) | Modelo de dominio SGC (fase 1). |
| [ADR-006](./adr/ADR-006-sgc-workflow-rules-in-database.md) | Reglas de workflow SGC en base de datos. |

---

## 8. Cambridge / logística de exámenes

| Recurso | Para qué sirve |
|--------|----------------|
| [CAMBRIDGE_LOGISTICS_IMPORT_MATRIX](./CAMBRIDGE_LOGISTICS_IMPORT_MATRIX.md) | Matriz de importación / logística Cambridge. |
| [CENNI — CSV de trámites](./cenni/TRAMITE%20CENNIs%20-%20TRAMITES%20(1).csv) | Datos de referencia (no Markdown): trámites CENNI. |

---

## 9. Observabilidad y dashboards ejecutivos

Carpeta dedicada: **[executive-observability](./executive-observability/README.md)**.

| Recurso | Para qué sirve |
|--------|----------------|
| [README](./executive-observability/README.md) | Índice del paquete de observabilidad ejecutiva. |
| [HANDOFF_DASHBOARDS](./executive-observability/HANDOFF_DASHBOARDS.md) | Handoff de dashboards. |
| [PATHS_AND_ROUTES](./executive-observability/PATHS_AND_ROUTES.md) | Rutas y navegación. |
| [SCREENS_AND_KPIS](./executive-observability/SCREENS_AND_KPIS.md) | Pantallas e indicadores. |
| [RUNBOOK_DASHBOARD_OBSERVABILITY](./executive-observability/RUNBOOK_DASHBOARD_OBSERVABILITY.md) | Runbook de operación. |
| [DB_SCHEMA_PROPOSAL](./executive-observability/DB_SCHEMA_PROPOSAL.md) | Propuesta de esquema para métricas/datos. |
| [BACKLOG_MVP_V2](./executive-observability/BACKLOG_MVP_V2.md) | Backlog MVP v2. |
| [TICKETS_SPRINT_BOARD](./executive-observability/TICKETS_SPRINT_BOARD.md) | Tablero de tickets / sprint. |
| [ADR-008](./adr/ADR-008-executive-dashboard-and-observability.md) | Decisiones de dashboard y observabilidad. |

---

## 10. Operaciones, calidad y pruebas

| Recurso | Para qué sirve |
|--------|----------------|
| [RUNBOOK](./RUNBOOK.md) | Runbook general de la aplicación (operación). |
| [TESTING_GUIDE](./TESTING_GUIDE.md) | Guía de pruebas. |
| [TESTING_PATTERNS](./TESTING_PATTERNS.md) | Patrones recomendados en tests. |

---

## 11. Architecture Decision Records (ADRs)

Todos bajo [`docs/adr/`](./adr/):

| ADR | Enlace |
|-----|--------|
| ADR-001 Invitación RPC | [ADR-001-invitation-rpc](./adr/ADR-001-invitation-rpc.md) |
| ADR-002 Server actions sin throw | [ADR-002-server-actions-no-throw](./adr/ADR-002-server-actions-no-throw.md) |
| ADR-003 Async params Next.js 15 | [ADR-003-async-params-nextjs15](./adr/ADR-003-async-params-nextjs15.md) |
| ADR-004 Design system SaaS | [ADR-004-premium-saas-design-system](./adr/ADR-004-premium-saas-design-system.md) |
| ADR-005 SGC dominio fase 1 | [ADR-005-sgc-domain-model-phase1](./adr/ADR-005-sgc-domain-model-phase1.md) |
| ADR-006 SGC reglas en BD | [ADR-006-sgc-workflow-rules-in-database](./adr/ADR-006-sgc-workflow-rules-in-database.md) |
| ADR-007 PM foundation | [ADR-007-project-management-module-foundation](./adr/ADR-007-project-management-module-foundation.md) |
| ADR-008 Dashboard ejecutivo | [ADR-008-executive-dashboard-and-observability](./adr/ADR-008-executive-dashboard-and-observability.md) |

---

## 12. Wiki (explicación profunda por dominio)

- **[Índice del Wiki (temas, dependencias y enlaces)](./wiki/README.md)** — lectura recomendada después de este MOC.
- **[Coordinaciones LEC — arquitectura](./COORDINACIONES_LEC_ARQUITECTURA.md)** — cuatro ejes + hub + multisede.
- **[Flujos backend E2E](./BACKEND_FLOWS.md)** — F1–F7 con diagramas y estado implementado.
- **[Auditoría sidebar coordinaciones](./wiki/auditoria-coordinaciones-sidebar.md)** — estado actual y plan por fases.
- **[Sedes multiregión](./wiki/sedes-multisede-y-aislamiento-operativo.md)** — Baja California y RLS propuesto.
- **[Coordinación proyectos LEC — operación](./wiki/coordinacion-proyectos-lec.md)** — guía de uso del concentrado.
- **[Eventos — documentos y Coordinación de Exámenes](./wiki/eventos-documentos-coordinacion.md)** — rutas, tags, migraciones y navegación.
- **[Invitaciones — campos obligatorios y API](./wiki/invitaciones-campos-y-api.md)** — contrato Zod, orden de validación y sedes/puesto.
- **[Sidebar — módulos y agrupación](./wiki/sidebar-modulos-y-agrupacion.md)** — padres, subgrupos, plantilla para agentes.

---

## Mantenimiento de este índice

Al añadir un `.md` nuevo bajo `docs/` (o un doc operativo en la raíz), **actualiza este archivo** y la sección correspondiente en [`wiki/README.md`](./wiki/README.md). Objetivo: un solo lugar de descubrimiento (MOC) + un índice semántico (Wiki).
