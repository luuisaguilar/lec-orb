# ADR-009 - Fundacion del modulo CRM Comercial

**Estado:** En implementacion  
**Fecha:** 2026-05-12  
**Prioridad ERP GAP:** Must (ref: `docs/ERP_GAP_MATRIX_AND_MODULES.md` seccion 2.1)

---

## Contexto

LEC Orb maneja informacion de clientes de forma dispersa:

- **`schools`** contiene datos de contacto de escuelas (nombre, telefono, email, direccion)
- **`events`** registra servicios entregados por escuela
- **`ih_sessions`** / **`ih_invoices`** llevan ingresos reales por escuela Cambridge
- **`quotes`** + **`quote_items`** registran cotizaciones sin vinculo a una oportunidad
- **`payments`** registra pagos individuales sin asociacion a un pipeline
- **`whatsapp_leads`** captura leads del bot pero sin UI ni flujo de seguimiento
- **`courses`** contiene precios y simulacion de cursos sin vinculo comercial

No existe:
- un directorio centralizado de contactos/cuentas
- un pipeline de oportunidades con etapas y probabilidad
- registro de actividades comerciales con vencimientos
- vinculacion lead → oportunidad → cotizacion → venta
- metricas de conversion ni analisis de pipeline

El propio ERP GAP Matrix clasifica CRM como **Must** con cobertura actual **Baja**.

## Decision

Implementar un modulo CRM nativo en 4 fases, aprovechando la infraestructura existente:

### Modelo de datos

Tres tablas nuevas:

1. **`crm_contacts`** — Directorio centralizado de cuentas/contactos
   - FK opcional a `schools` para evitar duplicacion
   - Campo `source` para rastrear origen (whatsapp, referido, web, feria, llamada)
   - Campo `type` (school, company, individual)

2. **`crm_opportunities`** — Pipeline de ventas
   - Stages: `new` → `qualified` → `proposal` → `negotiation` → `won` → `lost`
   - FK a `crm_contacts` y FK opcional a `quotes`
   - Monto esperado y probabilidad

3. **`crm_activities`** — Actividades comerciales
   - Tipos: call, email, meeting, task, whatsapp, note
   - FK a `crm_contacts` y FK opcional a `crm_opportunities`
   - Status con vencimiento

### Fases

1. **Fase 1 (Foundation):** Esquema SQL, API CRUD, registro en module_registry
2. **Fase 2 (UI Core):** Pipeline Kanban, directorio de contactos, ficha de detalle, timeline
3. **Fase 3 (Interconexiones):** Link escuela↔contacto, oportunidad→cotizacion, metricas revenue
4. **Fase 4 (Intelligence):** Scoring, forecast, alertas de seguimiento, reportes de conversion

### Patrones reutilizados

- API routes: `withAuth` + `logAudit` (patron estandar)
- UI Kanban: reutilizar patron de `pm-kanban-board.tsx`
- Timeline: reutilizar patron de `sgc-dashboard.tsx`
- Sidebar: registro en `module_registry` con categoria "Comercial"

## Consecuencias

### Positivas

- unifica datos de clientes dispersos en schools, events, ih_sessions, payments
- permite medir pipeline, conversion y motivos de perdida
- vincula cotizaciones existentes al flujo comercial
- reutiliza infraestructura existente (Kanban, timeline, CRUD patterns)
- cierra gap Must del ERP GAP Matrix

### Negativas / trade-offs

- requiere migracion de datos historicos (whatsapp_leads → crm_contacts)
- la tabla `schools` sigue existiendo como entidad operativa — crm_contacts la envuelve sin reemplazarla
- incrementa superficie de API (+3 rutas CRUD nuevas)
- necesita definir ownership comercial (¿quien atiende cada contacto?)

## Alternativas consideradas

1. **Usar LEC Studio (modulo dinamico)**:
   - rapido para prototipar pero no soporta Kanban DnD, pipeline visual ni metricas avanzadas.

2. **Extender `schools` para incluir campos CRM**:
   - descartado porque `schools` es una entidad operativa (aplicacion de examenes), no comercial. Un contacto CRM puede ser escuela, empresa o individuo.

3. **Integrar CRM externo (HubSpot/Pipedrive)**:
   - agrega costo mensual y friccion de integracion. Los datos ya estan en Supabase.

## Integraciones clave

| Modulo existente | Vinculo con CRM |
|---|---|
| `schools` | `crm_contacts.school_id` FK |
| `quotes` | `crm_opportunities.quote_id` FK |
| `events` | Revenue por contacto via `school_id` |
| `ih_sessions` | Ingreso real por escuela |
| `payments` | Historial de pagos por persona |
| `whatsapp_leads` | Migracion inicial a `crm_contacts` |
| `payment_concepts` | Catalogo de productos/servicios para cotizar |
| `audit_logs` | Timeline de actividad por contacto |
| `sgc_nonconformities` | Quejas de cliente vinculables |

## Migraciones relacionadas

- `supabase/migrations/20260612_crm_foundation.sql` (por crear)
- `supabase/migrations/20260612_register_crm_module.sql` (por crear)
