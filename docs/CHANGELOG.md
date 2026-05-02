# Changelog - LEC Orb

Cambios ordenados de mas reciente a mas antiguo.

---

## [2026-05-02] - sprint-2 sync: e2e green + viaticos mvp

- test(e2e): suite Playwright estabilizada y en verde (`10/10`)
- feat(finance): modulo Viaticos MVP con dashboard, API y migracion `20260503_travel_expenses.sql` (PR #29)
- feat(finance): IH Billing ya operativo (sesiones, facturas, pagos, conciliacion e import)
- docs(status): `HANDOFF.md`, `docs/ROADMAP.md` y `docs/TESTING_GUIDE.md` actualizados con estado real al 2026-05-02

---

## [2026-04-29] - docs: sync project status after live verification

- docs(status): `README.md`, `HANDOFF.md` y `docs/ROADMAP.md` actualizados para reflejar el estado verificado el 2026-04-29
- docs(testing): documentado que `npm run build` y `npm test` pasan, `npm run lint` pasa con warnings, y `npm run test:e2e` falla `9/9`
- docs(e2e): aclarado que el harness legacy de Playwright sigue esperando acceso al dashboard antes de auth, pero la app ahora redirige a `/login`
- docs(demo): aclarado que `NEXT_PUBLIC_DEMO_MODE=true` ya no hace bypass de auth/API en runtime productivo; `src/lib/demo/*` queda para fixtures y vistas placeholder
- docs(readme): corregido link roto del roadmap

---

## [2026-04-28] - auditoria integral: correcciones criticas e importantes

- fix(db): sincronizado `docs/DATABASE_SCHEMA.md` con migracion `20260428_org_invitations_expires_at.sql`
- refactor(audit): eliminados inserts manuales a `audit_log` en rutas CENNI; reemplazados por `logAudit()` / `enrichAudit`
- refactor(tests): eliminados tipos `any` en `src/tests/api/` relevantes; reemplazados con interfaces tipadas
- coverage: `164` tests pasando en `26` archivos

---

## [Unreleased] - PR #14

- fix(join): Server Actions nunca lanzan `throw`; todos los error paths usan `redirect()` con `?error=` URL-encoded para evitar "Application error" en produccion

---

## [2026-04-24] - fixes de entrega de invitaciones

- fix(email): Resend operativo en produccion con `RESEND_FROM_EMAIL` corregido y dominio verificado
- fix(invitations): `/api/v1/invitations` y `/api/v1/invitations/[id]/resend` propagan `emailError` al UI cuando Resend falla
- fix(db): `fn_accept_invitation` usa `pg_catalog.btrim`, castea `member_role -> user_role` y escribe en `audit_log.operation`
- fix(db): `fn_audit_log` llena `operation NOT NULL` y hace fallback de `auth.uid()` a `new_data.user_id`
- fix(db): `handle_new_user` ya no crea org personal + admin membership cuando el usuario llega por invitacion pendiente

---

## [2026-04-23] - PR #13

- fix(join): `params` y `searchParams` tipados como `Promise<{...}>` con `await`
- feat(users): filtro de invitaciones por estado en la UI
- feat(users): boton "Limpiar historial" para eliminar invitaciones no pendientes en bulk
- feat(invitations): `DELETE /api/v1/invitations/[id]`
- feat(invitations): `DELETE /api/v1/invitations/cleanup`

---

## [2026-04-23] - PR #12

- feat(cenni): nuevo enum `cenni_status` con `EN OFICINA`, `SOLICITADO`, `EN TRAMITE/REVISION`, `APROBADO`, `RECHAZADO`
- feat(cenni): nuevos campos `fecha_recepcion`, `fecha_revision`, `motivo_rechazo`
- feat(cenni): migracion `supabase/migrations/20260422_cenni_estatus_and_new_fields.sql`
- fix(join): logs de diagnostico discriminados: `not_found`, `already_processed`, `server_error`

---

## [2026-04-22] - PR #10

- fix(join): `try/catch` defensivo en la inicializacion del admin client cuando falta `SUPABASE_SERVICE_ROLE_KEY`

---

## [2026-04-22] - PR #9

- fix(auth): parametro `?next` preservado correctamente al redirigir a login y register
- fix(auth): wrapper `Suspense` en login y register para compatibilidad con Next.js 15+
- fix(register): eliminada la creacion manual de org; el trigger `handle_new_user` ya lo hace

---

## [2026-04-21] - PR #7

- feat(invitations): RPC atomica `fn_accept_invitation` con `SECURITY DEFINER`
- feat(invitations): aislamiento controlado via `service_role`
- test: cobertura Vitest extendida a `26` archivos y `143` tests en ese momento
- docs: `docs/API_MODULES.md` completado con endpoints documentados

---

## [antes de PR #7]

- feat(finance): Caja Chica con CRUD, balance por RPC, comprobantes y exportacion Excel
- feat(finance): Presupuesto con upsert mensual y analisis comparativo
- feat: modulos operativos para Events, Applicators, TOEFL, Payroll y Schools
- feat: Audit log con paginacion y filtros
- feat: notificaciones por usuario
- feat: DMS con Storage `org-documents`
- feat: RBAC completo con roles `admin`, `supervisor`, `operador`, `applicator`
- feat: aislamiento multi-tenant total por `org_id`
