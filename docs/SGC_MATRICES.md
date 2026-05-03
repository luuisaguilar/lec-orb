# SGC Matrices (ISO/QMS)

Fecha de corte: 2026-05-03  
Contexto: definición de SGC Fase 1 implementada en `20260510_sgc_phase1.sql`.

---

## 1) Matriz comparativa de referencias (benchmark)

| Criterio | Odoo + OCA Management System | ERPNext | OpenQMS |
|---|---:|---:|---:|
| Cobertura NC/CAPA | 5/5 | 4/5 | 4/5 |
| Auditorías y revisiones | 5/5 | 3/5 | 3/5 |
| Taxonomías (causa/origen/severidad) | 5/5 | 2/5 | 3/5 |
| Madurez ecosistema | 5/5 | 5/5 | 2/5 |
| Facilidad de extrapolar a Supabase | 3/5 | 4/5 | 4/5 |
| Señal de cumplimiento ISO/SGC | 5/5 | 4/5 | 4/5 |

Conclusión:

- Base funcional del dominio: OCA.
- Flujo operativo simplificado: ERPNext.
- Trazabilidad por etapas/firma: OpenQMS.

---

## 2) Matriz de mapeo funcional -> modelo LEC Orb

| Capability SGC | Patrón fuente | Tabla(s) LEC Orb | Estado |
|---|---|---|---|
| No conformidad con ciclo de vida | OCA `mgmtsystem_nonconformity` | `sgc_nonconformities`, `sgc_nc_stages` | Implementado Fase 1 |
| Acciones CAPA | OCA + ERPNext `quality_action` | `sgc_actions`, `sgc_action_stages` | Implementado Fase 1 |
| Causas/Orígenes/Severidad | OCA catálogos jerárquicos | `sgc_nc_causes`, `sgc_nc_origins`, `sgc_nc_severities` | Implementado Fase 1 |
| Vínculo NC <-> acciones | OCA relacionales | `sgc_nonconformity_actions` | Implementado Fase 1 |
| Auditoría interna | OCA `mgmtsystem_audit` | `sgc_audits`, `sgc_audit_checks`, puentes audit | Implementado Fase 1 |
| Revisión gerencial | OCA `mgmtsystem_review` | `sgc_reviews`, `sgc_review_items`, participantes | Implementado Fase 1 |
| Reglas de cierre NC | OCA constraints | Trigger `sgc_nonconformities_before_write` | Implementado Fase 1 |
| Reglas de apertura/cierre acciones | OCA action stages | Trigger `sgc_actions_before_write` | Implementado Fase 1 |
| RLS por tenant | Patrón LEC Orb | Todas las tablas SGC | Implementado Fase 1 |
| Audit trail técnico | Patrón LEC Orb `fn_audit_log` | Triggers `_audit` en tablas SGC | Implementado Fase 1 |
| Evidencia documental de NC/CAPA | OpenQMS document control | Integración con `documents` | Pendiente Fase 2 |
| Firma/aceptación por etapa | OpenQMS status gates | Campos `*_by`, `*_on` en SGC | Pendiente Fase 2 |
| KPI de eficacia y recurrencia | OCA + OpenQMS | vistas/reportes KPI | Pendiente Fase 2 |

---

## 3) Matriz de priorización (impacto vs esfuerzo)

Escala: Impacto (1-5), Esfuerzo (1-5), Prioridad = Impacto alto + Esfuerzo bajo.

| Item | Impacto | Esfuerzo | Prioridad | Observación |
|---|---:|---:|---|---|
| CRUD API para NC/Acciones | 5 | 3 | Alta | Desbloquea operación diaria del SGC |
| UI Kanban NC + CAPA | 5 | 4 | Alta | Visibilidad operativa inmediata |
| Catálogos administrables (origen/causa/severidad) | 4 | 2 | Alta | Reduce deuda manual y errores |
| Auditorías (checklist + hallazgos) UI/API | 4 | 3 | Alta | Cumplimiento y seguimiento |
| Revisión gerencial UI/API | 3 | 3 | Media | Relevante para ciclos mensuales |
| Integración de evidencia documental | 4 | 3 | Alta | Necesario para auditorías externas |
| KPIs SGC (lead time, recurrencia, eficacia) | 4 | 4 | Media | Muy valioso, no bloqueante |
| Firmas por etapa / aprobaciones formales | 3 | 4 | Media | Requisito compliance avanzado |
| Automatizaciones (recordatorios SLA) | 3 | 3 | Media | Mejora adopción |

---

## 4) Matriz de cumplimiento técnico (checklist)

| Control | Estado | Evidencia |
|---|---|---|
| Tablas SGC nuevas sin editar migraciones históricas | Cumplido | `20260510_sgc_phase1.sql` |
| RLS habilitado en tablas SGC | Cumplido | bloque `DO $$` de RLS |
| Políticas por `org_id` | Cumplido | políticas `org members select` |
| Restricción de escritura por rol | Cumplido | políticas `admin-supervisor` |
| `updated_at` autogestionado | Cumplido | triggers `handle_updated_at_*` |
| Audit trail técnico | Cumplido | triggers `*_audit` -> `fn_audit_log()` |
| Reglas de cierre de NC en DB | Cumplido | `sgc_nonconformities_before_write()` |
| Reglas de ciclo de acciones en DB | Cumplido | `sgc_actions_before_write()` |
| Documentación funcional SGC | Cumplido | `docs/SGC_MODULE.md` |
| Backlog y ADRs de continuación | Cumplido | `docs/BACKLOG_SGC.md`, `docs/adr/ADR-005...`, `ADR-006...` |

