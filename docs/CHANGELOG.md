# Changelog — LEC Orb

Cambios ordenados de más reciente a más antiguo.

---

## [Unreleased] — PR #14

- fix(join): Server Actions nunca lanzan `throw` — todos los error paths usan `redirect()` con `?error=` URL-encoded para evitar "Application error" en producción

---

## [2026-04-24] — Fixes de entrega de invitaciones

- fix(email): Resend operativo en producción — corregido formato de `RESEND_FROM_EMAIL`
  (`Nombre <email@dominio>`), dominio `updates.luisaguilaraguila.com` verificado
- fix(invitations): `/api/v1/invitations` y `/api/v1/invitations/[id]/resend` propagan
  `emailError` al UI cuando Resend falla, en vez de silenciar el error
- fix(db): `fn_accept_invitation` usa `pg_catalog.btrim` (no `trim`, que no existe en
  `pg_catalog`), castea el enum `member_role → user_role` al insertar en `org_members`,
  y escribe en la columna correcta `operation` de `audit_log`
  (migración `20260424_fix_invitation_accept_audit.sql`)
- fix(db): `fn_audit_log` llena la columna `operation NOT NULL` (además del legacy
  `action`) y hace fallback de `auth.uid()` a `new_data.user_id` cuando el trigger se
  dispara desde un RPC `SECURITY DEFINER`
  (migración `20260424_fix_fn_audit_log_operation.sql`)
- fix(db): `handle_new_user` ya no crea org personal + admin membership cuando el
  usuario se registra con una invitación pendiente — evita el bug de doble fila en
  `org_members` que rompía `.single()` en `getAuthenticatedMember()` con 403 en todas
  las rutas API
  (migración `20260424_handle_new_user_skip_invited.sql`)

---

## [2026-04-23] — PR #13

- fix(join): tipar `params` y `searchParams` como `Promise<{...}>` y hacer `await` — resuelve "Application error" en producción con Next.js 15+
- feat(users): filtro de invitaciones por estado en la UI de gestión de usuarios
- feat(users): botón "Limpiar historial" para eliminar invitaciones no-pendientes en bulk
- feat(invitations): `DELETE /api/v1/invitations/[id]` — eliminar invitación individual (no-pendiente)
- feat(invitations): `DELETE /api/v1/invitations/cleanup` — eliminar todas las no-pendientes de la org

---

## [2026-04-23] — PR #12

- feat(cenni): nuevo enum `cenni_status` con 5 valores: `EN OFICINA`, `SOLICITADO`, `EN TRAMITE/REVISION`, `APROBADO`, `RECHAZADO`
- feat(cenni): nuevos campos `fecha_recepcion DATE`, `fecha_revision DATE`, `motivo_rechazo TEXT`
- feat(cenni): migración `supabase/migrations/20260422_cenni_estatus_and_new_fields.sql`
- fix(join): logs de diagnóstico discriminados: `not_found` / `already_processed` / `server_error`

---

## [2026-04-22] — PR #10

- fix(join): defensive `try/catch` en la inicialización del admin client cuando `SUPABASE_SERVICE_ROLE_KEY` no está configurada — evita crash no controlado

---

## [2026-04-22] — PR #9

- fix(auth): parámetro `?next` preservado correctamente al redirigir a login y register
- fix(auth): `Suspense` wrapper en páginas de login y register para compatibilidad con `useSearchParams` en Next.js 15+
- fix(register): eliminar creación manual de org — el trigger de DB `handle_new_user` ya lo hace automáticamente

---

## [2026-04-21] — PR #7

- feat(invitations): RPC atómica `fn_accept_invitation` con `SECURITY DEFINER` — aceptación segura sin exponer lógica al cliente
- feat(invitations): aislamiento por `service_role` — bypasea RLS de forma controlada
- test: cobertura Vitest extendida a 26 archivos, 143 tests (21/21 módulos API cubiertos)
- docs: `docs/API_MODULES.md` completo con todos los endpoints documentados

---

## [antes de PR #7]

- feat(finance): módulo Caja Chica — CRUD de movimientos, balance vía RPC, comprobantes en Storage, exportación Excel
- feat(finance): módulo Presupuesto — upsert mensual, análisis comparativo presupuesto-vs-real
- feat: módulos operativos — Events (con sesiones y staff), Applicators, TOEFL, Payroll, Schools
- feat: Audit log con paginación y filtros
- feat: Notificaciones por usuario
- feat: Gestor de documentos (DMS) con Storage `org-documents`
- feat: RBAC completo — roles `admin`, `supervisor`, `operador`, `applicator` con permisos por módulo
- feat: Multi-tenant — aislamiento total por `org_id` con RLS en todas las tablas
