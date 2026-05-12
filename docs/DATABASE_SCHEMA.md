# Database Schema — LEC Orb

Schema completo extraído de `supabase/migrations/`. Agrupa tablas por dominio.
Fuente de verdad para el schema actual: los archivos `.sql` en `supabase/migrations/`.

> **Regla de migraciones:** nunca editar archivos existentes. Solo agregar archivos nuevos.

---

## Enums

| Enum | Valores |
|------|---------|
| `member_role` | `admin`, `supervisor`, `operador`, `applicator` |
| `invitation_status` | `pending`, `accepted`, `expired`, `revoked` |
| `pack_status` | `EN_SITIO`, `PRESTADO` |
| `movement_type` | `SALIDA`, `ENTRADA`, `AJUSTE` |
| cenni `estatus` (text) | `EN OFICINA`, `SOLICITADO`, `EN TRAMITE/REVISION`, `APROBADO`, `RECHAZADO` |

---

## 1. Core / Auth

### `organizations`
Tenant principal. Cada cliente es una fila.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `name` | text | |
| `slug` | text UNIQUE | Usado en URLs |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

RLS: miembros solo leen su propia organización.

---

### `profiles`
1:1 con `auth.users`. Se crea automáticamente vía trigger `on_auth_user_created`.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | FK → `auth.users(id)` ON DELETE CASCADE |
| `full_name` | text | Default `''` |
| `email` | text | |
| `phone` | text | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### `org_members`
Asociación usuario–organización con rol RBAC.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | FK → `organizations` |
| `user_id` | uuid | FK → `auth.users` |
| `role` | member_role | Default `operador` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

UNIQUE: `(org_id, user_id)`. RLS: solo admins pueden insertar/actualizar/eliminar.

---

### `member_module_access`
Control granular de acceso por módulo (complementa el rol RBAC).

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | FK → `organizations` |
| `member_id` | uuid | FK → `org_members` |
| `module` | text | Slug del módulo |
| `can_view` | boolean | Default `true` |
| `can_edit` | boolean | Default `false` |
| `can_delete` | boolean | Default `false` |
| `created_at` | timestamptz | |

---

### `user_settings`
Preferencias por usuario (locale, tema, org activa).

| Columna | Tipo | Notas |
|---------|------|-------|
| `user_id` | uuid PK | FK → `auth.users` |
| `org_id` | uuid | FK → `organizations` (org activa) |
| `locale` | text | `es-MX` \| `en-US` |
| `theme` | text | `light` \| `dark` \| `system` |
| `updated_at` | timestamptz | |

---

### `org_invitations`
Invitaciones para unirse a una organización.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | FK → `organizations` |
| `email` | text | |
| `role` | member_role | Default `operador` |
| `token` | text UNIQUE | 32 bytes aleatorios en hex |
| `status` | invitation_status | Default `pending` |
| `invited_by` | uuid | FK → `auth.users` |
| `created_at` | timestamptz | |
| `expires_at` | timestamptz | Default `now() + 7 days` |
| `accepted_at` | timestamptz | nullable |

RLS: solo admins pueden gestionar. Aceptación vía RPC `fn_accept_invitation` (admin client).

---

## 2. Módulo Registry / Permisos

### `module_registry`
Catálogo de módulos habilitados por org.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | FK → `organizations` |
| `slug` | text | Identificador único del módulo |
| `name` | text | |
| `icon` | text | |
| `description` | text | |
| `category` | text | |
| `is_native` | boolean | |
| `is_active` | boolean | |
| `sort_order` | integer | |
| `config` | jsonb | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `module_permissions`
Permisos por módulo y rol.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `module_id` | uuid | FK → `module_registry` |
| `role` | text | member_role como text |
| `can_view` | boolean | |
| `can_create` | boolean | |
| `can_edit` | boolean | |
| `can_delete` | boolean | |

---

## 3. Inventario / Packs

