# CRM — Panel de detalle / edición de oportunidad (Pipeline)

**Estado:** Especificación aprobada para implementación  
**Fecha:** 2026-05-14  
**Relacionado:** `docs/adr/ADR-009-crm-module-foundation.md`, `docs/CRM_BACKLOG.md` (F2-07, F2-05), API existente `GET/PATCH/DELETE /api/v1/crm/opportunities/[id]`

---

## 1. Problema

- En el Kanban / lista del pipeline, al interactuar con una oportunidad no hay **ficha usable**: el clic actual solo muestra un toast placeholder (“Editar oportunidad…”).
- **Eliminar** una oportunidad no tiene acción en UI (el endpoint `DELETE` ya existe y audita).
- Los comerciales necesitan ver **contexto mínimo** (contacto, montos, etapa, notas) y **actividades recientes** sin salir del tablero.

## 2. Objetivo (MVP de esta entrega)

Entregar un **panel lateral (Sheet)** o **diálogo modal** — preferencia del equipo: **Sheet** en desktop (más espacio para timeline y formulario) y comportamiento usable en tablet — que:

1. Se abra desde el **pipeline** al hacer clic en una tarjeta (Kanban) o en una fila / acción explícita en **vista Lista**.
2. Cargue datos con **`GET /api/v1/crm/opportunities/[id]`** (ya devuelve `opportunity` embebido con `crm_contacts` + lista `activities` acotada a 30).
3. Permita **editar** campos soportados por **`PATCH`** con validación (React Hook Form + Zod alineado al schema del route).
4. Permita **eliminar** la oportunidad con **confirmación** (mismo patrón UX que `crm-activities.tsx`: `AlertDialog` + toast + `mutate` del listado).
5. Tras guardar o eliminar, **revalidar** `useSWR` de `/api/v1/crm/opportunities` (y cerrar panel si se borró).

**Fuera de alcance de este MVP** (se documentan como fases posteriores; no bloquean el panel):

- Envío real de correos desde UI (Resend), plantillas, buzón saliente.
- Tabla nueva de “mensajes internos” o hilos (solo lectura de `activities` en MVP).
- Varios vínculos históricos a cotizaciones (hoy existe solo `quote_id` 1:1 en oportunidad).
- Órdenes de compra, catálogo de “servicios ofrecidos/intereses” en tablas dedicadas.
- Campos nuevos en BD (`first_contacted_at`, `area`, líneas de oferta, etc.) — se listan en §7 para roadmap.

## 3. Alcance funcional detallado

### 3.1 Apertura y navegación

| Origen | Comportamiento |
|--------|----------------|
| Kanban — clic en área de contenido de tarjeta (no en el handle de arrastre) | Abre panel con `opportunityId` |
| Lista — clic en fila o botón “Abrir / Detalle” | Mismo panel |
| Arrastre (grip) | **No** abre el panel; solo inicia drag (evitar conflicto con DnD) |

Opcional (nice-to-have en misma PR si es trivial): atajo de teclado `Esc` cierra el Sheet.

### 3.2 Secciones del panel (MVP)

1. **Cabecera**  
   - Título de la oportunidad (editable inline o en formulario).  
   - Badge de **etapa** (sincronizado con `stage`; si se edita en formulario, reflejar).  
   - Nombre del **contacto** (desde `crm_contacts`; enlace opcional a ruta de directorio si existe en el proyecto).

2. **Resumen comercial** (formulario principal)  
   Campos alineados a `updateOpportunitySchema` en `src/app/api/v1/crm/opportunities/[id]/route.ts`:

   - `title` (requerido)  
   - `stage` (select: new, qualified, proposal, negotiation, won, lost)  
   - `expected_amount` (número ≥ 0)  
   - `probability` (0–100)  
   - `expected_close` (date `YYYY-MM-DD` o vacío)  
   - `loss_reason` (visible si stage = `lost` o al marcar lost)  
   - `notes` (textarea, max 5000)  
   - `assigned_to` (select de miembros: reutilizar patrón de otros formularios CRM si ya hay fetch `/api/v1/users` o similar; si no hay lista filtrada por org, **MVP**: omitir select y dejar solo lectura del UUID o buscar un endpoint existente de usuarios de org)  
   - `quote_id` (MVP: **input UUID opcional** con validación, o buscador simple si hay endpoint de quotes por org — si no hay, omitir en v1 o solo lectura si el GET ya trae el id)

   **Regla:** no enviar campos vacíos que el PATCH no acepte; usar el mismo criterio que otros formularios (null vs omitir).

3. **Actividades recientes (solo lectura en MVP)**  
   - Lista desde `activities` del GET (últimas 30).  
   - Mostrar: tipo, asunto, estado, fecha (`due_date` o `created_at`).  
   - CTA secundaria: “Registrar actividad” → abre `AddActivityDialog` precargando `contact_id` y `opportunity_id` si el componente lo soporta; si no, enlace a `/dashboard/crm/actividades` con querystring **solo si** se acuerda contrato de URL (si no, botón deshabilitado o texto “desde Actividades”).

4. **Acciones destructivas**  
   - Botón **Eliminar oportunidad** → `AlertDialog` con texto claro (irreversible; actividades con FK pueden quedar definidas por ON DELETE — ver §4).  
   - Confirmación → `DELETE /api/v1/crm/opportunities/[id]` → toast → `mutate` lista pipeline → cerrar panel.

5. **Barra de acciones fija**  
   - Cancelar / Cerrar  
   - Guardar cambios (deshabilitado si no hay cambios o mientras `isSubmitting`)

### 3.3 Estados de UI

