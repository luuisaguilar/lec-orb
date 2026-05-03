# Changelog - LEC Orb

Cambios ordenados de mas reciente a mas antiguo.

---

## [2026-05-03] - Sprint 4: Academic & Logistics Modules (Hardening)

- feat(courses): implemented Course Simulator with financial projections (ROI, Break-even, CAC).
- feat(courses): added persistence for course simulations (Draft/Published) and naming support.
- feat(inventory): implemented real-time Inventory Dashboard connected to Supabase.
- feat(inventory): added stock transfer workflow with a premium Dialog modal for moving items between warehouse and fairs.
- feat(api): new endpoints for `api/v1/courses`, `api/v1/inventory`, `api/v1/inventory/locations`, and `api/v1/inventory/transfers`.
- feat(db): new migration `20260510_sprint_4_courses_inventory.sql` with schema for courses, items, locations, stock, and transactions.
- feat(ui): integrated `courses` and `inventory` modules into sidebar with dynamic reordering (Settings always at bottom).
- fix(ui): resolved missing components issues by implementing a custom `Slider` and fixing icon imports.
- refactor(api): unified audit logging and authentication handlers across new modules.


## [2026-05-03] - SGC Phase 1: ISO/QMS data model + documentation

- feat(db): nueva migracion `20260510_sgc_phase1.sql` con modelo SGC multi-tenant (NC, acciones, auditorias, revisiones, catalogos y tablas relacionales).
- feat(db): RLS habilitado en todas las tablas SGC con lectura para miembros de la org y escritura para roles `admin/supervisor`.
- feat(db): reglas de negocio en DB para flujo NC/CAPA (cierre de NC requiere evaluacion y acciones cerradas; control de transiciones de acciones).
- feat(db): triggers de `updated_at` y `fn_audit_log` aplicados al bloque SGC para trazabilidad.
- docs(sgc): nuevo documento `docs/SGC_MODULE.md` con alcance, arquitectura y roadmap de implementacion.
- docs(sgc): nueva matriz de decision y trazabilidad `docs/SGC_MATRICES.md`.
- docs(sgc): nuevo plan de ejecucion por sprint con estimaciones `docs/SGC_SPRINT_PLAN.md`.
- docs(sgc): nuevo tablero operativo de ejecucion para Sprint 01 `docs/SGC_SPRINT01_EXECUTION_BOARD.md`.
- docs(adr): nuevos ADRs `ADR-005` (modelo de dominio SGC) y `ADR-006` (reglas de workflow en DB).
- docs(backlog): nuevo backlog operativo `docs/BACKLOG_SGC.md` con epicas, historias y criterios de aceptacion.
- docs(roadmap): `docs/ROADMAP.md` actualizado con linea de ejecucion para convertir SGC Fase 1 en operacion real.
- docs(schema): `docs/DATABASE_SCHEMA.md` actualizado con seccion SGC (tablas principales y reglas).
- docs(erp): nueva matriz GAP ERP y funcionalidades por modulo `docs/ERP_GAP_MATRIX_AND_MODULES.md` (benchmark Odoo/ERPNext/ERPcafe).

## [2026-05-03] - Phase 3: Event Payroll Engine & Financial P&L Integration

- feat(payroll): implemented Phase 3 calculation engine via `fn_calculate_payroll_for_period` RPC for dynamic staff payments.
- feat(payroll): added `payroll_line_items` table for granular tracking of applicator roles, hours, and payments per event.
- feat(payroll): updated Dashboard with "Recalculate" workflow, toast notifications, and role-based breakdown.
- feat(events): integrated real staff costs into the "Financials & P&L" tab, replacing static placeholders with live payroll data.
- feat(api): updated `/api/v1/payroll` to support manual recalculation and detailed role aggregation.
- fix(routes): resolved Next.js dynamic path conflict by consolidating event sub-routes under standard `[id]` slug.
- feat(db): future-proofed payroll schema with `type` and `category` fields for upcoming administrative payroll integration.

## [2026-05-02] - UI/UX Polish: Premium SaaS Refinement & Calculadora 2.0

- feat(ui): major visual refinement pass focused on "Premium SaaS" aesthetics (glassmorphism, dark mode polish, consistent contrast).
- feat(calculadora): implemented dynamic exam-based theming (Starters, Movers, Flyers, KEY, PET, FCE) with custom color tokens and glows.
- feat(calculadora): refactored layout for visual symmetry, spacious glassmorphic containers, and reordered metric hierarchy (bottom-aligned icons).
- fix(sgc): resolved critical navigation crash in `/dashboard/sgc` and improved sidebar scroll behavior.
- fix(users): enhanced "Invitar Usuario" CTA visibility and permissions table readability.
- fix(ui): hardened button contrast and text hierarchy across login, register, and dashboard forms.
- feat(build): verified project stability with `npm run build` (Exit code: 0).
- docs(status): updated `HANDOFF.md`, `ROADMAP.md`, and `CHANGELOG.md` to reflect the "Premium SaaS" state.

---

## [2026-05-02] - sprint-2 sync: e2e green + viaticos mvp

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