### `packs`
Inventario de material de aplicación de exámenes.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | |
| `codigo` | text | Código único por org (ej. SPK-0001) |
| `nombre` | text | |
| `status` | pack_status | `EN_SITIO` \| `PRESTADO` |
| `current_school_id` | uuid | nullable |
| `current_applicator_id` | uuid | nullable |
| `notes` | text | |
| `deleted_at` | timestamptz | Soft delete |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `movements` (pack movements)
Historial de movimientos de packs (SALIDA/ENTRADA/AJUSTE).

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | |
| `pack_id` | uuid | FK → `packs` |
| `type` | movement_type | |
| `school_id` | uuid | nullable |
| `school_name` | text | Desnormalizado |
| `applicator_id` | uuid | nullable |
| `applicator_name` | text | Desnormalizado |
| `previous_status` | pack_status | |
| `new_status` | pack_status | |
| `notes` | text | |
| `performed_by` | uuid | FK → `auth.users` |
| `created_at` | timestamptz | |

---

## 4. Catálogos Operativos

### `schools`
Sedes donde se aplican exámenes.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | |
| `name` | text | |
| `address` | text | |
| `contact_name` | text | |
| `contact_phone` | text | |
| `contact_email` | text | |
| `operating_hours` | jsonb | Horarios por día |
| `notes` | text | |
| `deleted_at` | timestamptz | Soft delete |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `rooms`
Salones dentro de una sede.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | |
| `school_id` | uuid | FK → `schools` |
| `name` | text | |
| `capacity` | integer | |
| `notes` | text | |
| `deleted_at` | timestamptz | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `applicators`
Aplicadores de exámenes (pueden tener cuenta de usuario asociada).

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | |
| `name` | text | |
| `email` | text | |
| `phone` | text | |
| `rate_per_hour` | numeric | |
| `roles` | text[] | Roles de aplicación |
| `certified_levels` | text[] | |
| `auth_user_id` | uuid | nullable — link a `auth.users` |
| `location` | text | Ciudad/zona |
| `zone` | text | Zona geográfica |
| `notes` | text | |
| `deleted_at` | timestamptz | Soft delete |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `exam_catalog`
Catálogo de tipos de examen (TOEFL, CENNI, Cambridge...).

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | |
| `name` | text | |
| `code` | text | |
| `duration_minutes` | integer | |
| `students_per_session` | integer | |
| `level` | text | |
| `notes` | text | |
| `deleted_at` | timestamptz | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

## 5. Eventos

### `events`

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | |
| `name` | text | |
| `event_date` | date | |
| `school_id` | uuid | FK → `schools` |
| `school_name` | text | Desnormalizado |
| `venue_notes` | text | |
| `status` | text | `draft`, `confirmed`, `completed`, `cancelled` |
| `notes` | text | |
| `deleted_at` | timestamptz | Soft delete |
| `created_by` | uuid | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `event_exams`
Exámenes dentro de un evento (relación evento–catálogo).

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | |
| `event_id` | uuid | FK → `events` |
| `exam_catalog_id` | uuid | FK → `exam_catalog` |
| `exam_name` | text | Desnormalizado |
| `exam_code` | text | |
| `duration_minutes` | integer | |
| `students_per_session` | integer | |
| `total_students` | integer | |
| `start_time` | time | |
| `end_time` | time | |
| `notes` | text | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `slots`
Slots de aplicación dentro de un event_exam.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | |
| `event_exam_id` | uuid | FK → `event_exams` |
| `slot_number` | integer | |
| `start_time` | time | |
| `end_time` | time | |
| `applicator_id` | uuid | nullable |
| `applicator_name` | text | |
| `room_name` | text | |
| `pack_id` | uuid | nullable |
| `student_names` | text[] | |
| `status` | text | |
| `notes` | text | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

## 6. Nómina

