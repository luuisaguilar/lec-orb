# CRM — Análisis, integraciones y plan

**Fecha:** 2026-05-12  
**Estado:** análisis, sin cambios de código aplicados  
**Autor:** Claude (sesión de auditoría)

---

## TL;DR — el hallazgo principal

**El repo tiene DOS implementaciones de CRM paralelas, y estás usando la equivocada.**

1. **CRM nativo dedicado** — `/dashboard/crm/prospectos`
   - Página React completa: kanban + tabla + panel slide-in + timeline de actividades
   - API dedicada `/api/v1/crm/prospects` con CRUD + actividades
   - Tablas dedicadas: `crm_prospects` + `crm_activities`
   - Pipeline: `nuevo → contactado → calificado → cotizado → inscrito → perdido`
   - **Ya tiene TODO lo que pediste**: kanban, dialog que no se desborda, registro de actividades, asignación, próximo seguimiento.

2. **CRM dinámico (lo que viste en el screenshot)** — `/dashboard/m/crm-prospects`
   - Renderizado por `DynamicModule` + `module_fields` + `module_records` (el motor del Studio)
   - 11 campos seedeados en una migración
   - Pipeline distinto: `Nuevo → Contactado → En negociación → Propuesta enviada → Ganado → Perdido`
   - Es lo que se está mostrando porque **alguna de las dos migraciones ganó el `ON CONFLICT DO NOTHING`** sobre el slug `crm-prospects`. Si la versión `is_native=false` ganó, la sidebar manda al renderer genérico.

**Recomendación:** quedarse con el CRM nativo. Tiene UX muy superior, modelo de datos correcto (tabla relacional, no JSON), timeline de actividades, e integración futura más limpia. El dinámico se borra.

---

## 1. Inventario del CRM nativo (la opción correcta)

### 1.1 Tablas

#### `crm_prospects`
| Columna | Tipo | Nota |
|---|---|---|
| `id` | UUID | PK |
| `org_id` | UUID | FK orgs (multi-tenant) |
| `name`, `phone`, `email`, `company` | TEXT | Contacto |
| `status` | enum | nuevo / contactado / calificado / cotizado / inscrito / perdido |
| `source` | enum | visita / whatsapp / telefono / web / referido / otro |
| `service_interest` | TEXT | "TOEFL", "CENNI", "Cambridge" — texto libre ⚠ |
| `estimated_value` | NUMERIC(12,2) | MXN |
| `notes` | TEXT | |
| `assigned_to` | UUID → auth.users | Vendedor responsable |
| `last_contact_at`, `next_followup_at` | TIMESTAMPTZ | |
| `closed_at`, `lost_reason` | | Auto al cerrar |
| `created_by`, `created_at`, `updated_at` | | Auditoría |

**RLS:** lectura/edición restringida a miembros de la misma org. Delete solo admin/supervisor.

#### `crm_activities`
| Columna | Tipo | Nota |
|---|---|---|
| `id` | UUID | |
| `prospect_id` | UUID → crm_prospects | ON DELETE CASCADE |
| `type` | enum | nota / llamada / whatsapp / correo / visita / cotizacion / seguimiento |
| `notes` | TEXT | |
| `performed_by`, `activity_at` | | |

### 1.2 Endpoints
| Método | Ruta | Función |
|---|---|---|
| GET | `/api/v1/crm/prospects` | Lista con filtros `status`, `source`, `assigned_to` |
| POST | `/api/v1/crm/prospects` | Crear |
| GET | `/api/v1/crm/prospects/[id]` | Detalle + activities embebidas |
| PATCH | `/api/v1/crm/prospects/[id]` | Update (auto-stamp `closed_at` si pasa a `inscrito`/`perdido`) |
| DELETE | `/api/v1/crm/prospects/[id]` | Borrar + activities en cascada |
| POST | `/api/v1/crm/prospects/[id]/activities` | Registrar interacción |

Todo pasa por `withAuth({ module: "crm-prospects", action: ... })`. Audit log en `audit_logs`.