- **Carga:** skeleton en Sheet o spinner en cabecera.  
- **Error GET:** mensaje en panel + reintentar.  
- **Error PATCH/DELETE:** toast + mensaje de API.  
- **Permisos:** rutas ya usan `withAuth` + módulo `crm`; si el usuario no puede editar, modo **solo lectura** (ocultar guardar/eliminar o deshabilitar con tooltip).

## 4. Reglas de datos e integridad

- **Org:** todas las operaciones siguen `member.org_id` en servidor (ya implementado).  
- **Eliminar oportunidad:** revisar en migración el comportamiento de `crm_activities.opportunity_id` (NULLIFY vs CASCADE). El texto del diálogo debe reflejar si las actividades **siguen** ligadas al contacto pero pierden vínculo a la oportunidad, o si se borran.  
- **Auditoría:** PATCH/DELETE ya llaman `logAudit`; no duplicar lógica en cliente.

## 5. Integración técnica (archivos previstos)

| Área | Acción |
|------|--------|
| Nuevo componente | `src/components/crm/opportunity-detail-sheet.tsx` (o `.tsx` modal si se prefiere Dialog) |
| `crm-pipeline.tsx` | Estado `selectedOpportunityId`, pasar callback al Kanban/tabla |
| `crm-kanban-board.tsx` | Separar clic “abrir detalle” del `listeners` del grip (p. ej. `stopPropagation` en grip, clic en cuerpo abre panel) |
| `crm-pipeline-table.tsx` | Columna acción o clic en fila que no interfiera con edición futura |
| SWR | Tras PATCH/DELETE: `mutate('/api/v1/crm/opportunities')` coherente con clave usada en pipeline |

**Tests (recomendado en misma entrega o inmediato después):**

- Vitest del schema Zod del cliente espejo del servidor **o** test de integración mínimo del fetcher si existe harness.

## 6. Criterios de aceptación (DoD)

- [ ] Desde Kanban y Lista se abre el panel con datos correctos para la oportunidad seleccionada.  
- [ ] El grip de arrastre **no** abre el panel.  
- [ ] Guardar envía solo campos válidos; etapa `won`/`lost` respeta lógica del servidor (timestamps).  
- [ ] Eliminar pide confirmación y la oportunidad desaparece del tablero sin recargar página completa.  
- [ ] Lista de actividades del GET visible (o mensaje “sin actividades”).  
- [ ] RBAC: usuario sin `crm` edit no ve acciones de mutación.  
- [ ] Sin regresiones en DnD del Kanban.

## 7. Roadmap posterior (visión ampliada — no MVP)

Idea acordada con producto para **fases siguientes** (requieren modelo de datos y/o módulos externos):

| Tema | Dirección sugerida |
|------|---------------------|
| Servicio ofrecido vs título libre | Catálogo `crm_products` o líneas `opportunity_line_items` (tipo, estado: ofrecido / por ofrecer / recibido). |
| Fechas de contacto / registro | `crm_contacts.created_at` visible; campos explícitos `first_contacted_at`, `last_contacted_at` si hace falta reporting. |
| Mensajería interna | Tabla `crm_notes` o `crm_threads` por oportunidad + autor + timestamp. |
| Correos | Integración Resend, plantillas, cola; opt-in compliance. |
| Cotizaciones | UI picker: filtrar `quotes` por `contact_id` / org; historial: tabla puente `opportunity_quotes`. |
| Órdenes de compra | FK o tabla puente hacia módulo de compras existente. |
| Último status | Derivado de última actividad o campo desnormalizado mantenido por trigger. |
| Encargado / área | `assigned_to` + `area` (texto o FK a sedes / HR). |
| Documentos | Reutilizar módulo `documents` con `module=crm` y `record_id=opportunity_id`. |
| SLA / alertas | Jobs o vista “sin actividad en N días”. |

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Clic vs drag en tarjetas | Área de grip exclusiva para DnD; clic en resto abre panel |
| Sheet muy alto en móvil | Scroll interno + altura máxima `vh` |
| `assigned_to` / `quote_id` sin picker | MVP: omitir o campo texto UUID con validación estricta |
| Doble fuente de verdad de etapa | Tras PATCH exitoso, actualizar SWR del listado; opcional optimistic update |

## 9. Orden de implementación sugerido

1. Componente Sheet + fetch GET + layout secciones.  
2. Formulario PATCH + toasts + mutate.  
3. Ajuste de eventos en Kanban (grip vs abrir).  
4. Wire en vista Lista.  
5. Delete + AlertDialog + mutate.  
6. Pulido accesibilidad (focus trap, labels) y lectura de actividades.

---

**Aprobación:** implementar según esta spec salvo decisión explícita de cambiar Sheet por Dialog o de posponer `quote_id`/`assigned_to` a una sub-PR.

---

## 10. Mini-sprints (verificación incremental)

| Sprint | Contenido | Verificación manual |
|--------|-------------|---------------------|
| **MS1** | `Sheet` + `GET /api/v1/crm/opportunities/[id]`; cabecera, bloque resumen **solo lectura**, lista de actividades; abrir desde **Kanban** (clic en tarjeta, no grip) y desde **Lista** (botón Detalle); cerrar con X / overlay. | Abrir varias oportunidades; recargar datos al cambiar de fila; sin regresión en arrastre del Kanban. |
| **MS2** | Formulario RHF + Zod; `PATCH`; barra Guardar / Cancelar; `mutate` del listado; mensajes de error. | Editar título, etapa, monto, notas; guardar y ver tablero actualizado. |
| **MS3** | `AlertDialog` eliminar; `DELETE`; copy sobre actividades vinculadas; cerrar panel y revalidar lista. | Eliminar en staging / datos de prueba; comprobar auditoría en Supabase. |

**Orden:** MS1 → MS2 → MS3. No iniciar MS2 hasta validar MS1.
