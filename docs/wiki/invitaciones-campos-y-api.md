---
title: "Invitaciones — campos obligatorios y contrato API"
slug: invitaciones-campos-y-api
date: 2026-05-09
updated: 2026-05-14
tags: [wiki, invitations, rbac, onboarding, zod, org_locations]
status: active
audience: [engineering]
related_components:
  - invitations-api
  - org-locations
  - hr_profiles
---

# Invitaciones: campos obligatorios y contrato `POST /api/v1/invitations`

## Por qué cambió el contrato

Las invitaciones deben **anclar al usuario a una sede** (`org_locations`) y a un **puesto** coherente con RRHH (perfil HR) o un **rol empresa** explícito. Sin eso, el alta en la org es ambigua para permisos, reportes y onboarding. Por eso el cuerpo del `POST` dejó de ser solo `email` + `role`.

## Cómo valida el servidor (orden real)

Todo ocurre en `src/app/api/v1/invitations/route.ts`:

1. **`inviteSchema` (Zod)** — Si falla → **400** `Datos invalidos` + `details` flatten. Aquí no se ha comprobado aún si el caller es admin.
2. **Rol miembro** — Si no es `admin` → **403** `Forbidden: Admins only`.
3. **`isAssignableOrgLocation`** — Comprueba que `location` (nombre exacto) exista en `org_locations` para `org_id`, `is_active = true`. Si no → **400**.
4. **`resolveInviteJobFields`** — Resuelve `job_title` final y `hr_profile_id` permitidos para insert. Si perfil HR inválido o sin título → **400** con mensaje específico.
5. **`insert` en `org_invitations`** — Incluye `job_title`, `hr_profile_id`, `location`, etc.
6. **Email opcional** — `sendInvitationEmail` si `sendEmail` es true; la respuesta puede incluir `emailSent` / `emailError`.

**Implicación para tests y clientes:** un `POST` sin `location` o sin puesto (ni `job_title` ni `hr_profile_id`) **siempre** devuelve **400** antes que **403**, aunque el usuario no sea admin.

## Esquema Zod (referencia)

Campos del objeto JSON:

| Campo | Tipo | Notas |
|-------|------|--------|
| `email` | string email | Obligatorio. |
| `role` | enum | `admin` \| `supervisor` \| `operador` \| `applicator`. |
| `sendEmail` | boolean | Opcional; default `true`. |
| `location` | string 1–200 | Obligatorio; debe coincidir con nombre en catálogo de sedes. |
| `job_title` | string ≤200 | Opcional si hay `hr_profile_id`; si no hay perfil, el texto debe ser no vacío tras trim (rol empresa). |
| `hr_profile_id` | UUID opcional | Vacío/`""`/`__custom__` se normaliza a ausente. Si está, debe existir en `hr_profiles` para la org. |
| `expiresInDays` | int 1–60 | Opcional; caducidad personalizada. |

**Regla cruzada (`superRefine`):** debe existir **al menos uno** de `hr_profile_id` válido en cliente **o** `job_title` con texto tras trim.

## Funciones de soporte

| Función | Archivo | Responsabilidad |
|---------|---------|-----------------|
| `isAssignableOrgLocation` | `src/lib/org/validate-location.ts` | Match exacto por nombre de sede activa. |
| `resolveInviteJobFields` | `src/lib/invitations/resolve-invite-job.ts` | Si hay `hr_profile_id`, toma `role_title` del perfil; si no, usa `job_title` manual. |

## Respuestas HTTP típicas

| Código | Cuándo |
|--------|--------|
| 200 | Invitación creada; cuerpo incluye `invitation`, `joinUrl`, y si aplica `emailSent` / `emailError`. |
| 400 | Validación Zod, sede inválida, o resolución de puesto fallida. |
| 403 | Miembro autenticado pero no admin. |

## Vincular un aplicador existente al invitar

**Caso de uso:** la organización ya tiene un row en `applicators` (el aplicador fue cargado en el directorio antes de tener cuenta en la plataforma). Al invitarlo, se quiere que su row del directorio quede vinculado a la cuenta nueva — no que se cree un row duplicado.

### Flujo completo

1. **Dialog** (`src/app/(dashboard)/dashboard/users/invite-user-dialog.tsx`): cuando el admin elige `role = applicator`, aparece el select **"Vincular con aplicador existente"** poblado desde `GET /api/v1/applicators` y filtrado a los que tienen `auth_user_id IS NULL` (aún sin cuenta).
2. Al seleccionar uno, el correo se **autollena** y queda readonly con un botón "Cambiar".
3. El payload del `POST /api/v1/invitations` incluye `applicator_id: <uuid>`.
4. El backend valida que el applicator:
   - Existe y pertenece al `org_id` del caller.
   - No está eliminado (`deleted_at IS NULL`).
   - No tiene `auth_user_id` (no está ya vinculado a una cuenta).
   - Su email coincide con el de la invitación (defensa en profundidad).
