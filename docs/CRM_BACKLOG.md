# CRM Module — Backlog

Ultima actualizacion: 2026-05-12  
ADR: `docs/adr/ADR-009-crm-module-foundation.md`  
Tracking: `docs/CRM_SPRINT_TRACKER.md`

---

## Prioridad: Must (ERP GAP Matrix)

> Cobertura actual: **Baja** — Solo tabla `whatsapp_leads` sin UI.  
> Meta: Pipeline de venta completo y medible.

---

## Fase 1 — Foundation (Sprint CRM-1)

**Estimado:** 2-3 dias | **Dependencias:** Ninguna

### Backend / DB

| # | Ticket | SP | Owner | Estado |
|---|--------|----|-------|--------|
| F1-01 | Crear migracion `crm_contacts` (type, source, school_id FK, tags, assigned_to) | 3 | Dev | ⬜ Pendiente |
| F1-02 | Crear migracion `crm_opportunities` (stages, contact_id FK, quote_id FK, probability, expected_amount) | 3 | Dev | ⬜ Pendiente |
| F1-03 | Crear migracion `crm_activities` (types, contact_id FK, opportunity_id FK, due_date, status) | 2 | Dev | ⬜ Pendiente |
| F1-04 | Registrar modulo CRM en `module_registry` (slug: `crm`, categoria: `Comercial`) | 1 | Dev | ⬜ Pendiente |
| F1-05 | RLS policies para las 3 tablas (org-scoped, supervisors write) | 2 | Dev | ⬜ Pendiente |
| F1-06 | API route `GET/POST /api/v1/crm/contacts` con `withAuth` + `logAudit` | 3 | Dev | ⬜ Pendiente |
| F1-07 | API route `GET/PATCH/DELETE /api/v1/crm/contacts/[id]` | 2 | Dev | ⬜ Pendiente |
| F1-08 | API route `GET/POST /api/v1/crm/opportunities` | 3 | Dev | ⬜ Pendiente |
| F1-09 | API route `GET/PATCH/DELETE /api/v1/crm/opportunities/[id]` | 2 | Dev | ⬜ Pendiente |
| F1-10 | API route `GET/POST /api/v1/crm/activities` | 2 | Dev | ⬜ Pendiente |
| F1-11 | API route `PATCH /api/v1/crm/activities/[id]` (completar actividad) | 1 | Dev | ⬜ Pendiente |
| F1-12 | Script SQL migracion `whatsapp_leads` → `crm_contacts` (backfill) | 2 | Dev | ⬜ Pendiente |
| F1-13 | Agregar ruta CRM al sidebar (`NATIVE_ROUTES` + `CATEGORY_ICONS`) | 1 | Dev | ⬜ Pendiente |

**Total SP Fase 1:** 27

### Done Criteria Fase 1

- [ ] Migraciones aplicadas en Supabase sin errores
- [ ] `database.types.ts` regenerado con las 3 nuevas tablas
- [ ] APIs responden 200 en Postman/curl con auth token
- [ ] RLS verificado: usuario sin org no ve datos
- [ ] Modulo aparece en sidebar para usuarios con acceso
- [ ] Leads de WhatsApp migrados como contactos CRM

---

## Fase 2 — UI Core (Sprint CRM-2)

**Estimado:** 3-4 dias | **Dependencias:** Fase 1 completa

### Frontend

| # | Ticket | SP | Owner | Estado |
|---|--------|----|-------|--------|
| F2-01 | Pagina principal CRM `/dashboard/crm` con tabs (Pipeline / Contactos / Actividades) | 3 | Dev | ⬜ Pendiente |
| F2-02 | Pipeline Kanban — tablero visual con columnas por stage (reutilizar patron `pm-kanban-board`) | 5 | Dev | ⬜ Pendiente |
| F2-03 | Drag-and-drop para mover oportunidades entre stages | 3 | Dev | ⬜ Pendiente |
| F2-04 | Directorio de contactos — tabla con busqueda, filtro por type/source/tags | 3 | Dev | ⬜ Pendiente |
| F2-05 | Ficha de contacto (detail view) — datos, actividades, oportunidades, eventos asociados | 5 | Dev | ⬜ Pendiente |
| F2-06 | Dialog "Nuevo contacto" con form (React Hook Form + Zod) | 2 | Dev | ⬜ Pendiente |
| F2-07 | Dialog "Nueva oportunidad" vinculada a contacto | 2 | Dev | ⬜ Pendiente |
| F2-08 | Timeline de actividades en ficha de contacto (patron SGC timeline) | 3 | Dev | ⬜ Pendiente |
| F2-09 | Dialog "Nueva actividad" (tipo, asunto, vencimiento, contacto/oportunidad) | 2 | Dev | ⬜ Pendiente |
| F2-10 | Cards de oportunidad en Kanban con monto, probabilidad, contacto, fecha cierre | 2 | Dev | ⬜ Pendiente |
| F2-11 | KPI cards en header: total pipeline value, win rate, actividades pendientes | 3 | Dev | ⬜ Pendiente |
| F2-12 | Responsive design y animaciones premium (glassmorphism, hover effects) | 2 | Dev | ⬜ Pendiente |

