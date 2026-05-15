# API Modules — Referencia completa

Base path: `/api/v1/`  
Auth: todos los endpoints requieren `withAuth`. Ver patrón en `CLAUDE.md`.  
Tenant: todos los queries filtran por `org_id` del member autenticado.

> **Última ampliación (Paso 1 plan backend):** CRM, IH Billing, PM, Courses. Schema: [DATABASE_SCHEMA §17–22](./DATABASE_SCHEMA.md).

---

## Índice rápido

| Módulo | Ruta base | Métodos | DEMO_MODE | Tabla(s) |
|--------|-----------|---------|-----------|----------|
| [Applicators](#applicators) | `/applicators` | GET POST PATCH DELETE + bulk | ✅ | `applicators` |
| [Audit Logs](#audit-logs) | `/audit-logs` | GET | — | `audit_log` |
| [CENNI](#cenni) | `/cenni` | GET POST PATCH DELETE | — | `cenni_cases` |
| [Dashboard Stats](#dashboard-stats) | `/dashboard/stats` | GET | — | múltiples |
| [Documents](#documents) | `/documents` | GET POST DELETE | — | `documents` + Storage |
| [Events](#events) | `/events` | GET POST PATCH DELETE | — | `events`, `event_sessions`, `event_staff` |
| [Exam Codes](#exam-codes) | `/exam-codes` | GET POST | — | `exam_codes` |
| [Finance — Caja Chica](#finance--caja-chica) | `/finance/petty-cash` | GET POST | — | `petty_cash_movements` |
| [Finance — Presupuesto](#finance--presupuesto) | `/finance/budget` | GET POST | — | `budgets` |
| [Org Locations](#org-locations-catalogo-de-sedes) | `/org-locations` | GET POST PATCH DELETE | — | `org_locations` |
| [Invitations](#invitations) | `/invitations` | GET POST DELETE | — | `org_invitations` |
| [Modules](#modules) | `/modules` | GET POST | — | `module_registry`, `module_permissions` |
| [Notifications](#notifications) | `/notifications` | GET PATCH | — | `notifications` |
| [Packs](#packs) | `/packs` | GET POST PATCH DELETE | ✅ | `packs`, `movements` |
| [Payments](#payments) | `/payments` | GET POST PATCH DELETE | — | `payments` |
| [Payroll](#payroll) | `/payroll` | GET | ✅ | `payroll_periods`, `payroll_entries` |
| [Purchase Orders](#purchase-orders) | `/purchase-orders` | GET POST PATCH DELETE | — | `purchase_orders` |
| [Quotes](#quotes) | `/quotes` | GET POST PATCH DELETE | — | `quotes` |
| [Scan](#scan) | `/scan` | GET POST | ✅ | `packs`, `movements` (via RPC) |
| [Schools](#schools) | `/schools` | GET POST | ✅ | `schools` |
| [Finance — Viáticos](#finance--viáticos) | `/finance/travel-expenses` | GET POST PATCH | — | `travel_expense_reports` |
| [SGC](#sgc) | `/sgc` | GET POST PATCH DELETE + catalogs | - | `sgc_nonconformities`, `sgc_actions`, `sgc_*` |
| [Suppliers](#suppliers) | `/suppliers` | GET POST PATCH DELETE | — | `suppliers` |
| [TOEFL — Administrations](#toefl--administrations) | `/toefl/administrations` | GET POST | — | `toefl_administrations` |
| [TOEFL — Codes](#toefl--codes) | `/toefl/codes` | GET POST | — | `toefl_codes` |
| [Users](#users) | `/users` | GET DELETE | — | `org_members`, `profiles` |
| [Coordinación proyectos LEC](#coordinación-proyectos-lec) | `/coordinacion-proyectos/*` | GET POST PATCH DELETE | — | `lec_*` |
| [CRM](#crm-comercial) | `/crm/*` | GET POST PATCH DELETE | — | `crm_contacts`, `crm_opportunities`, `crm_activities` |
| [IH Billing (CxC)](#ih-billing-cxc-cambridge) | `/finance/ih/*` | GET POST PATCH | — | `ih_sessions`, `ih_invoices`, `ih_payments`, `ih_tariffs` |
| [Project Management](#project-management-pm) | `/pm/*` | GET POST PATCH DELETE | — | `pm_projects`, `pm_tasks`, … |
| [Courses (simulador)](#courses-simulador-académico) | `/courses` | GET POST PUT | — | `courses` |

---


> **Nota**: El índice no contiene todas las sub-rutas dinámicas o herramientas avanzadas. Ver detalles en cada sección.
## Applicators

**Ruta:** `/api/v1/applicators`  
**RBAC module:** `applicators`

### GET `/applicators`
Lista aplicadores activos de la org (soft-delete filter).

| Query param | Tipo | Default | Descripción |
|-------------|------|---------|-------------|
| — | — | — | Sin filtros por query; filtra por `org_id` y `deleted_at IS NULL` |

**Response 200:**
```json
{ "applicators": [...], "total": 5 }
```

### POST `/applicators`
Crea un aplicador. Body requerido: `name` (string min 1). Todo lo demás opcional.

**Body (campos clave):**
```ts
{
  name: string           // requerido
  external_id?: string
  email?: string
  phone?: string
  city?: string
  location_zone?: string
  rate_per_hour?: number
  roles?: string[]       // default []
  certified_levels?: string[]
  authorized_exams?: string[]
  notes?: string
}
```

**Response 201:** `{ "applicator": {...} }`

### PATCH `/applicators/[id]`
Actualización parcial. Acepta cualquier campo del body sin validación de schema estricto (campos enviados se aplican directamente). Filtro por `org_id`.

**Response 200:** `{ "success": true }`

### DELETE `/applicators/[id]`
Hard delete (elimina el registro). Filtro por `org_id`.

**Response 200:** `{ "success": true }`

### POST `/applicators/bulk`
Importación masiva. Requiere rol `admin` o `supervisor`.

**Body:**
```ts
{
  applicators: Array<{
    name: string           // requerido
    external_id?: string
    email?: string
    phone?: string
    authorized_exams?: string[]
    roles?: string[]       // default ["APPLICATOR"]
  }>
}
```

**Response 201:** `{ "success": true, "count": 3 }`  
**Response 403:** si el rol es `operador` o `applicator`

---

## Audit Logs

**Ruta:** `/api/v1/audit-logs`  
**RBAC module:** `audit-log` · **action:** `view`

### GET `/audit-logs`
Lista el log de auditoría con paginación y enriquecimiento de perfiles.

| Query param | Tipo | Default | Descripción |
|-------------|------|---------|-------------|
| `limit` | number | 100 | Registros por página |
| `offset` | number | 0 | Offset de paginación |
| `table` | string | — | Filtrar por `table_name` |
| `action` | string | — | Filtrar por `operation` (se convierte a uppercase) |
| `user` | string (uuid) | — | Filtrar por `changed_by` |

**Response 200:**
```json
{
  "logs": [{ ...log, "profiles": { "id": "...", "full_name": "..." } | null }],
  "pagination": { "total": 42, "limit": 100, "offset": 0 }
}
```

---

## CENNI

**Ruta:** `/api/v1/cenni`  
**RBAC module:** `cenni`

### GET `/cenni`
Lista casos activos de la org (soft-delete filter, orden desc por `created_at`).

**Response 200:** `{ "cases": [...], "role": "admin", "total": 12 }`

### POST `/cenni`
Crea un caso. Body requerido: `folio_cenni`, `cliente_estudiante`.

**Body:**
```ts
{
  folio_cenni: string         // requerido
  cliente_estudiante: string  // requerido
  celular?: string
  correo?: string
  solicitud_cenni?: boolean   // default false
  acta_o_curp?: boolean       // default false
  id_documento?: boolean      // default false
  certificado?: string
  datos_curp?: string
  cliente?: string
  estatus?: string            // default "EN OFICINA" — ver enum cenni_status
  estatus_certificado?: string
  fecha_recepcion?: string    // DATE ISO
  fecha_revision?: string     // DATE ISO
  motivo_rechazo?: string     // TEXT
  notes?: string
}
```

**Response 201:** `{ "case": {...} }`

### PATCH `/cenni/[id]`
Actualización parcial con validación de enums.

**Enums:**
- `estatus` (`cenni_status`): `EN OFICINA` | `SOLICITADO` | `EN TRAMITE/REVISION` | `APROBADO` | `RECHAZADO`
- `estatus_certificado`: `APROBADO` | `RECHAZADO` | `EN PROCESO DE DICTAMINACION` | null

**Campos de fecha/motivo (nuevos desde migración 20260422):**
```ts
{
  fecha_recepcion?: string   // DATE ISO — cuándo se recibió el trámite
  fecha_revision?: string    // DATE ISO — cuándo se revisó
  motivo_rechazo?: string    // TEXT — razón del rechazo (si estatus = RECHAZADO)
}
```

**Response 200:** `{ "case": {...} }`  
**Response 404:** si no existe o ya tiene `deleted_at`

### DELETE `/cenni/[id]`
Soft delete — actualiza `deleted_at`, no elimina el registro.

**Response 200:** `{ "success": true }`

---


### POST `/cenni/bulk`
Carga masiva de casos CENNI.
**Body:** `{ "cases": [...] }`
**Response 201:** `{ "success": true, "count": 10 }`

## Dashboard Stats

**Ruta:** `/api/v1/dashboard/stats`  
**RBAC module:** `dashboard` · **action:** `view`

### GET `/dashboard/stats`
Corre 9 queries en paralelo vía `Promise.all` para generar el resumen ejecutivo.

**Response 200:**
```json
{
  "general": {
    "totalApplicators": 5,
    "totalSchools": 3,
    "totalSessions": 8,
    "eventsThisMonth": 1,
    "upcomingEvents": 2,
    "cenniTotal": 12
  },
  "events": {
    "byStatus": { "DRAFT": 2, "CONFIRMED": 1 },
    "byExamType": { "cambridge": 3, "toefl": 1 }
  },
  "applicators": { "byZone": { "CDMX": 2, "Sin zona": 1 }, "total": 5 },
  "cenni": { "byStatus": { "ENVIADO": 8, "SOLICITADO": 4 }, "total": 12 }
}
```

---

## Documents

**Ruta:** `/api/v1/documents`  
**RBAC module:** `documents`  
**Storage bucket:** `org-documents`

### GET `/documents`
Lista documentos de la org.

| Query param | Tipo | Descripción |
|-------------|------|-------------|
| `module` | string | Filtrar por `module_slug` |
| `record_id` | string | Filtrar por `record_id` |

**Response 200:** `{ "documents": [...] }`

### POST `/documents`
Sube un archivo a Storage y registra el documento en DB. Acepta `multipart/form-data`.

| Campo FormData | Tipo | Requerido |
|----------------|------|-----------|
| `file` | File | ✅ |
| `module_slug` | string | ✅ |
| `record_id` | string | — |
| `tags` | string (CSV) | — |

**Storage path generado:** `{org_id}/{module_slug}/{record_id|"general"}/{timestamp}.{ext}`

**Response 201:** `{ "document": {...} }`  
**Response 400:** si falta `file` o `module_slug`

### DELETE `/documents?id=uuid`
Elimina el archivo de Storage y luego el registro en DB.

**Response 200:** `{ "success": true }`  
**Response 400:** sin `id`  
**Response 404:** documento no encontrado

---


### GET `/documents/download`
Descarga de documento (genera signed URL). Requiere parámetro `path`.

**Response 302:** Redirección a la URL firmada.

## Events

**Ruta:** `/api/v1/events`  
**RBAC module:** `events`

### GET `/events`
Lista eventos de la org con joins a school, sessions y staff.

| Query param | Tipo | Descripción |
|-------------|------|-------------|
| `status` | string | Filtrar por status (DRAFT, CONFIRMED, PUBLISHED, COMPLETED) |

**Response 200:** `{ "events": [...], "total": 3 }`

### POST `/events`
Crea un evento con sesiones y staff en una transacción de 3 pasos.

**Body:**
```ts
{
  title: string              // min 2 chars
  school_id: string (uuid)
  sessions: Array<{
    exam_type: string
    date: string
    parameters: { start_time: string, examiners: number, break_duration: number }
    classrooms: Array<{ name: string, capacity: number }>  // min 1
    staff?: Array<{ applicator_id: string, role: string }>
  }>  // min 1 sesión
}
```

**Response 201:** `{ "event": {...} }`  
**Nota:** `component_order` se genera automáticamente según `exam_type` (starters/movers/flyers/ket/pet/fce tienen orden distinto).

### GET `/events/[id]`
Evento con joins completos: `school`, `sessions`, `staff.applicator`, `slots` (ordenados por `slot_number`).

**Response 200:** `{ "event": {...} }`  
**Response 404:** si no existe

### PATCH `/events/[id]`
Actualización libre del evento. Los campos `id` y `org_id` son eliminados del body antes de aplicar.

**Response 200:** `{ "success": true }`

### DELETE `/events/[id]`
Hard delete. Filtro por `org_id`.

**Response 200:** `{ "success": true }`

---


### POST `/events/[id]/recalculate`
**OBSOLETO.** Usa el endpoint de recálculo por sesión.

### POST `/events/[id]/sessions/[sessionId]/recalculate`
Recalcula los slots para una sesión en específico en base a su duración y descansos.

### PATCH `/events/[id]/slots`
Actualiza o crea slots (horarios de aplicación de exámenes).

### GET `/events/staff-availability`
Devuelve la disponibilidad de staff para fechas específicas.

## Exam Codes

**Ruta:** `/api/v1/exam-codes`  
**RBAC module:** `exam-codes`

### GET `/exam-codes`
Lista códigos activos (`is_active = true`), todos los orgs (sin filtro de org_id).

**Response 200:** `{ "codes": [...] }`

### POST `/exam-codes`
Crea un código.

**Body:**
```ts
{
  exam_type: string           // requerido
  code: string                // requerido
  status?: "AVAILABLE" | "USED" | "EXPIRED"  // default "AVAILABLE"
  registration_date?: string
  expiration_date?: string
}
```

**Response 201:** `{ "code": {...} }`

---


### PATCH `/exam-codes/[id]`
Actualización parcial por ID.

### DELETE `/exam-codes/[id]`
Soft delete o Hard delete según la regla del negocio.

## Finance — Caja Chica

**Ruta:** `/api/v1/finance/petty-cash`  
**RBAC module:** `finanzas`  
**Storage bucket:** `petty-cash-receipts`

### GET `/finance/petty-cash`
Lista movimientos con filtros opcionales y paginación.

| Query param | Descripción |
|-------------|-------------|
| `category_id` | Filtrar por categoría |
| `type` | INCOME / EXPENSE |
| `start_date`, `end_date` | Rango de fechas |
| `search` | Búsqueda en concept |
| `page`, `limit` | Paginación |

**Response 200:** `{ "movements": [...], "count": 10 }`

### POST `/finance/petty-cash`
Crea un movimiento. Balance calculado server-side vía RPC `fn_petty_cash_balance`.

**Body:**
```ts
{
  org_id: string (uuid)       // requerido
  category_id: string (uuid)  // requerido
  date: string
  concept: string
  type: "INCOME" | "EXPENSE"
  amount: number
  receipt_url?: string
}
```

**Response 201:** `{ "movement": {...} }`

---


### GET `/finance/petty-cash/categories`
Lista de categorías.

### GET `/finance/petty-cash/balance`
Obtiene el balance general.

### PATCH `/finance/petty-cash/[id]`
Actualiza un movimiento de caja chica.

### DELETE `/finance/petty-cash/[id]`
Elimina un movimiento de caja chica.

## Finance — Presupuesto

**Ruta:** `/api/v1/finance/budget`  
**RBAC module:** `finanzas`

### GET `/finance/budget`

| Query param | Requerido | Descripción |
|-------------|-----------|-------------|
| `month` | ✅ | Mes (1-12) |
| `year` | ✅ | Año |

**Response 200:** `{ "budgets": [...] }`

### POST `/finance/budget`
Upsert de presupuesto mensual. Body: array de entradas `[{ category_id, amount, month, year, org_id }]`.

**Response 200:** `{ "budgets": [...] }`

### GET `/finance/budget/comparative`
Análisis presupuesto-vs-real para el mes/año especificado.

---

## Org locations (catálogo de sedes)

**Ruta:** `/api/v1/org-locations`  
**RBAC module:** `users`  
**Tabla:** `org_locations`

Catálogo por `org_id`: nombres únicos (case-insensitive) por organización. Se usa para validar `location` en invitaciones y en `PATCH /users/[id]`.

### GET `/org-locations`

Lista sedes del tenant.

| Query param | Descripción |
|-------------|-------------|
| `includeInactive=1` | Incluye sedes con `is_active = false` (útil para administración). Sin el parámetro solo devuelve activas. |

**Response 200:** `{ "locations": [{ id, org_id, name, sort_order, is_active, ... }] }`

### POST `/org-locations`

Crea una sede. **Solo `admin`.**

**Body:** `{ "name": string, "sort_order"?: number }`

**Response 201:** `{ "location": {...} }`  
**Response 409:** nombre duplicado para la organización.

### PATCH `/org-locations/[id]`

Actualiza nombre, orden o estado activo. **Solo `admin`.**

**Body:** `{ "name"?: string, "sort_order"?: number, "is_active"?: boolean }`

### DELETE `/org-locations/[id]`

Elimina el registro del catálogo. **Solo `admin`.** (Los `org_members` que ya tengan ese texto en `location` no se modifican automáticamente.)

---

## Invitations

**Ruta:** `/api/v1/invitations`  
**RBAC module:** `users`  
**⚠️ Requiere** `SUPABASE_SERVICE_ROLE_KEY` en env para la aceptación de invitaciones.

### GET `/invitations`
Lista invitaciones de la org, orden desc por `created_at`.

**Response 200:** `{ "invitations": [...] }`

### POST `/invitations`
Crea invitación. **Solo rol `admin`** puede crear invitaciones.

**Body:**
```ts
{
  email: string         // email válido
  role: "admin" | "supervisor" | "operador" | "applicator"
  hr_profile_id?: string (uuid)  // perfil RRHH de la misma org; el servidor guarda job_title = role_title
  job_title?: string    // obligatorio si no envías hr_profile_id (rol empresa manual)
  location: string        // nombre exacto de una sede **activa** en `org_locations` de la org
  sendEmail?: boolean   // default true
}
```

**Response 200:**
```json
{
  "invitation": {...},
  "joinUrl": "https://app.com/join/TOKEN",
  "emailSent": true,
  "emailError": "..."   // solo si emailSent = false
}
```

**Notas importantes:**
- `joinUrl` siempre se devuelve, incluso si el email falla.
- La aceptación de invitaciones se procesa vía RPC `fn_accept_invitation` (atómica).
- Al aceptar, `hr_profile_id`, `job_title` y `location` de la invitación se aplican a `org_members` (el RPC valida el perfil HR; si ya no existe, solo aplica texto y anula el vínculo).
- `location` debe coincidir con un registro activo en `org_locations` (catálogo por organización).
- **Response 403:** si el rol del member no es `admin`

---


### PATCH `/invitations/[id]`
Actualiza una invitación. Solo admins.

### POST `/invitations/[id]/resend`
Reenvía el correo de la invitación.

### DELETE `/invitations/[id]`
Elimina una invitación individual. Solo funciona sobre invitaciones **no-pendientes**
(aceptadas, rechazadas, expiradas). Solo admins.

**Response 200:** `{ "success": true }`  
**Response 400:** si la invitación aún está pendiente  
**Response 404:** si no existe o pertenece a otra org

### DELETE `/invitations/cleanup`
Elimina en bulk **todas** las invitaciones no-pendientes de la org (limpieza de historial).
Solo admins.

**Response 200:** `{ "success": true, "deleted": 5 }`

## Modules

**Ruta:** `/api/v1/modules`  
**RBAC module:** `studio`

### GET `/modules`
Lista módulos activos. Los admins ven todos; otros roles ven nativos + los que tienen permiso `can_view`.

**Response 200:** `{ "modules": [...], "role": "admin" }`

### POST `/modules`
Crea módulo personalizado. **Solo admins.** Genera automáticamente permisos default para los 4 roles.

**Body:**
```ts
{
  slug: string    // /^[a-z0-9-]+$/, 2-50 chars
  name: string    // max 100 chars
  icon?: string   // default "FileText"
  description?: string
  category?: string
  sort_order?: number  // default 100
  config?: Record<string, any>
}
```

**Response 201:** `{ "module": {...} }`  
**Response 403:** si no es admin  
**Permisos generados:** admin (full), supervisor (sin delete), operador (solo view), applicator (sin acceso)

---


### GET `/modules/[slug]`
Obtiene detalles del módulo, sus campos y permisos.

### PATCH `/modules/[slug]`
Actualiza la configuración del módulo. Solo admins.

### DELETE `/modules/[slug]`
Desactiva un módulo (`is_active = false`). Solo admins y no nativos.

### GET `/modules/[slug]/fields`
Obtiene la lista de campos configurados.

### POST `/modules/[slug]/fields`
Crea un campo para un módulo.

### GET `/modules/[slug]/records`
Obtiene los registros dinámicos del módulo.

### POST `/modules/[slug]/records`
Crea un registro dinámico para el módulo.

## Notifications

**Ruta:** `/api/v1/notifications`  
**RBAC module:** `notifications` · **action:** `view`  
**Scope:** por `user_id`, no por `org_id`

### GET `/notifications`

| Query param | Tipo | Default | Descripción |
|-------------|------|---------|-------------|
| `limit` | number | 20 (max 50) | Cantidad de notificaciones |
| `unread` | boolean | — | Solo no leídas cuando `"true"` |

**Response 200:**
```json
{ "notifications": [...], "unread_count": 3, "total": 12 }
```

### PATCH `/notifications`
Marca notificaciones como leídas.

**Body (opciones mutuamente excluyentes):**
```ts
{ "mark_all": true }
// o
{ "ids": ["uuid-1", "uuid-2"] }
```

**Response 200:** `{ "success": true }`

---

## Packs

**Ruta:** `/api/v1/packs`  
**RBAC module:** `inventory`  
**DEMO_MODE:** ✅

### GET `/packs`
Lista packs con paginación, búsqueda y filtro de status.

| Query param | Tipo | Default | Descripción |
|-------------|------|---------|-------------|
| `page` | number | 1 | Página |
| `limit` | number | 50 | Registros por página |
| `search` | string | — | Búsqueda en `codigo` y `nombre` (ilike) |
| `status` | string | — | `EN_SITIO` o `PRESTADO` |

**Response 200:** `{ "packs": [...], "total": 8, "page": 1, "limit": 50 }`

### POST `/packs`
Crea pack. Timestamps de `hora_salida`/`hora_entrada` se calculan automáticamente según el status.

**Body:**
```ts
{
  codigo: string                          // requerido, trim
  nombre?: string                         // default ""
  status?: "EN_SITIO" | "PRESTADO"       // default "EN_SITIO"
  school_id?: string (uuid)
  applicator_id?: string (uuid)
  notes?: string
}
```

**Response 201:** `{ "pack": {...} }`  
**Response 409:** código duplicado en la org

### PATCH `/packs/[id]`
Actualización parcial. Al cambiar `status`, actualiza automáticamente `hora_salida` o `hora_entrada` con timezone México.

**Body:**
```ts
{
  status?: "EN_SITIO" | "PRESTADO"
  nombre?: string
  notes?: string
  school_id?: string (uuid) | null
  applicator_id?: string (uuid) | null
}
```

**Response 200:** `{ "pack": {...} }`  
**Response 404:** pack no encontrado

### DELETE `/packs/[id]`
Soft delete — actualiza `deleted_at`.

**Response 200:** `{ "success": true }`

---

## Payments

**Ruta:** `/api/v1/payments`  
**RBAC module:** `finanzas`

### GET `/payments`
Lista pagos activos (`is_active = true`) con join a `payment_concepts`.

**Response 200:** `{ "payments": [...] }`

### POST `/payments`
Crea un pago. Dos modos excluyentes validados via `.refine()`:

| `mode` | Requiere | Calcula amount desde |
|--------|----------|---------------------|
| `"exam"` | `concept_id` (uuid) | `concept.cost * quantity - discount` (re-calculado server-side) |
| `"other"` | `custom_concept` | `amount` enviado en body |

**Body:**
```ts
{
  mode: "exam" | "other"
  concept_id?: string (uuid)    // requerido si mode=exam
  custom_concept?: string       // requerido si mode=other
  folio: string                 // requerido
  amount: number
  first_name: string            // requerido
  last_name: string             // requerido
  email?: string | ""
  institution?: string
  quantity?: number             // default 1
  discount?: number             // default 0
  currency?: "MXN" | "USD" | "EUR"  // default "MXN"
  payment_method: string        // requerido
  notes?: string
  status?: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED"  // default "PENDING"
}
```

**Response 201:** `{ "payment": {...} }`

### PATCH `/payments/[id]`
Actualiza `status` y/o `notes`.

**Response 200:** `{ "payment": {...} }`

### DELETE `/payments/[id]`
Soft delete — actualiza `is_active = false`.

**Response 200:** `{ "message": "Payment deleted successfully" }`

---


### POST `/payments/bulk-delete`
Elimina múltiples pagos a la vez enviando un arreglo de IDs.

### GET `/payments/catalog`
Lista el catálogo de conceptos de pagos.

### POST `/payments/catalog`
Crea un nuevo concepto de pago.

### GET `/payments/export`
Exporta los pagos a un archivo Excel.

### POST `/payments/import`
Importa pagos desde un archivo Excel.

## Payroll

**Ruta:** `/api/v1/payroll`  
**RBAC module:** `payroll` · **action:** `view`  
**DEMO_MODE:** ✅ (solo GET)

### GET `/payroll` — lista periodos
Sin `periodId`: devuelve todos los periodos de la org.

**Response 200:** `{ "periods": [...], "total": 2 }`

### GET `/payroll?periodId=uuid` — detalle de periodo
Con `periodId`: devuelve el periodo + sus entradas.

**Response 200:** `{ "period": {...}, "entries": [...] }`  
**Response 404:** periodo no encontrado

---

## Purchase Orders

**Ruta:** `/api/v1/purchase-orders`  
**RBAC module:** `purchase-orders`

### GET `/purchase-orders`
Lista órdenes activas con join a `quotes(folio)`.

**Response 200:** `{ "orders": [...] }`

### POST `/purchase-orders`

**Body:**
```ts
{
  folio: string              // requerido
  quote_id?: string (uuid)
  provider?: string
  description?: string
  file_path?: string
  status?: "PENDING" | "COMPLETED" | "CANCELLED"  // default "PENDING"
}
```

**Response 201:** `{ "order": {...} }`

### PATCH `/purchase-orders/[id]`
Actualización libre del body. Setea `updated_by` y `updated_at` automáticamente.

**Response 200:** `{ "order": {...} }`

### DELETE `/purchase-orders/[id]`
Soft delete — actualiza `is_active = false`.

**Response 200:** `{ "message": "Order deleted successfully" }`

---

## Quotes

**Ruta:** `/api/v1/quotes`  
**RBAC module:** `quotes`

### GET `/quotes`
Lista cotizaciones activas de la org.

**Response 200:** `{ "quotes": [...] }`

### POST `/quotes`

**Body:**
```ts
{
  folio: string              // requerido
  provider?: string
  description?: string
  file_path?: string
  status?: "PENDING" | "APPROVED" | "REJECTED"  // default "PENDING"
}
```

**Response 201:** `{ "quote": {...} }`

### PATCH `/quotes/[id]`
Actualización libre. Setea `updated_by` y `updated_at`.

**Response 200:** `{ "quote": {...} }`

### DELETE `/quotes/[id]`
Soft delete — actualiza `is_active = false`.

**Response 200:** `{ "message": "Quote deleted successfully" }`

---

## Scan

**Ruta:** `/api/v1/scan`  
**RBAC module:** `inventory`  
**DEMO_MODE:** ✅

### GET `/scan?codigo=SPK-0001`
Lookup de pack por código con últimos 5 movimientos.

**Response 200:** `{ "pack": {...}, "movements": [...] }`  
**Response 400:** sin `codigo`  
**Response 404:** pack no encontrado

### POST `/scan`
Registra un movimiento de pack. En modo real usa el RPC `create_movement_and_update_pack`.

**Body:**
```ts
{
  codigo: string                          // requerido
  type: "SALIDA" | "ENTRADA" | "AJUSTE"  // requerido
  school_id?: string | null
  school_name?: string
  applicator_id?: string | null
  applicator_name?: string
  notes?: string
}
```

**Response 200:**
```json
{
  "success": true,
  "pack": { "id": "...", "codigo": "SPK-0001", "nombre": "..." },
  "movement": { "success": true, "movement_id": "...", "previous_status": "EN_SITIO", "new_status": "PRESTADO" }
}
```

**Response 404:** pack no encontrado  
**Response 400:** RPC falló (estado incorrecto, ej: ENTRADA sobre pack EN_SITIO)

---

## Schools

**Ruta:** `/api/v1/schools`  
**RBAC module:** `schools`  
**DEMO_MODE:** ✅

### GET `/schools`
Lista escuelas activas de la org (soft-delete filter, orden por name).

**Response 200:** `{ "schools": [...], "total": 4 }`

### POST `/schools`

**Body:**
```ts
{
  name: string               // requerido
  address?: string
  city?: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  levels?: string[]          // default []
  operating_hours?: { open: string, close: string }  // se guarda como JSON string
  notes?: string
}
```

**Response 201:** `{ "school": {...} }`

---


### PATCH `/schools/[id]`
Actualiza información de la escuela.

### DELETE `/schools/[id]`
Soft delete de la escuela.

## Settings

**Ruta:** `/api/v1/settings`  
**RBAC module:** `users` · **action:** `view`  
**DEMO_MODE:** ✅ (sesión in-memory por proceso)

### GET `/settings`
Configuración del usuario autenticado. Defaults: `locale: "es-MX"`, `theme: "system"`.

**Response 200:** `{ "locale": "es-MX", "theme": "dark" }`

### PUT `/settings`

**Body:**
```ts
{
  locale?: "es-MX" | "en-US"           // default "es-MX"
  theme?: "light" | "dark" | "system"  // default "system"
}
```

**Response 200:** `{ "locale": "...", "theme": "..." }`  
**Response 400:** locale o theme inválidos

---

## Suppliers

**Ruta:** `/api/v1/suppliers`  
**RBAC module:** `suppliers`

### GET `/suppliers`
Lista proveedores activos de la org, orden por nombre.

**Response 200:** `{ "suppliers": [...] }`

### POST `/suppliers`

**Body:**
```ts
{
  name: string          // requerido, max 150
  contact?: string
  email?: string | ""   // email válido o string vacío
  phone?: string
  website?: string
  category?: string
  notes?: string
}
```

**Response 201:** `{ "supplier": {...} }`

### PATCH `/suppliers/[id]`
Actualización parcial. Puede actualizar `is_active` para desactivar sin eliminar.

**Response 200:** `{ "supplier": {...} }`

### DELETE `/suppliers/[id]`
Soft delete (`is_active = false`). **Solo admins** pueden eliminar.

**Response 200:** `{ "success": true }`  
**Response 403:** si el rol no es `admin`

---

## TOEFL — Administrations

**Ruta:** `/api/v1/toefl/administrations`  
**RBAC module:** `toefl`

### GET `/toefl/administrations`
Lista administraciones activas. `test_date` se expone también como `start_date`.

**Response 200:** `{ "administrations": [{ ...admin, "start_date": "2024-06-01" }] }`

### POST `/toefl/administrations`

**Body:**
```ts
{
  name: string        // requerido
  start_date: string  // requerido — se guarda como test_date en DB
  end_date: string    // requerido
}
```

**Response 201:** `{ "administration": {...} }`  
**Nota:** `test_type` se guarda como `"N/A"` (no expuesto en el body).

---


### PATCH `/toefl/administrations/[id]`
Actualiza la administración.

### DELETE `/toefl/administrations/[id]`
Elimina la administración.

## TOEFL — Codes

**Ruta:** `/api/v1/toefl/codes`  
**RBAC module:** `toefl-codes`

### GET `/toefl/codes`
Lista códigos activos de la org.

**Response 200:** `{ "codes": [...] }`

### POST `/toefl/codes`
Crea N códigos en bulk. Genera folios únicos con formato `TFL-YYYYMMDD-HHMMSS-NNN`.

**Body:**
```ts
{
  test_type: string                    // requerido
  quantity: number                     // 1-500
  purchase_order_id?: string (uuid)
}
```

**Response 201:**
```json
{
  "message": "Successfully created 5 empty slots.",
  "codes": [{ "folio": "TFL-20240615-123456-001", "system_uniq_id": "LEC-20240615123456001", ... }]
}
```

---


### PATCH `/toefl/codes/[id]`
Actualiza código específico.

### DELETE `/toefl/codes/[id]`
Elimina código específico.

### POST `/toefl/codes/import`
Importación masiva de códigos.

## Users

**Ruta:** `/api/v1/users`  
**RBAC module:** `users`

### GET `/users`
Lista miembros de la org con nombres y emails. Hace 3 queries: `org_members` + `profiles` + RPC `get_users_emails`.

**Response 200:**
```json
{
  "members": [{
    "id": "...",
    "user_id": "...",
    "role": "admin",
    "full_name": "Luis Aguilar",  // "Sin nombre" si no tiene perfil
    "email": "luis@test.com",     // "Sin correo" si no disponible
    "location": null,
    "job_title": null,
    "created_at": "..."
  }]
}
```

### DELETE `/users?id=uuid`
Elimina un miembro de la org. Filtro por `org_id`.

**Response 200:** `{ "success": true }`  
**Response 400:** sin `id`

---


### GET `/users/me`
Obtiene la información de perfil actual y sus accesos a módulos.

### GET `/users/[id]`
Obtiene información del usuario específico y sus accesos de módulos.

### PATCH `/users/[id]`
Actualiza rol, sede (`location` vs catálogo `org_locations`), vínculo a RRHH y permisos por módulo. Solo admins.

**Body (parcial):**
```ts
{
  role?: "admin" | "supervisor" | "operador" | "applicator"
  location?: string | null   // null o nombre de sede activa en org_locations
  hr_profile_id?: string (uuid) | null  // perfil hr_profiles de la org; al asignar, job_title = role_title del perfil
  job_title?: string | null  // si hr_profile_id es null, texto libre; si se envía perfil, job_title lo fuerza el servidor
  permissions?: Array<{ module: string; can_view?: boolean; can_edit?: boolean; can_delete?: boolean }>
}
```


## CRM comercial

**Ruta base:** `/api/v1/crm`  
**RBAC en rutas:** `module: "crm"` — en `permissions.ts`, el slug `crm` acepta cualquier fila en `member_module_access` entre: `crm`, `crm-pipeline`, `crm-directory`, `crm-activities`, `crm-metrics`.

**ADR / tablas:** [ADR-009](./adr/ADR-009-crm-module-foundation.md), [DATABASE_SCHEMA §18](./DATABASE_SCHEMA.md#18-crm-comercial-crm_).

### GET `/crm/contacts`

**Acción:** `view`  
**Query:** `type`, `source`, `q`, `assigned_to`, `limit` (max 500), `offset`.

**Response 200:**
```json
{ "contacts": [...], "total": 42 }
```

### POST `/crm/contacts`

**Acción:** `edit` — body Zod: `type`, `name`, `email`, `phone`, `source`, `school_id`, etc.

**Response 201:** `{ "contact": { ... } }`

### GET/PATCH/DELETE `/crm/contacts/[id]`

CRUD por id. Mutaciones con `logAudit`.

### GET `/crm/opportunities`

**Acción:** `view`  
**Query:** `stage`, `contact_id`, `assigned_to`, `q`.

**Response 200:**
```json
{ "opportunities": [...], "total": 10 }
```

> **Gotcha:** la respuesta usa la clave `opportunities`, no `data`. El join incluye `crm_contacts(id, name, type, email, phone)`.

### POST `/crm/opportunities`

**Acción:** `edit`  
**Body:** `contact_id`, `title`, `stage`, `expected_amount`, `probability`, `expected_close`, `quote_id`, `assigned_to`, `notes`.

### GET/PATCH/DELETE `/crm/opportunities/[id]`

CRUD por id.

### GET `/crm/activities`

**Acción:** `view` — filtros: `type`, `status`, `contact_id`, `opportunity_id`, paginación.

### POST `/crm/activities`

**Acción:** `edit` — `type`, `subject`, `contact_id`, `due_date`, etc.

### GET/PATCH/DELETE `/crm/activities/[id]`

Incluye marcar completada / eliminar según implementación en `[id]/route.ts`.

**RLS DB:** escritura CRM en Postgres solo admin/supervisor; operadores con `can_view` en módulo CRM pueden leer vía API si tienen permiso.

---

## IH Billing (CxC Cambridge)

**Ruta base:** `/api/v1/finance/ih`  
**RBAC en rutas:** `module: "finanzas"` (alias → `payments` en `MODULE_ALIAS_MAP`). El sidebar usa slug `ih-billing` en `member_module_access`.

**Tablas:** [DATABASE_SCHEMA §19](./DATABASE_SCHEMA.md#19-ih-billing--cxc-cambridge-ih_).  
**UI:** `/dashboard/coordinacion-examenes/cxc`.

### GET `/finance/ih/sessions`

**Acción:** `view`  
**Query:** `region` (`SONORA` \| `BAJA_CALIFORNIA`), `status`, `year`, `school` (ilike).

**Response 200:** array de sesiones (no wrapper `{ sessions }`).

### POST `/finance/ih/sessions`

**Acción:** `edit`  
**Body:** `school_name`, `exam_type`, `session_date`, `region`, `students_applied`, `tariff`, `status`, `school_id`, `ih_invoice_id`.  
**409** si viola UNIQUE por escuela/examen/fecha.

### GET/PATCH/DELETE `/finance/ih/sessions/[id]`

CRUD sesión individual.

### POST `/finance/ih/sessions/import`

Import masivo desde Excel (ver ruta `sessions/import/route.ts`).

### GET `/finance/ih/invoices`

**Acción:** `view` — incluye join `ih_sessions(...)`. Filtros `region`, `status`.

### POST `/finance/ih/invoices`

**Acción:** `edit` — opcional `session_ids[]` para ligar sesiones al crear.

### GET/PATCH `/finance/ih/invoices/[id]`

Detalle y actualización. Ruta print en UI: `invoices/[id]/print`.

### GET/POST `/finance/ih/payments`

Listado y alta de pagos IH (`region`, `amount`, `payment_date`, `reference`, `proof_path`).

### GET/PATCH `/finance/ih/payments/[id]`

### POST `/finance/ih/payments/[id]/reconcile`

**Acción:** `edit`  
**Body:** `{ "mode": "manual", "allocations": [{ "session_id", "students_paid", "amount" }] }` o `{ "mode": "auto" }` (sugerencia sesiones PENDING misma región).

### GET/POST `/finance/ih/tariffs`

Lista y alta de tarifas por año/tipo examen.

### POST `/finance/ih/tariffs` (seed)

Carga tarifas históricas 2023–2026 embebidas en código si la org no tiene filas.

### GET `/finance/ih/summary`

**Acción:** `view`  
**Query:** `year` (default año actual).

**Response 200:** agregados por región (`executed`, `paid`, `balance`, `future`, `alerts` por escuela vencida).

---

## Project Management (PM)

**Ruta base:** `/api/v1/pm`  
**RBAC module:** `project-management`  
**Doc:** [PROJECT_MANAGEMENT_MODULE.md](./PROJECT_MANAGEMENT_MODULE.md), [PM_PATHS_AND_ROUTES.md](./PM_PATHS_AND_ROUTES.md).

### GET `/pm/projects`

**Acción:** `view` — query `status`, `q`.

**Response 200:**
```json
{ "projects": [...], "total": 3 }
```

### POST `/pm/projects`

**Acción:** `edit` — crea proyecto + tablero + columnas por defecto (`name`, `key` opcional, `description`, `owner_user_id`).

### GET/PATCH/DELETE `/pm/projects/[id]`

### GET `/pm/tasks`

**Acción:** `view` — filtros por proyecto/columna/asignado (ver route).

### POST `/pm/tasks`

**Acción:** `edit` — alta en columna.

### GET/PATCH/DELETE `/pm/tasks/[id]`

### POST `/pm/tasks/[id]/move`

**Acción:** `edit` — body `{ "column_id": "uuid", "sort_order"?: number }`. Actualiza `completed_at` si columna `is_done`.

---

## Courses (simulador académico)

**Ruta:** `/api/v1/courses`  
**RBAC module:** `courses`  
**Tabla:** `courses` — ver [DATABASE_SCHEMA §20](./DATABASE_SCHEMA.md#20-cursos-simulador-e-inventario-feria).

Distinto de **`lec_course_offerings`** ([Coordinación proyectos LEC](#coordinación-proyectos-lec)).

### GET `/courses`

**Acción:** `view` — lista por `org_id`, orden `created_at` desc.

**Response 200:** array de cursos (sin wrapper).

### POST `/courses`

**Acción:** `edit` — body spread en insert; `status` default `draft`. `logAudit` en INSERT.

### PUT `/courses`

**Acción:** `edit` — body debe incluir `id`; actualización parcial del resto de campos.

> No hay `DELETE` documentado en route actual; usar `status = cancelled` si se añade en UI.

**Inventario feria:** las rutas `/packs`, `/scan` usan módulo `inventory` y tablas legacy `packs`/`movements`; el inventario multi-ubicación (`inventory_*`) se expone desde UI `/dashboard/logistica/inventario` (endpoints dedicados pueden añadirse — verificar `src/app/api` antes de integrar).

---

## Coordinación proyectos LEC

**Ruta base:** `/api/v1/coordinacion-proyectos`  
**RBAC module:** `coordinacion-proyectos-lec` (alias en código: `coordinacion-proyectos` → mismo módulo en `permissions.ts`)

Documentación de producto y tablas: [COORDINACION_PROYECTOS_LEC.md](./COORDINACION_PROYECTOS_LEC.md). Guía operativa (import, subpantallas): [wiki/coordinacion-proyectos-lec.md](./wiki/coordinacion-proyectos-lec.md).

### GET `/coordinacion-proyectos/overview`

**Acción:** `view`  
**Query:** `year` (default año actual).

**Response 200 (ejemplo):**
```json
{
  "year": 2026,
  "programProjects": { "count": 0, "beneficiariesTotal": 0, "revenueTotal": 0, "missingRevenueCount": 0 },
  "examLines": { "count": 0, "quantityTotal": 0, "amountTotal": 0 },
  "courseOfferingsCount": 0
}
```

### GET/POST `/coordinacion-proyectos/program-projects`

**GET:** `view`. Query: `year`, `month` (1–12, con `year`), `limit`, `offset`.  
**POST:** `edit`. Body validado con Zod (`period_month` formato `YYYY-MM-DD`, descripción, etc.).

### GET/PATCH/DELETE `/coordinacion-proyectos/program-projects/[id]`

**GET:** `view` · **PATCH:** `edit` · **DELETE:** `delete`

### GET/POST `/coordinacion-proyectos/exam-lines` y `/exam-lines/[id]`

Misma convención: listado con filtros por año/mes; CRUD por id.

### GET/POST `/coordinacion-proyectos/course-offerings` y `/course-offerings/[id]`

Cursos operativos (no el simulador `/api/v1/courses`).

### GET/POST `/coordinacion-proyectos/catalog` y PATCH/DELETE `/catalog/[id]`

Catálogos por org. **DELETE** requiere query `?kind=department|exam_type|product_service`.

### GET/PATCH `/coordinacion-proyectos/kpi-comparison`

Comparativos por tamaño. **PATCH** body: `{ "rows": [{ "id": "uuid", "count_2025"?: n, "count_2026"?: n, "projected_2026"?: n }] }`.

### POST `/coordinacion-proyectos/import`

**Acción:** `edit`  
**Body:** `{ "entity": "program_projects" | "exam_sales_lines", "rows": [ { ... }, ... ] }` (máx. 2000 filas).  
Mapeo flexible de claves tipo Excel — ver wiki.

**Response 200:** `{ "inserted": number, "errors": string[] }` (máx. 50 errores devueltos).

---

## SGC
Ruta base: /api/v1/sgc  
RBAC module: sgc
### No conformidades
- GET /sgc/nonconformities: listado paginado (page, limit) con filtros (status, stage_id, severity_id, q).
- POST /sgc/nonconformities: crea no conformidad (tenant from member.org_id) y permite vincular origin_ids, cause_ids, action_links.
- GET /sgc/nonconformities/[id]: detalle + relaciones (origin_ids, cause_ids, action_links).
- PATCH /sgc/nonconformities/[id]: actualizacion parcial + sincronizacion de relaciones.
- DELETE /sgc/nonconformities/[id]: cancelacion logica (status = cancel).
### Acciones CAPA
- GET /sgc/actions: listado paginado con filtros (status, stage_id, type_action, responsible_user_id, q).
- POST /sgc/actions: crea accion CAPA.
- GET /sgc/actions/[id]: detalle por id.
- PATCH /sgc/actions/[id]: actualizacion parcial con reglas de workflow DB.
- DELETE /sgc/actions/[id]: cancelacion logica (status = cancel).
### Auditoria SGC
- GET /sgc/audit: checklist + CAR + timeline consolidado por tenant.
- POST /sgc/audit: alta manual de item de checklist.
- PATCH /sgc/audit/[id]: actualiza estado/nota/fecha y genera CAR automatica al pasar a noconf.
- PATCH /sgc/audit/cars/[id]: actualiza causa raiz, plan, responsable, vencimiento y estatus de CAR.
### Catalogos SGC
- GET/POST /sgc/catalogs/stages?kind=nc|action
- PATCH/DELETE /sgc/catalogs/stages/[id]?kind=nc|action
- GET/POST /sgc/catalogs/origins
- PATCH/DELETE /sgc/catalogs/origins/[id]
- GET/POST /sgc/catalogs/causes
- PATCH/DELETE /sgc/catalogs/causes/[id]
- GET/POST /sgc/catalogs/severities
- PATCH/DELETE /sgc/catalogs/severities/[id]
### Reglas operativas
- Todas las rutas mutantes aplican withAuth + logAudit.
- Mutaciones SGC restringidas en API a admin y supervisor.
- Todos los queries aplican org_id para aislamiento tenant.
- Errores de workflow/constraints de DB se mapean a respuestas API legibles (409 / 400).
---
## RBAC — Módulo × Acción requerida por endpoint

Cada endpoint declara `{ module, action }` en su `withAuth`. La tabla siguiente
muestra qué acción requiere cada operación. Los permisos por rol se gestionan
en la tabla `module_permissions` de Supabase.

| Ruta | Método | module | action | Restricción extra en código |
|------|--------|--------|--------|-----------------------------|
| `/applicators` | GET | applicators | view | — |
| `/applicators` | POST | applicators | edit | — |
| `/applicators/[id]` | PATCH | applicators | edit | — |
| `/applicators/[id]` | DELETE | applicators | delete | — |
| `/applicators/bulk` | POST | applicators | edit | Solo admin/supervisor |
| `/audit-logs` | GET | audit-log | view | — |
| `/cenni` | GET | cenni | view | — |
| `/cenni` | POST | cenni | edit | — |
| `/cenni/[id]` | PATCH | cenni | edit | — |
| `/cenni/[id]` | DELETE | cenni | delete | — |
| `/dashboard/stats` | GET | dashboard | view | — |
| `/documents` | GET | documents | view | — |
| `/documents` | POST | documents | edit | — |
| `/documents` | DELETE | documents | delete | — |
| `/events` | GET | events | view | — |
| `/events` | POST | events | edit | — |
| `/events/[id]` | GET | events | view | — |
| `/events/[id]` | PATCH | events | edit | — |
| `/events/[id]` | DELETE | events | delete | — |
| `/exam-codes` | GET | exam-codes | view | — |
| `/exam-codes` | POST | exam-codes | edit | — |
| `/finance/petty-cash` | GET | finanzas | view | — |
| `/finance/petty-cash` | POST | finanzas | edit | — |
| `/finance/budget` | GET | finanzas | view | — |
| `/finance/budget` | POST | finanzas | edit | — |
| `/org-locations` | GET | users | view | — |
| `/org-locations` | POST | users | edit | Solo role=admin |
| `/org-locations/[id]` | PATCH | users | edit | Solo role=admin |
| `/org-locations/[id]` | DELETE | users | delete | Solo role=admin |
| `/invitations` | GET | users | view | — |
| `/invitations` | POST | users | edit | Solo role=admin |
| `/modules` | GET | studio | view | — |
| `/modules` | POST | studio | edit | Solo role=admin |
| `/notifications` | GET | notifications | view | — |
| `/notifications` | PATCH | notifications | view | — |
| `/packs` | GET | inventory | view | — |
| `/packs` | POST | inventory | edit | — |
| `/packs/[id]` | PATCH | inventory | edit | — |
| `/packs/[id]` | DELETE | inventory | delete | — |
| `/payments` | GET | finanzas | view | — |
| `/payments` | POST | finanzas | edit | — |
| `/payments/[id]` | PATCH | payments | edit | — |
| `/payments/[id]` | DELETE | payments | delete | — |
| `/payroll` | GET | payroll | view | — |
| `/purchase-orders` | GET | purchase-orders | view | — |
| `/purchase-orders` | POST | purchase-orders | edit | — |
| `/purchase-orders/[id]` | PATCH | purchase-orders | edit | — |
| `/purchase-orders/[id]` | DELETE | purchase-orders | delete | — |
| `/quotes` | GET | quotes | view | — |
| `/quotes` | POST | quotes | edit | — |
| `/quotes/[id]` | PATCH | quotes | edit | — |
| `/quotes/[id]` | DELETE | quotes | delete | — |
| `/scan` | GET | inventory | view | — |
| `/scan` | POST | inventory | edit | — |
| `/schools` | GET | schools | view | — |
| `/schools` | POST | schools | edit | — |
| `/settings` | GET | users | view | — |
| `/settings` | PUT | users | view | — |
| `/suppliers` | GET | suppliers | view | — |
| `/suppliers` | POST | suppliers | edit | — |
| `/suppliers/[id]` | PATCH | suppliers | edit | — |
| `/suppliers/[id]` | DELETE | suppliers | delete | Solo role=admin |
| `/toefl/administrations` | GET | toefl | view | — |
| `/toefl/administrations` | POST | toefl | edit | — |
| `/toefl/codes` | GET | toefl-codes | view | — |
| `/toefl/codes` | POST | toefl-codes | edit | — |
| `/users` | GET | users | view | — |
| `/users` | DELETE | users | delete | — |
| `/cenni/bulk` | POST | cenni | edit | - |
| `/documents/download` | GET | documents | view | - |
| `/events/[id]/recalculate` | POST | events | edit | Obsoleto |
| `/events/[id]/sessions/[sessionId]/recalculate` | POST | events | edit | - |
| `/events/[id]/slots` | PATCH | events | edit | - |
| `/events/staff-availability` | GET | events | view | - |
| `/finance/petty-cash/categories` | GET | finanzas | view | - |
| `/finance/petty-cash/balance` | GET | finanzas | view | - |
| `/finance/petty-cash/[id]` | PATCH | finanzas | edit | - |
| `/finance/petty-cash/[id]` | DELETE | finanzas | delete | - |
| `/invitations/[id]` | PATCH | users | edit | - |
| `/invitations/[id]` | DELETE | users | delete | Solo no-pendientes; Solo admin |
| `/invitations/[id]/resend` | POST | users | edit | - |
| `/invitations/cleanup` | DELETE | users | delete | Bulk; Solo admin |
| `/modules/[slug]` | GET | studio | view | - |
| `/modules/[slug]` | PATCH | studio | edit | Solo role=admin |
| `/modules/[slug]` | DELETE | studio | delete | Solo role=admin |
| `/modules/[slug]/fields` | GET | studio | view | - |
| `/modules/[slug]/fields` | POST | studio | edit | Solo role=admin |
| `/modules/[slug]/records` | GET | studio | view | - |
| `/modules/[slug]/records` | POST | studio | edit | - |
| `/payments/bulk-delete` | POST | finanzas | delete | - |
| `/payments/catalog` | GET | finanzas | view | - |
| `/payments/catalog` | POST | finanzas | edit | Solo admin/supervisor |
| `/payments/export` | GET | finanzas | view | - |
| `/payments/import` | POST | finanzas | edit | - |
| `/schools/[id]` | PATCH | schools | edit | - |
| `/schools/[id]` | DELETE | schools | delete | - |
| `/toefl/administrations/[id]` | PATCH | examenes | edit | - |
| `/toefl/administrations/[id]` | DELETE | examenes | delete | - |
| `/toefl/codes/[id]` | PATCH | toefl-codes | edit | - |
| `/toefl/codes/[id]` | DELETE | toefl-codes | delete | - |
| `/toefl/codes/import` | POST | toefl-codes | edit | - |
| `/users/me` | GET | users | view | - |
| `/users/[id]` | GET | users | view | - |
| /sgc/nonconformities | GET | sgc | view | - |
| /sgc/nonconformities | POST | sgc | edit | Solo admin/supervisor |
| /sgc/nonconformities/[id] | GET | sgc | view | - |
| /sgc/nonconformities/[id] | PATCH | sgc | edit | Solo admin/supervisor |
| /sgc/nonconformities/[id] | DELETE | sgc | edit | Cancelacion logica; Solo admin/supervisor |
| /sgc/actions | GET | sgc | view | - |
| /sgc/actions | POST | sgc | edit | Solo admin/supervisor |
| /sgc/actions/[id] | GET | sgc | view | - |
| /sgc/actions/[id] | PATCH | sgc | edit | Solo admin/supervisor |
| /sgc/actions/[id] | DELETE | sgc | edit | Cancelacion logica; Solo admin/supervisor |
| /sgc/audit | GET | sgc | view | Checklist + CAR + timeline |
| /sgc/audit | POST | sgc | edit | Solo admin/supervisor |
| /sgc/audit/[id] | PATCH | sgc | edit | Auto-crea CAR cuando status=noconf |
| /sgc/audit/cars/[id] | PATCH | sgc | edit | Solo admin/supervisor |
| /sgc/catalogs/stages | GET | sgc | view | kind=nc|action |
| /sgc/catalogs/stages | POST | sgc | edit | Solo admin/supervisor |
| /sgc/catalogs/stages/[id] | PATCH | sgc | edit | Solo admin/supervisor |
| /sgc/catalogs/stages/[id] | DELETE | sgc | edit | Solo admin/supervisor |
| /sgc/catalogs/origins | GET | sgc | view | - |
| /sgc/catalogs/origins | POST | sgc | edit | Solo admin/supervisor |
| /sgc/catalogs/origins/[id] | PATCH | sgc | edit | Solo admin/supervisor |
| /sgc/catalogs/origins/[id] | DELETE | sgc | edit | Solo admin/supervisor |
| /sgc/catalogs/causes | GET | sgc | view | - |
| /sgc/catalogs/causes | POST | sgc | edit | Solo admin/supervisor |
| /sgc/catalogs/causes/[id] | PATCH | sgc | edit | Solo admin/supervisor |
| /sgc/catalogs/causes/[id] | DELETE | sgc | edit | Solo admin/supervisor |
| /sgc/catalogs/severities | GET | sgc | view | - |
| /sgc/catalogs/severities | POST | sgc | edit | Solo admin/supervisor |
| /sgc/catalogs/severities/[id] | PATCH | sgc | edit | Solo admin/supervisor |
| /sgc/catalogs/severities/[id] | DELETE | sgc | edit | Solo admin/supervisor |
| `/crm/contacts` | GET | crm | view | Slug CRM vía `CRM_ACCESS_SLUGS` |
| `/crm/contacts` | POST | crm | edit | DB: supervisor+ |
| `/crm/contacts/[id]` | PATCH | crm | edit | — |
| `/crm/contacts/[id]` | DELETE | crm | delete | — |
| `/crm/opportunities` | GET | crm | view | Response `{ opportunities }` |
| `/crm/opportunities` | POST | crm | edit | — |
| `/crm/opportunities/[id]` | PATCH | crm | edit | — |
| `/crm/activities` | GET | crm | view | — |
| `/crm/activities` | POST | crm | edit | — |
| `/finance/ih/sessions` | GET | finanzas | view | Alias → payments |
| `/finance/ih/sessions` | POST | finanzas | edit | — |
| `/finance/ih/sessions/import` | POST | finanzas | edit | — |
| `/finance/ih/invoices` | GET | finanzas | view | — |
| `/finance/ih/invoices` | POST | finanzas | edit | — |
| `/finance/ih/payments` | GET | finanzas | view | — |
| `/finance/ih/payments` | POST | finanzas | edit | — |
| `/finance/ih/payments/[id]/reconcile` | POST | finanzas | edit | manual \| auto |
| `/finance/ih/tariffs` | GET | finanzas | view | — |
| `/finance/ih/tariffs` | POST | finanzas | edit | Incl. seed histórico |
| `/finance/ih/summary` | GET | finanzas | view | Dashboard CxC |
| `/pm/projects` | GET | project-management | view | — |
| `/pm/projects` | POST | project-management | edit | Crea board + columnas |
| `/pm/tasks` | GET | project-management | view | — |
| `/pm/tasks` | POST | project-management | edit | — |
| `/pm/tasks/[id]/move` | POST | project-management | edit | Kanban drag |
| `/courses` | GET | courses | view | — |
| `/courses` | POST | courses | edit | — |
| `/courses` | PUT | courses | edit | Body incluye `id` |
| `/coordinacion-proyectos/overview` | GET | coordinacion-proyectos-lec | view | Ver sección LEC |
| `/coordinacion-proyectos/import` | POST | coordinacion-proyectos-lec | edit | Bulk JSON |
> **Patrones de delete:**
> - **Hard delete** (elimina el registro): `events`, `applicators`
> - **Soft delete vía `deleted_at`**: `cenni`, `packs`, `schools`
> - **Soft delete vía `is_active = false`**: `payments`, `purchase-orders`, `quotes`, `suppliers`



