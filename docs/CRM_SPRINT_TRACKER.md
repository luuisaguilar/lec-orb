# CRM Module — Sprint Tracker

Ultima actualizacion: 2026-05-12  
Backlog: `docs/CRM_BACKLOG.md`  
ADR: `docs/adr/ADR-009-crm-module-foundation.md`

---

## Progreso General

```
Fase 1 ████░░░░░░░░░░░░░░░░  0% (0/13 tickets)
Fase 2 ░░░░░░░░░░░░░░░░░░░░  0% (0/12 tickets)
Fase 3 ░░░░░░░░░░░░░░░░░░░░  0% (0/10 tickets)
Fase 4 ░░░░░░░░░░░░░░░░░░░░  0% (0/8 tickets)
Total  ░░░░░░░░░░░░░░░░░░░░  0% (0/43 tickets)
```

---

## Sprint CRM-1: Foundation (EN CURSO)

**Inicio:** 2026-05-12  
**Objetivo:** Esquema DB + API CRUD + registro de modulo + migracion de leads

### Tickets

| # | Ticket | SP | Estado | Notas |
|---|--------|----|--------|-------|
| F1-01 | Migracion `crm_contacts` | 3 | ⬜ Pendiente | |
| F1-02 | Migracion `crm_opportunities` | 3 | ⬜ Pendiente | |
| F1-03 | Migracion `crm_activities` | 2 | ⬜ Pendiente | |
| F1-04 | Registro en `module_registry` | 1 | ⬜ Pendiente | |
| F1-05 | RLS policies (3 tablas) | 2 | ⬜ Pendiente | |
| F1-06 | API `GET/POST /crm/contacts` | 3 | ⬜ Pendiente | |
| F1-07 | API `GET/PATCH/DELETE /crm/contacts/[id]` | 2 | ⬜ Pendiente | |
| F1-08 | API `GET/POST /crm/opportunities` | 3 | ⬜ Pendiente | |
| F1-09 | API `GET/PATCH/DELETE /crm/opportunities/[id]` | 2 | ⬜ Pendiente | |
| F1-10 | API `GET/POST /crm/activities` | 2 | ⬜ Pendiente | |
| F1-11 | API `PATCH /crm/activities/[id]` | 1 | ⬜ Pendiente | |
| F1-12 | Script migracion whatsapp_leads → crm_contacts | 2 | ⬜ Pendiente | |
| F1-13 | Sidebar entry (NATIVE_ROUTES + CATEGORY_ICONS) | 1 | ⬜ Pendiente | |

**Sprint velocity:** 27 SP  
**Burndown:** 27 SP restantes

### Blockers

_Ninguno por ahora._

---

## Sprint CRM-2: UI Core (PENDIENTE)

**Inicio:** Despues de CRM-1  
**Objetivo:** Pipeline Kanban + directorio de contactos + actividades + KPIs

| # | Ticket | SP | Estado |
|---|--------|----|--------|
| F2-01 | Pagina principal CRM con tabs | 3 | ⬜ |
| F2-02 | Pipeline Kanban visual | 5 | ⬜ |
| F2-03 | Drag-and-drop entre stages | 3 | ⬜ |
| F2-04 | Directorio de contactos (tabla + search) | 3 | ⬜ |
| F2-05 | Ficha de contacto (detail view) | 5 | ⬜ |
| F2-06 | Dialog "Nuevo contacto" (RHF + Zod) | 2 | ⬜ |
| F2-07 | Dialog "Nueva oportunidad" | 2 | ⬜ |
| F2-08 | Timeline de actividades | 3 | ⬜ |
| F2-09 | Dialog "Nueva actividad" | 2 | ⬜ |
| F2-10 | Cards de oportunidad en Kanban | 2 | ⬜ |
| F2-11 | KPI cards header | 3 | ⬜ |
| F2-12 | Responsive + animaciones premium | 2 | ⬜ |

**Sprint velocity:** 35 SP

---

## Sprint CRM-3: Interconexiones (PENDIENTE)

**Inicio:** Despues de CRM-2  
**Objetivo:** Vincular escuelas, cotizaciones, revenue, WhatsApp bot

| # | Ticket | SP | Estado |
|---|--------|----|--------|
| F3-01 | Auto-crear contacto al crear escuela | 2 | ⬜ |
| F3-02 | Link escuela en ficha de contacto | 1 | ⬜ |
| F3-03 | Boton "Crear cotizacion" desde oportunidad | 2 | ⬜ |
| F3-04 | Mostrar cotizacion vinculada | 1 | ⬜ |
| F3-05 | Revenue por contacto (ih_sessions + payments) | 3 | ⬜ |
| F3-06 | Endpoint `/crm/stats` | 3 | ⬜ |
| F3-07 | Dashboard CRM (funnel + tendencia) | 3 | ⬜ |
| F3-08 | Webhook ingesta WhatsApp | 3 | ⬜ |
| F3-09 | Backfill historico schools → contacts | 2 | ⬜ |
| F3-10 | Vincular NC/quejas a contactos | 2 | ⬜ |

**Sprint velocity:** 22 SP

---

## Sprint CRM-4: Intelligence (PENDIENTE)

**Inicio:** Despues de CRM-3  
**Objetivo:** Scoring, forecast, alertas, reportes avanzados

| # | Ticket | SP | Estado |
|---|--------|----|--------|
| F4-01 | Lead scoring basico | 3 | ⬜ |
| F4-02 | Forecast de ventas | 3 | ⬜ |
| F4-03 | Alertas de actividades vencidas | 2 | ⬜ |
| F4-04 | Reporte motivos de perdida | 2 | ⬜ |
| F4-05 | Reporte pipeline por ejecutivo | 2 | ⬜ |
| F4-06 | Export a Excel | 2 | ⬜ |
| F4-07 | Email templates (Resend) | 3 | ⬜ |
| F4-08 | Vista calendario de actividades | 3 | ⬜ |

**Sprint velocity:** 20 SP

---

## Historial de cambios

| Fecha | Cambio |
|-------|--------|
| 2026-05-12 | Creacion inicial del tracker con 4 fases y 43 tickets |