### 1.3 UI — `/dashboard/crm/prospectos/page.tsx`
- **Kanban 6 columnas** con conteo por etapa, colores por estado, cards con empresa/origen/seguimiento.
- **Tabla** con orden, búsqueda, filtro por origen, dropdown de acciones.
- **Panel lateral slide-in** (360px) con detalle, mover de etapa con chips, timeline cronológico de actividades.
- **Dialog crear/editar** ya en 2 columnas con `max-w-lg max-h-[90vh] overflow-y-auto`.
- Stats arriba: Total / En pipeline / Inscritos / Perdidos.

### 1.4 Lo que SÍ funciona ya
- Pipeline completo con stages.
- Asignación a usuarios (`assigned_to`).
- Timeline de actividades por prospecto.
- Auto-cierre cuando se mueve a estado terminal.
- Audit logging.
- RLS multi-tenant.

### 1.5 Lo que NO existe todavía en el nativo
- ❌ Conversión prospecto → cotización en un click.
- ❌ Asociación prospecto → school (cuando es colegio).
- ❌ Vínculo prospecto → candidato/inscripción cuando se cierra como `inscrito`.
- ❌ Webhook de entrada para bot de WhatsApp / formulario web.
- ❌ Recordatorios automáticos cuando `next_followup_at` está vencido.
- ❌ Reasignación masiva de prospectos.
- ❌ Métricas de conversión / vendedor / fuente.
- ❌ El Action Center (`/api/v1/action-center`) busca CRM en la tabla **dinámica** (`module_records`), no en `crm_prospects` — **bug crítico**.

---

## 2. Inventario del CRM dinámico (el que se quita)

- **Slug**: `crm-prospects` (mismo que el nativo — conflicto en `module_registry`)
- **Migraciones**:
  - `20260512_crm_prospects_module.sql` — inserta module + 11 campos (status field correcto)
  - `20260512_crm_add_action_fields.sql` — agrega `responsable` + `proxima_accion`