5. La fila de `org_invitations` se persiste con `applicator_id` lleno.
6. Cuando el aplicador acepta en `/join/[token]`, el RPC `fn_accept_invitation` aplica esta resolución por orden:
   - **Paso 1 — binding explícito por ID** (preferido): si `invitation.applicator_id IS NOT NULL`, hace `UPDATE applicators SET auth_user_id = p_user_id WHERE id = invitation.applicator_id AND org_id = ... AND auth_user_id IS NULL`. Si actualiza una fila, marca `v_bound_by_id = true` y registra en audit log.
   - **Paso 2 — match por email** (fallback legacy): si paso 1 no aplicó o no actualizó nada, busca por `lower(btrim(email)) = lower(btrim(p_user_email))`.
   - **Paso 3 — INSERT** (último recurso): si ni binding por ID ni email match encontraron, crea un row nuevo en `applicators`.

### Esquema actualizado de `org_invitations`

Columna agregada (migración `20260613_org_invitations_applicator_id.sql`):

| Columna | Tipo | Notas |
|---------|------|-------|
| `applicator_id` | `uuid` nullable | FK `applicators(id)` con `ON DELETE SET NULL`. Indexado parcialmente para `WHERE applicator_id IS NOT NULL`. |

### Esquema Zod actualizado

| Campo | Tipo | Notas |
|-------|------|-------|
| `applicator_id` | UUID opcional | Solo válido si `role === "applicator"`. Validación cruzada en `superRefine`. |

### Validaciones del servidor (orden real)

Insertadas tras `resolveInviteJobFields` y antes del `insert` en `org_invitations`:

1. Si `applicator_id` está presente:
   - **404/400** si no existe o pertenece a otra org.
   - **409** si ya tiene `auth_user_id` (otro usuario ya lo reclamó).
   - **400** si el email del aplicador no coincide con el email de la invitación.
2. Si todo OK → `inviteApplicatorId = applicator.id` y se persiste en el insert.

### Migraciones

| Archivo | Acción |
|---------|--------|
| `20260613_org_invitations_applicator_id.sql` | Agrega columna `applicator_id` + index parcial + comentario. |
| `20260613_fn_accept_invitation_bind_by_id.sql` | Reemplaza `fn_accept_invitation` con la resolución de 3 pasos (ID → email → insert) y registra `applicator_id` + `bound_by_id` en audit log. |

### Garantías

- **Retrocompatible:** invitaciones existentes sin `applicator_id` siguen funcionando por email match (lógica histórica intacta).
- **Default "Crear cuenta nueva":** si el admin no selecciona aplicador, el payload no incluye `applicator_id` y el flujo es el mismo de siempre.
- **Idempotente:** si el aplicador ya está vinculado por otra ruta, el binding por ID no actualiza nada (el `WHERE auth_user_id IS NULL` lo protege) y el flujo cae al email match.
- **Defensa en profundidad:** doble validación de email (servidor antes de insert + RPC al aceptar) previene cross-account binding.
- **Audit trail:** `audit_log.new_data.applicator_id` y `bound_by_id` permiten saber qué invitaciones se vincularon por ID vs por email.

### Riesgos residuales

- **El aplicador acepta con un email distinto al del directorio** → el RPC retorna `EMAIL_MISMATCH` (la página `/join/[token]` ya tiene UI para corregir, ver `actions.ts → signOutForInvite`).
- **El aplicador es borrado entre invitar y aceptar** → la FK con `ON DELETE SET NULL` deja `invitation.applicator_id = NULL` y el RPC cae al email match / insert.

---

## Integración con onboarding

Guía extendida de flujos y copy: [ONBOARDING_INVITACIONES_Y_GUIAS](../ONBOARDING_INVITACIONES_Y_GUIAS.md).

Decisión histórica RPC / invitaciones: [ADR-001](../adr/ADR-001-invitation-rpc.md).

## Pruebas automatizadas

Los casos en `src/tests/api/invitations.test.ts` deben enviar **`location`** y **`job_title`** (o mockear `resolveInviteJobFields` / `isAssignableOrgLocation`) para cubrir 200/403; de lo contrario solo se ejercita el camino 400 de validación.

## Ver también

- [Índice Wiki](./README.md)
- [Mapa de documentación (MOC)](../index.md)

---

*Documento técnico; mantener sincronizado si cambia `inviteSchema` o políticas de sede/puesto.*