### `payroll_periods`

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | |
| `name` | text | |
| `start_date` | date | |
| `end_date` | date | |
| `status` | text | `open`, `paid` |
| `total_amount` | numeric | |
| `notes` | text | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `payroll_entries`

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | |
| `period_id` | uuid | FK → `payroll_periods` |
| `applicator_id` | uuid | FK → `applicators` |
| `applicator_name` | text | Desnormalizado |
| `hours_worked` | numeric | |
| `rate_per_hour` | numeric | |
| `events_count` | integer | |
| `slots_count` | integer | |
| `subtotal` | numeric | |
| `adjustments` | numeric | |
| `total` | numeric | |
| `status` | text | |
| `notes` | text | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

## 7. CENNI

### `cenni_cases`
Expedientes CENNI (certificación nacional de inglés).

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | |
| `folio_cenni` | text | Folio oficial |
| `cliente_estudiante` | text | Nombre del estudiante |
| `celular` | text | |
| `correo` | text | |
| `solicitud_cenni` | boolean | |
| `acta_o_curp` | boolean | |
| `id_documento` | boolean | |
| `certificado` | boolean | |
| `datos_curp` | boolean | |
| `cliente` | text | |
| `estatus` | text | Ver enum de estatus arriba |
| `estatus_certificado` | text | |
| `notes` | text | |
| `fecha_recepcion` | date | |
| `fecha_revision` | date | |
| `motivo_rechazo` | text | |
| `certificate_storage_path` | text | |
| `certificate_uploaded_at` | timestamptz | |
| `certificate_sent_at` | timestamptz | |
| `certificate_sent_to` | text | |
| `deleted_at` | timestamptz | Soft delete |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

## 8. Finanzas Administrativas

### `payment_concepts`
Catálogo de conceptos cobrables.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `concept_key` | text | |
| `description` | text | |
| `cost` | numeric | |
| `currency` | text | `MXN`, `USD` |
| `expiration_date` | date | nullable |
| `created_at` | timestamptz | |
| `is_active` | boolean | Soft delete |

### `payments`
Pagos con referencia (TOEFL, CENNI, otros).

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `concept_id` | uuid | FK → `payment_concepts` |
| `folio` | text | |
| `amount` | numeric | |
| `person_name` | text | |
| `email` | text | |
| `status` | text | `GENERADO`, `PENDIENTE`, `PAGADO`, `CANCELADO` |
| `notes` | text | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |
| `created_by` | uuid | |
| `is_active` | boolean | Soft delete |

### `quotes` (cotizaciones)

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `folio` | text | |
| `provider` | text | |
| `description` | text | |
| `file_path` | text | Ruta en Supabase Storage |
| `status` | text | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |
| `created_by` | uuid | |
| `updated_by` | uuid | |
| `is_active` | boolean | Soft delete |

### `purchase_orders` (órdenes de compra)

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `folio` | text | |
| `quote_id` | uuid | FK → `quotes` (nullable) |
| `provider` | text | |
| `description` | text | |
| `file_path` | text | |
| `status` | text | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |
| `created_by` | uuid | |
| `updated_by` | uuid | |
| `is_active` | boolean | Soft delete |

### `toefl_codes`
Inventario de códigos TOEFL.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `folio` | text | Formato `TFL-YYYYMMDD-HHMMSS-NNN` |
| `test_type` | text | |
| `voucher_code` | text | |
| `status` | text | |
| `assigned_to` | text | |
| `assigned_at` | timestamptz | |
| `expiration_date` | date | |
| `purchase_order_id` | uuid | FK → `purchase_orders` |
| `session_id` | uuid | nullable |
| `candidate_details` | jsonb | nombre, DOB, país, etc. |
| `system_uniq_id` | text | ID único del sistema ETS |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |
| `created_by` | uuid | |
| `is_active` | boolean | Soft delete |