- **Campos**: nombre, email, telefono, colegio, ciudad, interes (select), fuente (select), estado (status), valor_potencial (currency), fecha_contacto (date), notas (textarea), responsable, proxima_accion.
- **Renderer**: `DynamicModule.tsx` + `DynamicForm.tsx` (los que rediseñé en PR #5).

**Problema con esta vía:**
1. Modelo de datos en `module_records.data` JSONB → sin foreign keys, sin enums, sin queries eficientes por status.
2. Pipeline en el JSON con strings — sin enum DB-level.
3. No tiene `crm_activities` equivalente → no hay timeline.
4. El Action Center actual lo busca aquí (workaround), pero migrar al nativo lo simplifica.
5. Studio podría romper el contrato del campo (admin edita `field_type=status` → `select` y se rompe el kanban).

---

## 3. Datos y módulos relacionados — mapa de integraciones

```
┌────────────────┐   ┌─────────────────┐   ┌──────────────┐
│  Bot WhatsApp  │──>│  ENTRADA LEADS  │──>│ crm_prospects│
│  (n8n)         │   │  - WhatsApp     │   │              │
│  Web form      │   │  - Web          │   │              │
│  Visita CRM    │   │  - Manual       │   │              │
└────────────────┘   └─────────────────┘   └──────┬───────┘
                                                  │
                              ┌───────────────────┼─────────────────────┐
                              ↓                   ↓                     ↓
                       ┌──────────────┐    ┌────────────┐       ┌──────────────┐
                       │  schools     │    │  quotes    │       │ candidates / │
                       │ (si empresa) │    │ (cotizacion)│      │ inscripciones│
                       └──────────────┘    └────────────┘       └──────────────┘
                                                  │                     │
                                                  ↓                     ↓
                                          ┌────────────┐          ┌──────────────┐
                                          │  payments  │          │   events     │
                                          │ (cobro)    │          │ (TOEFL/CENNI)│
                                          └────────────┘          └──────────────┘
```

### 3.1 Lo que existe
| Módulo | Tabla(s) | Estado | Linkage CRM existente |
|---|---|---|---|
| **Schools** | `schools` | ✅ activo | ⚠ `crm_prospects.company` es texto libre, no FK |
| **Applicators** | `applicators` | ✅ activo | — (potencial: aplicador puede ser referido) |
| **Events** | `events` | ✅ activo | — |
| **TOEFL** | `toefl_*` | ✅ activo | — |
| **CENNI** | `cenni_*` | ✅ activo | — |
| **Quotes** | `quotes` | ✅ activo (CRUD) | — sin link a prospecto |
| **Payments** | `payments` | ✅ activo | — |
| **Payroll** | `payroll_*` | ✅ activo | — |
| **Portal** | endpoints `/portal/*` | ✅ activo | — (aplicadores ven horarios/nómina) |
| **OOPT/Scan** | `oopt_*` | ✅ activo | — |
| **SGC** | `sgc_*` | ✅ activo | — |
| **Audit logs** | `audit_logs` | ✅ activo | ✅ CRM ya audita |
| **Action Center** | sin tabla | ⚠ apunta al CRM dinámico (bug) | ⚠ ver §1.5 |

### 3.2 Lo que falta interconectar (gaps)

| Gap | Impacto | Esfuerzo |
|---|---|---|
| `crm_prospects.company` → FK `schools.id` (opcional) | Evita duplicados, permite vista 360° colegio | M |
| `crm_prospects.service_interest` → enum o catálogo | Reportes por servicio funcionan | S |
| Botón "Crear cotización" desde detalle prospecto | Acelera conversión | M |
| `quotes.prospect_id` (nullable) | Trazabilidad lead → ingreso | S |
| Trigger: cotización aceptada → prospecto a `cotizado` | Pipeline se actualiza solo | S |
| `crm_prospects.candidate_id` (nullable) | Cuando se inscribe se vincula al examen | M |
| Webhook entrante `/api/v1/crm/webhook/whatsapp` | Bot crea prospecto automático | M |
| Action Center → fuente real (`crm_prospects`) | Centro de acción muestra leads vencidos correctos | S |
| Cron diario: vencidos `next_followup_at < NOW()` → notificación | Nada se cae del radar | M |
| Reasignación masiva (`PATCH /assign`) | Onboarding vendedor, vacaciones | S |
| Vista métricas (conversión, ciclo, fuente) | Decisión comercial | L |

S = small (<2 h), M = medium (1 día), L = large (varios días).

---

## 4. Quick wins ordenados por ROI

### 🥇 Quick win #1 — apagar el CRM dinámico (1 h)
- Borrar las dos migraciones de seed dinámico (o marcar `is_active=false` en `module_registry` para el `crm-prospects` `is_native=false`).
- Confirmar en DB cuál de los dos ganó el `ON CONFLICT`. Si ganó el dinámico, hacer:
  - `UPDATE module_registry SET is_native=true, icon='UserSearch' WHERE slug='crm-prospects' AND org_id IS NULL`.
- Resultado: la sidebar mandará a `/dashboard/crm/prospectos` (el bueno) y desaparece el `/dashboard/m/crm-prospects` roto.
- **Cero código nuevo**, solo SQL.

### 🥈 Quick win #2 — arreglar Action Center (30 min)
- Cambiar la query en `/api/v1/action-center/route.ts` para leer de `crm_prospects` con filtro `next_followup_at < NOW()` o `status IN ('nuevo','contactado') AND next_followup_at IS NULL`.
- Sin cambio de tabla, sin migración.
- Resultado: el centro de acción muestra los prospectos sin contactar reales.

### 🥉 Quick win #3 — link prospecto ↔ cotización (1 día)
- Migración: `ALTER TABLE quotes ADD COLUMN prospect_id UUID REFERENCES crm_prospects(id) ON DELETE SET NULL`.
- Botón en el panel detalle: "Crear cotización" → abre `/dashboard/cotizaciones/new?prospect_id=...`.
- En `cotizaciones/new`, si viene `prospect_id`, pre-rellena nombre/email/empresa.
- Trigger: al aceptar cotización (`quotes.status='accepted'`) → `UPDATE crm_prospects SET status='cotizado' WHERE id = NEW.prospect_id`.
- Resultado: trazabilidad financiera completa lead → ingreso.

### Quick win #4 — webhook WhatsApp (medio día)
- Endpoint `POST /api/v1/crm/webhook` (sin auth, con token compartido).
- Body: `{ token, name, phone, message, source: "whatsapp" }`.
- Inserta en `crm_prospects` con `source='whatsapp'` + primera activity tipo `whatsapp` con el mensaje.
- En n8n se conecta al flujo del bot existente.
- Resultado: cada conversación entrante deja rastro en CRM automáticamente.

### Quick win #5 — recordatorios de seguimiento (medio día)
- Cron diario (Vercel cron o n8n) → query `crm_prospects WHERE next_followup_at::date = CURRENT_DATE`.
- Manda mensaje al `assigned_to` vía notification + WhatsApp interno.
- Resultado: cero leads olvidados.

---

## 5. Lo que NO debe tocarse todavía

- **Modelo dual de Studio.** El sistema `module_registry + module_fields + module_records` sigue siendo correcto para módulos verdaderamente custom (lo que el usuario quiera crear desde Studio). El problema es solo que CRM no debió usarlo.
- **DynamicForm/DynamicModule.** Los cambios del PR #5 (kanban + dialog overflow) siguen siendo útiles para CUALQUIER módulo dinámico futuro creado en Studio. No tirar.
- **Permission map.** El slug `crm-prospects` ya está cableado en `withAuth`. No renombrar.

---

## 6. Plan recomendado (semana 1)

1. **Día 1 (mañana)** — apagar CRM dinámico, asegurar que `is_native=true` gane. Verificar que `/dashboard/crm/prospectos` carga.
2. **Día 1 (tarde)** — arreglar Action Center para leer del CRM nativo.
3. **Día 2** — agregar `quotes.prospect_id` + botón "Crear cotización" desde prospecto + trigger.
4. **Día 3** — webhook WhatsApp + integración con n8n existente.
5. **Día 4** — cron de recordatorios + notificaciones.
6. **Día 5** — buffer + QA + documentar para vendedores.

---

## 7. Preguntas abiertas para el dueño

1. ¿Los aplicadores deben ver el CRM? Hoy `module_permissions` les niega acceso al `crm-prospects` dinámico, pero el nativo usa otro mecanismo (`permissionsMap`). Confirmar.
2. ¿Las visitas físicas al CRM (`source='visita'`) se capturan en alguna parte (app móvil)? Si sí, ¿conviene un endpoint de captura rápida?
3. ¿Existe ya un bot de WhatsApp identificando intención de compra? Si sí, ¿ya emite eventos consumibles?
4. ¿`service_interest` debe convertirse en FK a `catalog` (catálogo de conceptos existente) o queda texto?

---

## Anexo A — Archivos clave para revisar

| Archivo | Línea | Por qué |
|---|---|---|
| `supabase/migrations/20260512_crm_prospects.sql` | toda | Modelo nativo (correcto) |
| `supabase/migrations/20260512_crm_prospects_module.sql` | toda | Modelo dinámico (a deprecar) |
| `src/app/(dashboard)/dashboard/crm/prospectos/page.tsx` | toda | UI nativa completa |
| `src/app/api/v1/crm/prospects/route.ts` | 1–72 | CRUD nativo |
| `src/app/api/v1/action-center/route.ts` | 20–80 | Bug: lee del modelo equivocado |
| `src/components/sidebar-nav.tsx` | 44–80 | Routing native vs dinámico |
| `supabase/migrations/20240309_module_registry.sql` | 142–168 | Seed inicial (no incluía CRM) |
