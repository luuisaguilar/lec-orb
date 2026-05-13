# CRM Module — Handoff

Ultima actualizacion: 2026-05-12  
ADR: `docs/adr/ADR-009-crm-module-foundation.md`  
Backlog: `docs/CRM_BACKLOG.md`  
Tracker: `docs/CRM_SPRINT_TRACKER.md`

---

## Resumen ejecutivo

El modulo CRM comercial de LEC Orb unifica la gestion de clientes, oportunidades de venta y actividades comerciales en un pipeline medible. Reemplaza el seguimiento manual disperso entre Excel, WhatsApp y la tabla `whatsapp_leads`.

**Cobertura actual:** Baja → Meta: Pipeline completo y medible  
**Prioridad ERP:** Must (ref: `docs/ERP_GAP_MATRIX_AND_MODULES.md`)

---

## Arquitectura

### Tablas nuevas

```
crm_contacts          -- Directorio centralizado de cuentas/contactos
crm_opportunities     -- Pipeline de ventas con stages y probabilidad
crm_activities        -- Actividades comerciales con vencimientos
```

### Interconexiones con tablas existentes

```
crm_contacts.school_id    → schools.id          (FK opcional)
crm_opportunities.quote_id → quotes.id          (FK opcional)
crm_contacts              ← whatsapp_leads      (migracion one-time)
crm_contacts              ← events              (revenue via school_id)
crm_contacts              ← ih_sessions         (ingreso real por escuela)
crm_contacts              ← payments            (pagos individuales)
```

### API Routes

```
/api/v1/crm/contacts          GET, POST
/api/v1/crm/contacts/[id]     GET, PATCH, DELETE
/api/v1/crm/opportunities     GET, POST
/api/v1/crm/opportunities/[id] GET, PATCH, DELETE
/api/v1/crm/activities        GET, POST
/api/v1/crm/activities/[id]   PATCH
/api/v1/crm/stats             GET (Fase 3)
```

### UI Routes

```
/dashboard/crm                 Pagina principal con tabs
/dashboard/crm/contacts/[id]   Ficha de contacto (Fase 2)
```

### Sidebar

- Slug: `crm`
- Categoria: `Comercial`
- Icono: `Users`
- Native route: `/dashboard/crm`

---

## Pipeline stages (crm_opportunities)

```
new → qualified → proposal → negotiation → won
                                          → lost
```

Cada oportunidad tiene:
- `expected_amount` — monto esperado
- `probability` — porcentaje de probabilidad
- `expected_close` — fecha estimada de cierre
- `loss_reason` — motivo de perdida (solo en stage `lost`)

---

## Tipos de contacto (crm_contacts)

| Tipo | Descripcion | Ejemplo |
|------|-------------|---------|
| `school` | Escuela/institucion educativa | ITESM Campus Hermosillo |
| `company` | Empresa/corporativo | Grupo Modelo |
| `individual` | Persona fisica | Juan Perez (alumno directo) |

## Sources (origen del contacto)

| Source | Descripcion |
|--------|-------------|
| `whatsapp` | Bot de WhatsApp |
| `referral` | Referido por otro cliente |
| `web` | Formulario web |
| `fair` | Feria de libros/evento |
| `call` | Llamada entrante |
| `outbound` | Prospectacion activa |
| `existing` | Escuela existente migrada |

---

## Tipos de actividad (crm_activities)

| Tipo | Icono sugerido |
|------|----------------|
| `call` | Phone |
| `email` | Mail |
| `meeting` | Calendar |
| `task` | CheckSquare |
| `whatsapp` | MessageCircle |
| `note` | StickyNote |

---

## Migraciones

| Archivo | Contenido |
|---------|-----------|
| `20260612_crm_foundation.sql` | Tablas, RLS, triggers, indices |
| `20260612_register_crm_module.sql` | Registro en module_registry |

---

## Archivos de codigo (por crear)

### API

```
src/app/api/v1/crm/contacts/route.ts
src/app/api/v1/crm/contacts/[id]/route.ts
src/app/api/v1/crm/opportunities/route.ts
src/app/api/v1/crm/opportunities/[id]/route.ts
src/app/api/v1/crm/activities/route.ts
src/app/api/v1/crm/activities/[id]/route.ts
src/app/api/v1/crm/stats/route.ts          (Fase 3)
```

### UI

```
src/app/(dashboard)/dashboard/crm/page.tsx
src/app/(dashboard)/dashboard/crm/contacts/[id]/page.tsx  (Fase 2)
src/components/crm/crm-pipeline.tsx         (Kanban)
src/components/crm/crm-contacts-table.tsx
src/components/crm/crm-contact-detail.tsx
src/components/crm/crm-activity-timeline.tsx
src/components/crm/crm-opportunity-card.tsx
src/components/crm/crm-dashboard.tsx        (Fase 3)
src/components/crm/add-contact-dialog.tsx
src/components/crm/add-opportunity-dialog.tsx
src/components/crm/add-activity-dialog.tsx
```

---

## Decisiones cerradas

1. **CRM como modulo nativo** (no LEC Studio dinamico) — necesita Kanban DnD y metricas avanzadas.
2. **`crm_contacts` envuelve `schools`** sin reemplazarla — schools sigue siendo entidad operativa.
3. **Pipeline stages fijos** (6 stages) — no configurables por usuario en V1.
4. **Actividades genéricas** — un solo tipo de tabla, no tablas separadas por tipo.
5. **Revenue calculado on-demand** (no columna stored) — se calcula via JOINs a ih_sessions + payments.

## Decisiones pendientes

- [ ] ¿Quién es el owner default de nuevos contactos? (¿El creador? ¿Se asigna manualmente?)
- [ ] ¿Las actividades vencidas generan notificacion in-app o solo se marcan en rojo?
- [ ] ¿El webhook de WhatsApp crea oportunidad automatica o solo contacto?
