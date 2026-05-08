# Roadmap - LEC Orb

Ultima actualizacion: 2026-05-07

---

## Estado verificado el 2026-05-04

- `npm run build`: pass (Exit code: 0)
- `npm test`: pass (`26` archivos, `164` tests)
- `npm run lint`: pass
- `npm run test:e2e`: pass
- **SGC Stabilization**: COMPLETADA (Stats API fixed, NC Detail resilient).
- **Viaticos**: COMPLETADA (Schema verified, API integrated, UI ready).
- **Sprint 4**: 100% COMPLETADO (Cursos + Inventario + SGC Stabilization).
- `npm run test:e2e`: pass (`10/10` + new `travel-expenses` suite)
- Supabase Security Advisor en `hr_profiles`: resuelto con PR #31 (RLS guard)
- **UI/UX Audit**: Pass (Refinamiento "Premium SaaS" completado)
- **Portal de Aplicadores**: Migrado a datos reales (Supabase integration complete)
- **Phase 3**: COMPLETADA (Motor de nómina dinámico + P&L de eventos operativos)
- **Logística**: Nueva tabla `event_staff` para roles (SE, ADMIN, INVIGILATOR, SUPER) integrada
- **Nómina**: Motor de cálculo dinámico implementado vía RPC con soporte para roles y tarifas variables
- **P&L**: Dashboard financiero de eventos conectado a datos reales de staff
- **SGC Navigation**: Resuelto (Fix aplicado y validado)

Diagnostico E2E actual:

- `playwright.config.ts` y el harness E2E quedaron alineados al flujo real de autenticacion
- `tests/e2e/support/demo-api.ts` cubre mocks requeridos para escenarios de finanzas
- los flujos de invitations y finance ya validan correctamente en navegador

---

## Completado

- Multi-tenant auth con aislamiento por `org_id` y RLS
- Flujo completo de invitaciones con RPC atomica y expiracion por `expires_at`
- CENNI con 5 estatus canonicos y campos `fecha_recepcion`, `fecha_revision`, `motivo_rechazo`
- Caja Chica, Presupuesto y **Viáticos** operativos.
- Modulos operativos: Events, Applicators, Schools, TOEFL, Payroll, SGC, RRHH, IH Billing, Cursos e Inventario.
- **Nómina de Eventos (Fase 3)**: Cálculo dinámico por rol y P&L de eventos.
- **SGC Fase 1**: Estabilización técnica de métricas y vistas de detalle.
- Refinamiento Visual "Premium SaaS" y Calculadora 2.0.
- Fix de navegación SGC y scroll de sidebar unificado.

---

## 🏁 Sprint 5: Inteligencia Financiera y P&L (EN CURSO)
**Objetivo:** Consolidar todos los flujos de dinero en un Dashboard Gerencial para la toma de decisiones.

### 1. Dashboard Gerencial (P&L Consolidado)
- [ ] Endpoint `/api/v1/dashboard/finance/pl` para agregación multi-módulo.
- [ ] Integración de ingresos (Ventas/Eventos) y egresos (Nómina/Viáticos/Gastos).
- [ ] Visualización premium de márgenes operativos y tendencia de flujo.

### 2. Automatización de Auditoría SGC
- [ ] Notificaciones automáticas por CAR vencidas.
- [ ] Generación de PDF para reportes de Auditoría Interna.

### 3. Base del módulo Project Management (nuevo)
- [x] ADR del módulo PM documentado (`docs/adr/ADR-007-project-management-module-foundation.md`)
- [x] Diseñar y aplicar migración base `pm_*` con RLS
- [x] Exponer endpoints `/api/v1/pm/*` (projects, boards, tasks)
- [x] Construir UI MVP inicial en `/dashboard/proyectos`
- [x] Fase 1.1: agregar `scope`, `role_target`, `is_private` para tareas por equipo/rol/personal
- [ ] Fase 1.2: formulario UI completo para crear/editar tareas por alcance

---

## Advertencias activas

### 1. Cierre Sprint 2

- Hacer merge de PR #29 (Viaticos)
- Aplicar migracion `20260503_travel_expenses.sql` en Supabase productivo
- Smoke test funcional de flujo Viaticos en dashboard

### 2. Portal de aplicadores

Las vistas de `src/app/(portal)/portal/*` siguen consumiendo `src/lib/demo/data.ts` con `APPLICATOR_ID` hardcoded. Estan construidas, pero no integradas a datos reales.

---

## Prioridad alta

### 1. Cerrar Sprint 2 (IH Billing + Viaticos)

- merge PR #29
- aplicar migracion de Viaticos
- validar alta de solicitudes, aprobacion y comprobantes en entorno real

### 2. Cron para expirar invitaciones

- conectar `fn_expire_old_invitations()` a Vercel Cron diario

### 3. SGC — Estabilización Técnica (COMPLETADO)
- [x] Refactor Mermaid.js (rendering asíncrono robusto)
- [x] Detalle de NC con Timeline real (Audit Log)
- [x] Expansión del registro de procesos (Ventas, Exámenes)
- [x] Build de producción exitoso

- implementar API `/api/v1/sgc/*` con `withAuth` + `logAudit`
- construir UI operativa NC/CAPA/Auditoria/Revision sobre tablas SGC nuevas
- integrar evidencia documental (DMS) en registros SGC
- referencia de trabajo:
  - `docs/SGC_MODULE.md`
  - `docs/SGC_MATRICES.md`
  - `docs/SGC_SPRINT_PLAN.md`
  - `docs/SGC_SPRINT01_EXECUTION_BOARD.md`
  - `docs/BACKLOG_SGC.md`
  - `docs/adr/ADR-005-sgc-domain-model-phase1.md`
  - `docs/adr/ADR-006-sgc-workflow-rules-in-database.md`

### 5. Cierre de gap ERP (benchmark Odoo/ERPNext/ERPcafe)

- cerrar brechas de CRM, Ventas, CxC y Contabilidad como bloque Must
- extender Compras, Inventario, RRHH y BI como bloque Should
- integrar SGC transversalmente con todos los modulos operativos
- referencia:
  - `docs/ERP_GAP_MATRIX_AND_MODULES.md`

---

## Prioridad media

### 1. KPI cards y graficas en Caja Chica

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

---

## 🏁 Sprint 4: Cursos y Ferias de Libros (COMPLETADO)
**Objetivo:** Digitalizar la operación académica y el control logístico de ferias con inventario centralizado.

- [x] **Módulo de Cursos (Académico)**:
    - [x] Esquema DB para cursos, niveles y alumnos.
    - [x] Simulador de Costos y Márgenes (ROI, Punto de Equilibrio).
    - [x] Persistencia de simulaciones (Draft/Published).
- [x] **Módulo de Ferias e Inventario (Logística)**:
    - [x] Almacén Central vs Ubicaciones por Evento/Feria.
    - [x] Sistema de Transferencias/Asignaciones de stock con auditoría.
    - [x] Dashboard de inventario real conectado a Supabase.
