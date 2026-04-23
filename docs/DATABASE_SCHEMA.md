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
| cenni `estatus` (text) | `EN OFICINA`, `SOLICITADO`, `EMITIDO`, `ENVIADO`, `ENTREGADO`, `RECHAZADO`, `CANCELADO` |

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

### `petty_cash_categories`
Catálogo compartido para movimientos y presupuesto.

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

### `petty_cash_movements`
Transacciones de caja chica.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | |
| `category_id` | uuid | FK → `petty_cash_categories` |
| `date` | date | |
| `concept` | text | |
| `type` | text | `INCOME` \| `EXPENSE` |
| `amount` | numeric | |
| `partial_amount` | numeric | nullable |
| `receipt_url` | text | URL en bucket `petty-cash-receipts` |
| `notes` | text | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |
| `created_by` | uuid | |
| `updated_by` | uuid | |
| `deleted_at` | timestamptz | Soft delete |

RLS habilitado. Tenant-scoped por `org_id`. **Nunca deshabilitar RLS.**

### `budgets`
Presupuesto mensual por categoría.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `org_id` | uuid | |
| `category_id` | uuid | FK → `petty_cash_categories` |
| `month` | integer | 1–12 |
| `year` | integer | |
| `amount` | numeric | |
| `updated_at` | timestamptz | |
| `updated_by` | uuid | |

UNIQUE: `(org_id, category_id, month, year)`. Upsert con este constraint.

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

## 12. Auditoría

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
- `audit_log` es append-only — no modificar registros existentes.
