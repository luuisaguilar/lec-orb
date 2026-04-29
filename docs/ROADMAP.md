# Roadmap - LEC Orb

Ultima actualizacion: 2026-04-29

---

## Estado verificado el 2026-04-29

- `npm run build`: pass
- `npm test`: pass (`26` archivos, `164` tests)
- `npm run lint`: pass con `62` warnings
- `npm run test:e2e`: fail (`9/9`)

Diagnostico E2E actual:

- `playwright.config.ts` sigue arrancando `npm run dev` con `NEXT_PUBLIC_DEMO_MODE=true`
- `tests/e2e/support/demo-api.ts` intercepta llamadas API en el navegador
- `src/lib/supabase/proxy.ts` ya no hace bypass de auth por `DEMO_MODE`
- resultado: las rutas `/dashboard/*` redirigen a `/login`, asi que el harness actual quedo desalineado

---

## Completado

- Multi-tenant auth con aislamiento por `org_id` y RLS
- Flujo completo de invitaciones con RPC atomica y expiracion por `expires_at`
- CENNI con 5 estatus canonicos y campos `fecha_recepcion`, `fecha_revision`, `motivo_rechazo`
- Caja Chica y Presupuesto operativos
- Modulos operativos: Events, Applicators, Schools, TOEFL, Payroll
- Audit log, notificaciones y DMS
- Sentry activo en Next.js (`orb-lec`)
- Audit logging migrado a `logAudit()` / `enrichAudit`
- Vitest extendido a `22/22` modulos API cubiertos

---

## Advertencias activas

### 1. Playwright / auth realignment

Los E2E ya no reflejan un estado verde del proyecto. La app compila y los tests unitarios pasan, pero el harness de navegador todavia depende de una estrategia demo que ya no existe en el runtime.

Decision tecnica pendiente:

- sembrar sesion real para un usuario de prueba, o
- crear bootstrap explicito y solo de testing para la sesion E2E

No se recomienda restaurar el bypass implicito en `src/lib/supabase/proxy.ts`.

### 2. Portal de aplicadores

Las vistas de `src/app/(portal)/portal/*` siguen consumiendo `src/lib/demo/data.ts` con `APPLICATOR_ID` hardcoded. Estan construidas, pero no integradas a datos reales.

---

## Prioridad alta

### 1. Realinear Playwright con auth real o bootstrap de test

- login/sesion reproducible para E2E
- flujo `/dashboard/users`
- flujo `/dashboard/finanzas/caja-chica`
- flujo `/dashboard/finanzas/presupuesto`

### 2. Dashboard CENNI por estatus

- cards por cada uno de los 5 estatus
- grafica de distribucion
- filtro rapido por estatus

### 3. Cron para expirar invitaciones

- conectar `fn_expire_old_invitations()` a Vercel Cron diario

---

## Prioridad media

### 4. Sprint 2 - IH Billing + Viaticos

- definir si IH Billing entra por import Excel o captura manual
- definir si Viaticos vive como modulo propio o como extension de Nomina

### 5. KPI cards y graficas en Caja Chica

- resumen ingresos vs egresos por mes
- tendencia de balance
- preview inline de comprobantes

### 6. Staging environment

- proyecto Supabase separado
- org de prueba con seed data
- preview deployment con variables de staging

### 7. Regenerar `database.types.ts` despues de cambios de schema

Si se regeneran tipos desde Supabase CLI en PowerShell:

```bash
npx supabase gen types typescript --project-id <project-id> | Out-File -Encoding utf8 src/types/database.types.ts
```

---

## Prioridad baja

### 8. ADRs adicionales

Continuar `docs/adr/` para decisiones nuevas.

### 9. Limpieza de marca y placeholders

- cambiar los restos de "Language Evaluation Center" por "Languages Education Consulting"
- migrar el portal de aplicadores fuera de `src/lib/demo/data.ts`