### `toefl_administrations`
Administraciones TOEFL (períodos de aplicación).

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `name` | text | |
| `school_id` | uuid | FK → `schools` |
| `test_date` | date | Alias: `start_date` en API |
| `end_date` | date | |
| `test_type` | text | |
| `expected_students` | integer | |
| `status` | text | |
| `notes` | text | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |
| `created_by` | uuid | |
| `is_active` | boolean | Soft delete |

### `exam_codes`
Inventario general de códigos de examen (no TOEFL).

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `exam_type` | text | |
| `code` | text | |
| `status` | text | |
| `registration_date` | date | |
| `expiration_date` | date | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |
| `created_by` | uuid | |
| `is_active` | boolean | Soft delete |

---

## 9. Caja Chica y Presupuesto

### Motor V2 (canónico)

- **`budget_categories`**, **`budget_items`**, **`budget_lines`**: jerarquía presupuestal por `org_id`; las líneas llevan `fiscal_year`, `month`, `channel` (`fiscal` | `non_fiscal`), `budgeted_amount`, `actual_amount`.
- **`petty_cash_funds`**: fondos por org y año fiscal; `custodian_id`, `initial_amount`, `current_balance`, `status` (`open` | `closed`).
- **`petty_cash_movements`**: movimientos V2 con `fund_id`, `amount_in` XOR `amount_out`, `budget_line_id` obligatorio en egresos, `balance_after`, `replenishment_request_id` opcional.
- **`replenishment_requests`**: solicitudes de reposición; al aprobar, un trigger crea el movimiento de ingreso correspondiente.

La función **`fn_petty_cash_balance(org_id, year)`** devuelve la suma de `current_balance` de fondos abiertos del año (V2).

### `petty_cash_categories`
Catálogo global (sin `org_id`) usado como semilla de nombres y para importaciones legacy; las partidas formales por org están en `budget_categories`.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `name` | text | |
| `slug` | text UNIQUE | |
| `sort_order` | integer | |
| `is_active` | boolean | |
| `created_at` | timestamptz | |

### `petty_cash_settings`
Balance inicial por org/año.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | |
| `year` | integer | |
| `initial_balance` | numeric | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |
| `updated_by` | uuid | |

### `petty_cash_movements` (V2)

Tabla canónica tras `20260326_finance_engine_v2.sql`. La tabla histórica V1 queda como `petty_cash_movements_legacy` si se aplicó la migración.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | |
| `fund_id` | uuid | FK → `petty_cash_funds` |
| `budget_line_id` | uuid | Nullable en ingresos; obligatoria lógica en egresos |
| `replenishment_request_id` | uuid | Opcional |
| `movement_date` | date | |
| `concept` | varchar(255) | |
| `amount_in` / `amount_out` | numeric | XOR: uno > 0 |
| `balance_after` | numeric | Calculado en trigger |
| `receipt_url` | text | |
| `registered_by` | uuid | |
| `approved_by` | uuid | nullable |
| `status` | enum | `posted` \| `cancelled` |
| `metadata` | jsonb | |

### `budgets` / `budgets_legacy`

El modelo mensual antiguo (`budgets`) fue renombrado a **`budgets_legacy`** al aplicar el motor V2. El presupuesto formal por partidas vive en **`budget_lines`** (ver arriba).

| Columna (legacy) | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | |
| `category_id` | uuid | FK → `petty_cash_categories` |
| `month` | integer | 1–12 |
| `year` | integer | |
| `amount` | numeric | |
| `updated_at` | timestamptz | |
| `updated_by` | uuid | |

UNIQUE legacy: `(org_id, category_id, month, year)`.

---

## 10. Documentos (DMS)

### `documents`

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | |
| `module_slug` | text | Slug del módulo al que pertenece |
| `record_id` | uuid | ID del registro asociado (nullable) |
| `file_name` | text | |
| `file_path` | text | Ruta en Storage (`org-documents`) |
| `file_size` | integer | Bytes |
| `mime_type` | text | |
| `tags` | text[] | |
| `uploaded_by` | uuid | FK → `auth.users` |
| `created_at` | timestamptz | |