**Total SP Fase 2:** 35

### Done Criteria Fase 2

- [ ] Pipeline Kanban funcional con DnD
- [ ] CRUD completo de contactos desde UI
- [ ] CRUD completo de oportunidades desde UI
- [ ] Timeline de actividades visible en ficha de contacto
- [ ] KPI cards con datos reales
- [ ] Build de produccion pass sin errores

---

## Fase 3 — Interconexiones (Sprint CRM-3)

**Estimado:** 2-3 dias | **Dependencias:** Fase 2 completa

| # | Ticket | SP | Owner | Estado |
|---|--------|----|-------|--------|
| F3-01 | Auto-crear `crm_contact` al crear escuela nueva (trigger o API-side) | 2 | Dev | ⬜ Pendiente |
| F3-02 | Mostrar link a escuela en ficha de contacto (si school_id existe) | 1 | Dev | ⬜ Pendiente |
| F3-03 | Boton "Crear cotizacion" desde oportunidad (navega a `/dashboard/cotizaciones/new?opp_id=X`) | 2 | Dev | ⬜ Pendiente |
| F3-04 | Mostrar cotizacion vinculada en detalle de oportunidad | 1 | Dev | ⬜ Pendiente |
| F3-05 | Metricas de revenue por contacto: suma de `ih_sessions.subtotal_lec` + `payments.amount` | 3 | Dev | ⬜ Pendiente |
| F3-06 | Endpoint `/api/v1/crm/stats` — funnel conversion, pipeline value, win rate, activities due | 3 | Dev | ⬜ Pendiente |
| F3-07 | Dashboard CRM con grafica de funnel y tendencia de pipeline | 3 | Dev | ⬜ Pendiente |
| F3-08 | Webhook ingesta de leads desde bot WhatsApp → crm_contacts + crm_opportunities | 3 | Dev | ⬜ Pendiente |
| F3-09 | Backfill historico: crear contactos desde `schools` existentes con revenue calculado | 2 | Dev | ⬜ Pendiente |
| F3-10 | Vincular `sgc_nonconformities` a `crm_contacts` para quejas de cliente | 2 | Dev | ⬜ Pendiente |

**Total SP Fase 3:** 22

### Done Criteria Fase 3

- [ ] Escuela nueva genera contacto CRM automaticamente
- [ ] Oportunidad vinculada a cotizacion existente
- [ ] Revenue historico por contacto calculado y visible
- [ ] Dashboard CRM con funnel y KPIs reales
- [ ] Ingesta de leads WhatsApp automatica

---

## Fase 4 — Intelligence (Sprint CRM-4)

**Estimado:** 2-3 dias | **Dependencias:** Fase 3 completa

| # | Ticket | SP | Owner | Estado |
|---|--------|----|-------|--------|
| F4-01 | Lead scoring basico (reglas: tipo examen, # interacciones, historial) | 3 | Dev | ⬜ Pendiente |
| F4-02 | Forecast de ventas — pipeline ponderado por probabilidad + tendencia | 3 | Dev | ⬜ Pendiente |
| F4-03 | Alertas de seguimiento — notificaciones por actividades vencidas | 2 | Dev | ⬜ Pendiente |
| F4-04 | Reporte de motivos de perdida — analytics con grafica de barras | 2 | Dev | ⬜ Pendiente |
| F4-05 | Reporte de pipeline por ejecutivo/responsable | 2 | Dev | ⬜ Pendiente |
| F4-06 | Export a Excel (contactos, oportunidades, actividades) | 2 | Dev | ⬜ Pendiente |
| F4-07 | Email templates para seguimiento (integracion futura con Resend) | 3 | Dev | ⬜ Pendiente |
| F4-08 | Vista calendario de actividades comerciales | 3 | Dev | ⬜ Pendiente |

**Total SP Fase 4:** 20

### Done Criteria Fase 4

- [ ] Lead scoring visible en ficha de contacto
- [ ] Forecast de ventas en dashboard CRM
- [ ] Notificaciones de actividades vencidas activas
- [ ] Reporte de perdida con filtros por periodo
- [ ] Export funcional a Excel

---

## Resumen de esfuerzo

| Fase | Story Points | Dias estimados | Prioridad |
|------|-------------|----------------|-----------|
| Fase 1 - Foundation | 27 SP | 2-3 dias | Must |
| Fase 2 - UI Core | 35 SP | 3-4 dias | Must |
| Fase 3 - Interconexiones | 22 SP | 2-3 dias | Should |
| Fase 4 - Intelligence | 20 SP | 2-3 dias | Could |
| **Total** | **104 SP** | **~10-13 dias** | |
