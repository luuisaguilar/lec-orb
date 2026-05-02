# Roadmap - LEC Orb

Ultima actualizacion: 2026-05-02

---

## Estado verificado el 2026-05-02

- `npm run build`: pass
- `npm test`: pass (`26` archivos, `164` tests)
- `npm run lint`: pass
- `npm run test:e2e`: pass (`10/10`)
- Supabase Security Advisor en `hr_profiles`: resuelto con PR #31 (RLS guard)

Diagnostico E2E actual:

- `playwright.config.ts` y el harness E2E quedaron alineados al flujo real de autenticacion
- `tests/e2e/support/demo-api.ts` cubre mocks requeridos para escenarios de finanzas
- los flujos de invitations y finance ya validan correctamente en navegador

---

## Completado

- Multi-tenant auth con aislamiento por `org_id` y RLS
- Flujo completo de invitaciones con RPC atomica y expiracion por `expires_at`
- CENNI con 5 estatus canonicos y campos `fecha_recepcion`, `fecha_revision`, `motivo_rechazo`
- Caja Chica y Presupuesto operativos
- Modulos operativos: Events, Applicators, Schools, TOEFL, Payroll, SGC, RRHH, IH Billing
- Audit log, notificaciones y DMS
- Sentry activo en Next.js (`orb-lec`)
- Audit logging migrado a `logAudit()` / `enrichAudit`
- Vitest extendido a `22/22` modulos API cubiertos
- Viaticos MVP implementado (PR #29 abierto)

---

## Advertencias activas

### 1. Cierre Sprint 2

- Hacer merge de PR #29 (Viaticos)
- Aplicar migracion `20260503_travel_expenses.sql` en Supabase productivo
- Smoke test funcional de flujo Viaticos en dashboard

### 2. Portal de aplicadores

Las vistas de `src/app/(portal)/portal/*` siguen consumiendo `src/lib/demo/data.ts` con `APPLICATOR_ID` hardcoded. Estan construidas, pero no integradas a datos reales.

### 3. SGC crash en flujo basico

- RRHH ya valida lectura/alta/edicion sin alertas de seguridad.
- SGC fix en progreso via PR #32; pendiente validacion final post-merge.

---

## Prioridad alta

### 1. Cerrar Sprint 2 (IH Billing + Viaticos)

- merge PR #29
- aplicar migracion de Viaticos
- validar alta de solicitudes, aprobacion y comprobantes en entorno real

### 2. Cron para expirar invitaciones

- conectar `fn_expire_old_invitations()` a Vercel Cron diario

### 3. Validar cierre tecnico SGC + Sidebar

- merge PR #32 (hardening SGC + scroll vertical sidebar)
- smoke test manual en `/dashboard/sgc` (tabs procesos/auditoria/riesgos)
- validar navegacion completa de modulos en desktop y mobile

---

## Prioridad media

### 3. Sprint 3 - Logistica de eventos + Nomina real

- rol por aplicador por evento (SE/ADMIN/INVIGILATOR/SUPER)
- nomina dinamica por rol y tabla de duracion
- P&L por sesion (IH - nomina - viaticos)

### 4. KPI cards y graficas en Caja Chica

- resumen ingresos vs egresos por mes
- tendencia de balance
- preview inline de comprobantes

### 5. Staging environment

- proyecto Supabase separado
- org de prueba con seed data
- preview deployment con variables de staging

### 6. Regenerar `database.types.ts` despues de cambios de schema

Si se regeneran tipos desde Supabase CLI en PowerShell:

```bash
npx supabase gen types typescript --project-id <project-id> | Out-File -Encoding utf8 src/types/database.types.ts
```

---

## Prioridad baja

### 7. ADRs adicionales

Continuar `docs/adr/` para decisiones nuevas.

### 8. Limpieza de marca y placeholders

- cambiar los restos de "Language Evaluation Center" por "Languages Education Consulting"
- migrar el portal de aplicadores fuera de `src/lib/demo/data.ts`