Bucket: `org-documents`.

---

## 11. Notificaciones

### `notifications`

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | |
| `user_id` | uuid | FK → `auth.users` |
| `type` | text | |
| `title` | text | |
| `body` | text | |
| `link` | text | URL relativa para navegar |
| `module_slug` | text | |
| `is_read` | boolean | Default `false` |
| `created_at` | timestamptz | |

### `notification_templates`

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | |
| `slug` | text | |
| `title_tmpl` | text | Template con `{{variables}}` |
| `body_tmpl` | text | |
| `type` | text | |
| `channel` | text | `in_app`, `email` |
| `created_at` | timestamptz | |

---

## 12. SGC (ISO/QMS) - Fase 1

### `sgc_nonconformities`
No conformidades (NC) con estado, análisis y evaluación de cierre.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | FK → `organizations` |
| `ref` | text | Formato `NC-YYYY-######` |
| `title` | text | nullable |
| `description` | text | Requerido |
| `stage_id` | uuid | FK → `sgc_nc_stages` |
| `status` | text | `draft`, `analysis`, `pending`, `open`, `done`, `cancel` |
| `responsible_user_id` | uuid | FK → `auth.users` |
| `manager_user_id` | uuid | FK → `auth.users` |
| `severity_id` | uuid | FK → `sgc_nc_severities` |
| `analysis` | text | |
| `action_plan_comments` | text | |
| `evaluation_comments` | text | Obligatorio al cerrar |
| `opened_at` | timestamptz | |
| `closed_at` | timestamptz | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `sgc_actions`
Acciones de respuesta (inmediata/correctiva/preventiva/mejora) ligadas a NC y auditorías.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | FK → `organizations` |
| `ref` | text | Formato `ACT-YYYY-######` |
| `title` | text | |
| `type_action` | text | `immediate`, `correction`, `prevention`, `improvement` |
| `stage_id` | uuid | FK → `sgc_action_stages` |
| `status` | text | `draft`, `open`, `in_progress`, `done`, `cancel` |
| `deadline_at` | date | |
| `opened_at` | timestamptz | |
| `closed_at` | timestamptz | |
| `responsible_user_id` | uuid | FK → `auth.users` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `sgc_audits`
Auditorías con checklist de verificación, NC detectadas y oportunidades de mejora.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | FK → `organizations` |
| `ref` | text | Formato `AUD-YYYY-######` |
| `audit_date` | timestamptz | |
| `state` | text | `open`, `done` |
| `audit_manager_id` | uuid | FK → `auth.users` |
| `strong_points` | text | |
| `to_improve_points` | text | |
| `closing_date` | timestamptz | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `sgc_reviews`
Revisión gerencial del SGC con decisiones sobre acciones/NC.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | FK → `organizations` |
| `ref` | text | Formato `REV-YYYY-######` |
| `title` | text | |
| `review_date` | timestamptz | |
| `state` | text | `open`, `done` |
| `policy` | text | |
| `changes` | text | |
| `conclusion` | text | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### Tablas relacionales SGC

- `sgc_nonconformity_actions`
- `sgc_nonconformity_origins`
- `sgc_nonconformity_causes`
- `sgc_audit_auditors`
- `sgc_audit_auditees`
- `sgc_audit_checks`
- `sgc_audit_nonconformities`
- `sgc_audit_improvement_actions`
- `sgc_review_participants`
- `sgc_review_items`

Reglas clave:

- Cierre de NC exige `evaluation_comments` y acciones vinculadas cerradas.
- RLS habilitado en todas las tablas SGC.
- Escritura restringida a `admin/supervisor`.

---

## 13. Auditoría

### `audit_log`
Bitácora de mutaciones en la base de datos.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `table_name` | text | Tabla afectada |
| `record_id` | uuid | ID del registro |
| `operation` | text | `INSERT`, `UPDATE`, `DELETE` |
| `changed_by` | uuid | FK → `auth.users` (nullable si sistema) |
| `changed_at` | timestamptz | |
| `old_data` | jsonb | Estado antes |
| `new_data` | jsonb | Estado después |

