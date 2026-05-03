# SGC Sprint Execution Plan

Fecha: 2026-05-03  
Base técnica: `supabase/migrations/20260510_sgc_phase1.sql`

---

## Objetivo

Convertir la base SGC Fase 1 en operación real de negocio con entregas incrementales, medibles y auditables.

---

## Supuestos de planeación

- Duración sprint: 2 semanas
- Capacidad objetivo: 20-24 puntos por sprint
- Equipo base: 1-2 full-stack + 1 QA parcial
- Regla: no se modifica migración existente; solo nuevas migraciones

---

## Sprint SGC-01 (Fundación API + Catálogos)

Meta:

- API mínima operativa para NC y Acciones
- Catálogos SGC administrables

Historias (estimación):

1. API NC CRUD (`/api/v1/sgc/nonconformities`) - 5 pts
2. API Acciones CRUD (`/api/v1/sgc/actions`) - 5 pts
3. API Catálogos (`stages`, `origins`, `causes`, `severities`) - 3 pts
4. Validación permisos RBAC en rutas mutantes - 3 pts
5. Tests API críticos (happy path + permisos + transiciones inválidas) - 5 pts
6. Documentación endpoint contract (`docs/API_MODULES.md` addendum SGC) - 2 pts

Total estimado: 23 pts

Criterio de salida:

- Rutas mutantes con `withAuth`
- Mutaciones exitosas con `logAudit`
- Tests API del módulo en verde

---

## Sprint SGC-02 (UI NC/CAPA)

Meta:

- Operación diaria de NC/CAPA desde dashboard

Historias (estimación):

1. Lista NC (filtros, búsqueda, estado, severidad) - 5 pts
2. Detalle NC (origen, causa, análisis, evaluación, cierre) - 5 pts
3. Vista Kanban NC por etapa - 5 pts
4. Lista/edición de Acciones CAPA - 5 pts
5. UX/RBAC visual (acciones por rol y estados bloqueados) - 2 pts
6. E2E básicos NC/CAPA - 3 pts

Total estimado: 25 pts

Criterio de salida:

- Flujo completo NC -> acción -> cierre funcionando en UI
- Errores de transición reflejados con mensajes claros
- E2E base del flujo principal pasando

---

## Sprint SGC-03 (Auditorías + Revisiones + Evidencia)

Meta:

- Ciclo operativo completo de auditoría y revisión con soporte documental

Historias (estimación):

1. API/UI de Auditorías (cabecera + checklist) - 5 pts
2. Vincular hallazgos a NC y oportunidades a acciones - 3 pts
3. API/UI de Revisiones gerenciales - 5 pts
4. Integración evidencia con DMS (`documents`) - 5 pts
5. Timeline documental por entidad SGC - 3 pts
6. Tests integración (auditoría/revisión/evidencia) - 3 pts

Total estimado: 24 pts

Criterio de salida:

- Auditoría puede cerrar con checklist y hallazgos vinculados
- Revisión gerencial funcional con participantes y decisiones
- Evidencia visible y accesible por tenant

---

## Sprint SGC-04 (KPIs + Hardening + Go-Live)

Meta:

- Métricas ejecutivas y endurecimiento operativo para salida productiva

Historias (estimación):

1. KPI lead time de NC - 3 pts
2. KPI cumplimiento de acciones (SLA) - 3 pts
3. KPI recurrencia/reapertura NC - 3 pts
4. Dashboard ejecutivo SGC - 5 pts
5. Hardening seguridad/performance (índices, consultas, RLS review) - 5 pts
6. UAT + runbook de operación SGC - 3 pts

Total estimado: 22 pts

Criterio de salida:

- KPIs disponibles en dashboard
- Checklist de seguridad y performance validado
- Go-live checklist aprobado

---

## Dependencias transversales

1. `src/types/database.types.ts` regenerado tras nuevas migraciones
2. Estabilidad del módulo de usuarios/roles (`org_members`)
3. Estabilidad de DMS para adjuntos
4. Ambiente de staging recomendado antes de producción

---

## Riesgos y mitigación

1. Riesgo: divergencia entre reglas UI y triggers DB
   - Mitigación: pruebas de transición por estado en API + E2E
2. Riesgo: sobrecarga por alcance UI en SGC-02
   - Mitigación: recortar inicialmente features no bloqueantes (bulk ops, export)
3. Riesgo: baja calidad de datos de catálogos
   - Mitigación: seeds iniciales controlados por org y validación de duplicados

---

## Definición de Done (DoD) por sprint

1. Código y tests en verde (`build`, `lint`, tests relevantes)
2. Rutas mutantes con `withAuth` + `logAudit`
3. RLS y permisos validados en QA
4. Documentación actualizada (`CHANGELOG`, backlog/plan si cambia alcance)

---

## Trazabilidad documental

- Estrategia funcional: `docs/SGC_MODULE.md`
- Matrices de decisión: `docs/SGC_MATRICES.md`
- Decisiones arquitectónicas: `docs/adr/ADR-005-sgc-domain-model-phase1.md`, `docs/adr/ADR-006-sgc-workflow-rules-in-database.md`
- Backlog vivo: `docs/BACKLOG_SGC.md`

