# Onboarding de Usuarios, Puestos y Sedes

Fecha: 2026-05-07 (actualizado: vinculo `hr_profiles` + catalogo de sedes)

## Objetivo

Implementar un onboarding de acceso donde, desde "Invitar usuario", se asigne:

- Rol de sistema (`role`)
- Rol de empresa / puesto (`job_title`, denormalizado desde RRHH cuando aplica)
- Vinculo opcional al perfil de organigrama (`hr_profile_id` → `hr_profiles.id`)
- Sede (`location`)

Y que al aceptar la invitacion se aplique automaticamente al miembro (`org_members`).

## Implementado

### 1) Invitaciones con metadatos de onboarding

- UI: `src/app/(dashboard)/dashboard/users/invite-user-dialog.tsx`
  - **Puesto:** elige un perfil de `/api/v1/hr/profiles` (envia `hr_profile_id`) o **Otro (texto libre)** con `job_title`.
  - **Sede:** opciones desde `/api/v1/org-locations` (sedes activas del catalogo).

- API: `src/app/api/v1/invitations/route.ts`
  - `POST` recibe `hr_profile_id?` (uuid del mismo `org_id`) o `job_title` manual; con perfil HR el servidor guarda `job_title = role_title` del perfil.
  - `location` debe ser sede activa en `org_locations`.

### 2) Aceptacion aplica puesto, vinculo HR y sede

- Migraciones: `20260507_invitation_onboarding_role_location.sql` + `20260522_org_members_invitations_hr_profile_link.sql`
  - `org_invitations` y `org_members` incluyen `hr_profile_id` (FK a `hr_profiles`, `ON DELETE SET NULL`).
  - RPC `fn_accept_invitation` copia `hr_profile_id` y `job_title` (titulo actual del perfil si el vinculo sigue valido; si el perfil ya no existe, solo texto de invitacion).

### 3) UI de join y listados

- `src/app/join/[token]/queries.ts`, `src/app/join/[token]/page.tsx` — resumen de puesto/sede.
- `src/app/(dashboard)/dashboard/users/page.tsx` — columnas en invitaciones; boton **Sedes** (admin).

### 4) Fase 2 — Catalogo dinamico de sedes por organizacion

- Migracion: `supabase/migrations/20260521_org_locations_catalog.sql`
  - Tabla `org_locations` con RLS (lectura: miembros del tenant; escritura: solo `admin`).
  - Semilla: `SONORA`, `BAJA CALIFORNIA`, `NUEVO LEON` por organizacion (si faltan).
  - Importa textos distintos ya usados en `org_members` / `org_invitations`.

- API: `src/app/api/v1/org-locations/route.ts`, `src/app/api/v1/org-locations/[id]/route.ts`
- Validacion: `src/lib/org/validate-location.ts` (invitaciones y `PATCH /users/[id]`).
- Admin UI: `src/components/users/manage-org-locations-dialog.tsx`
- Edicion de usuario: `src/components/users/edit-user-dialog.tsx` — perfil HR + sede del catalogo; texto libre sin perfil opcional.

## Flujo funcional

1. Admin configura sedes (opcional: usar semilla o agregar/editar en **Sedes**).
2. Admin invita: elije sede activa del catalogo.
3. El invitado acepta en `/join/[token]`.
4. Queda `org_members` con rol, `hr_profile_id` (si aplica), `job_title` y `location`.

## Siguiente fase sugerida

### A) Guias en dashboard (product tours)

- Checklist por rol, o libreria tipo `driver.js` / `react-joyride`.

## Consideraciones tecnicas

- `fn_accept_invitation` corre con `service_role`.
- Si el usuario ya era miembro, la invitacion se marca aceptada y no reescribe su perfil.
- `location` en DB sigue siendo texto igual al `name` en `org_locations` (coincidencia exacta al asignar).