Tabla append-only — nunca actualizar ni eliminar registros.

---

## RPCs (funciones de servidor)

| Función | Parámetros | Retorna | Dónde se usa |
|---------|-----------|---------|--------------|
| `fn_petty_cash_balance` | `p_org_id uuid, p_year int` | `numeric` | `/api/v1/finance/petty-cash/balance` |
| `fn_accept_invitation` | `p_token text, p_user_id uuid, p_user_email text` | `jsonb` | `/api/v1/invitations/accept` (admin client) |
| `fn_expire_old_invitations` | | `integer` | `/api/v1/invitations/cleanup` |
| `get_users_emails` | `user_ids uuid[]` | `table(id uuid, email varchar)` | `/api/v1/users` (para mostrar emails) |
| `create_movement_and_update_pack` | pack_id, type, school_id, applicator_id, notes, performed_by | `jsonb` | `/api/v1/scan` |
| `generate_slots_for_event_exam` | event_exam_id | `integer` | Interno — generación de slots |

---

## Supabase Storage Buckets

| Bucket | Uso |
|--------|-----|
| `petty-cash-receipts` | Comprobantes de movimientos de caja chica |
| `org-documents` | Documentos del DMS (`/api/v1/documents`) |

---

## Notas de seguridad

- **RLS habilitado** en todas las tablas de tenant. Nunca deshabilitar en `petty_cash_movements`, `org_members`, `org_invitations`.
- El **admin client** (`src/lib/supabase/admin.ts`) bypasea RLS. Solo para RPCs privilegiadas e invitaciones.
- Soft delete via `deleted_at` (packs, schools, applicators, cenni, petty_cash_movements) o `is_active = false` (payments, toefl_codes, exam_codes, quotes, purchase_orders).

## 14. Finanzas — Viáticos (Travel Expenses)

### `travel_expense_reports`
Reportes de gastos de viaje con presupuesto estimado vs gastos reales.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | FK → `organizations` |
| `payroll_period_id` | uuid | FK → `payroll_periods` (opcional) |
| `employee_name` | text | |
| `destination` | text | |
| `trip_purpose` | text | |
| `start_date` | date | |
| `end_date` | date | |
| `status` | text | `pending`, `approved`, `rejected`, `reimbursed` |
| `amount_requested` | numeric | |
| `amount_approved` | numeric | |
| **Presupuesto (ppto_*)** | numeric | `ppto_aereos`, `ppto_gasolina`, `ppto_taxis`, `ppto_casetas`, `ppto_hospedaje`, `ppto_alimentacion`, `ppto_otros` |
| **Gasto Real (real_*)** | numeric | `real_aereos`, `real_gasolina`, `real_taxis`, `real_casetas`, `real_hospedaje`, `real_alimentacion`, `real_otros` |
| `approved_by` | uuid | FK → `auth.users` |
| `approved_at` | timestamptz | |
| `created_by` | uuid | |
| `created_at` | timestamptz | |

### `travel_expense_receipts`
Comprobantes individuales adjuntos a un reporte.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | |
| `report_id` | uuid | FK → `travel_expense_reports` |
| `file_name` | text | |
| `file_type` | text | pdf, xlsx, etc. |
| `file_url` | text | |
| `amount` | numeric | nullable |
| `uploaded_by` | uuid | |
| `created_at` | timestamptz | |
- `audit_log` es append-only — no modificar registros existentes.

---

## 15. Dashboards Ejecutivos y Observabilidad (propuesto)

La planeacion del dashboard ejecutivo y el modulo de observabilidad (incluyendo tablas opcionales de cache/alertas) vive en:

- `docs/adr/ADR-008-executive-dashboard-and-observability.md`
- `docs/executive-observability/DB_SCHEMA_PROPOSAL.md`
