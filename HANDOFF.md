# Handoff - LEC Orb

Resumen ejecutivo del estado del proyecto. Para contexto tecnico completo ver `CLAUDE.md`.

**Repo canonico:** `lec-orb` | **Ultima actualizacion:** 2026-05-14 (CRM activities + Applicator explicit binding + invitation email-mismatch UX) |

---

## Estado actual

| Area | Estado |
|------|--------|
| Build / Typecheck | Pass sin errores (`npm run build`) |
| ESLint | Pass (`0` errores) |
| Vitest (unit/integration) | `40` archivos, `259` tests, `255` passing — 4 fallas pre-existentes en `sgc-permissions` / `coordinacion-proyectos` |
| Playwright (E2E) | Pass (`10/10`) |
| **RBAC / Permisos** | **AUDITADO** - Fix alias resolution, module_registry gaps corregidos |
| **Portal Aplicadores** | **COMPLETADO + VALIDADO** - Flujo e2e probado en producción. Nómina desglosada, auto-link por email y binding explícito por `applicator_id` funcionales. |
| **CRM** | **ACTIVO** - Kanban pipeline, contactos, oportunidades, actividades (filtros, completar, eliminar), API paginada |
| **Invitaciones** | **MEJORADO** - Binding explícito de aplicadores por `applicator_id` + fix UX de email mismatch en `/join/[token]` |
| **Portal Escuelas** | **PLANEADO** - Escuelas piden acceso, alcance por definir |
| Finance - Nómina Operativa | **COMPLETADO** - Motor dinámico, P&L real, recalculo |
| Finance - Viáticos | **COMPLETADO** - Módulo integrado, esquema verificado, UI operativa |
| Finance - Caja Chica | CRUD + balance RPC + Excel export/import |
| Finance - Presupuesto (POA) | Tabla `poa_lines` operativa |
| Finance - Dashboard P&L | **EN DESARROLLO** - Consolidación de ingresos/egresos |
| SGC (Calidad) | **COMPLETADO** - Estabilización técnica (Stats API + Timeline NC resiliente) |
| Cursos e Inventario | **COMPLETADO** - Simulador ROI + Control de stock multi-ubicación |
| Project Management | **EN DESARROLLO** - MVP DB/API/UI activo + scope team/role/personal |
| Dashboard diferenciado por rol | **DIFERIDO** - Diseño documentado en `.codex-review/` |

---

## Roadmap

| Sprint | Estado | Notas |
|--------|--------|-------|
| Sprint 1: Estabilización | Completado | Auth, CENNI, Caja Chica base. |
| Sprint 2: IH Billing | Completado | Facturación, CxC, Viáticos. |
| Sprint 3: Nómina y Eventos | Completado | Pulido visual, auditoría y portal de aplicadores terminados al 100%. |
| Sprint 4: Cursos y Ferias | Completado | Simulador financiero + Inventario + SGC Stabilization. |
| Sprint 5: Dashboard Gerencial | **En curso** | Consolidación de P&L de todos los módulos financieros. |

---

## La empresa: Languages Education Consulting (LEC)

Centro examinador de idiomas (Cambridge, TOEFL, CENNI) con presencia en Sonora, Baja California y Nuevo Leon.

**Cadena Cambridge (ingreso principal):**
```
Cambridge Assessment / Sistema Uno
    -> International House (IH)
        -> LEC (aplica examenes, factura a IH)
            -> Escuelas (confirman fechas + alumnos)
```

**Flujo de cobro:**
1. LEC aplica examen en la escuela (fecha + alumnos reales)
2. LEC agrupa sesiones del mes en factura mensual -> envia a IH
3. IH paga por transferencia (con frecuentes diferencias de 1-2 alumnos)
4. LEC concilia: aplicado vs pagado -> saldo pendiente por escuela
5. Seguimiento de CxC por antiguedad

---

## Sprint 4 — Cursos y Ferias de Libros (COMPLETADO)

### Objetivo
Digitalizar la operación académica y el control logístico de ferias con inventario centralizado.

### Componentes clave
- **Módulo de Cursos**: 
  - Esquema DB para cursos, niveles y alumnos.
  - Simulador de Costos y Márgenes (ROI, Punto de Equilibrio).
  - Persistencia de proyecciones (Draft/Published).
- **Módulo de Ferias e Inventario**:
  - Almacén Central (Maestro) vs Ubicaciones por Evento/Feria.
  - Sistema de Transferencias/Asignaciones de stock con auditoría.
  - Dashboard de inventario real conectado a Supabase.

---

## Sprint 2 — IH Billing (detalle)

### Que hace el modulo

Registra sesiones de examen aplicadas por escuela, las agrupa en facturas, registra los pagos
de IH y calcula automaticamente el saldo pendiente con alertas de antiguedad.

### Tablas propuestas

```sql
ih_sessions   -- sesion por sesion: escuela, examen, fecha, alumnos, tarifa, conciliacion vs IH
ih_invoices   -- facturas mensuales emitidas a IH
ih_payments   -- pagos recibidos de IH
ih_tariffs    -- catalogo de tarifas por examen/ano (editable)
```

### Excels que lo reemplazarian

| Archivo | Ruta |
|---------|------|
| DESGLOSE 2025-2026.xlsx | `C:\Users\luuis\Documents\Proyectos\LEC\REPORTES\` |
| PAGOS IH LEC v1.xlsx | `C:\Users\luuis\Documents\Proyectos\LEC\REPORTES\` |

### Decisiones de Sprint 2 cerradas con Luis

- IH: import + captura manual
- Adjuntar comprobantes IH (Excel/PDF)
- PDF de factura en plataforma movido a Sprint 3
- Viaticos como modulo separado, vinculado a Nomina

---

## Sprint 3 — Logistica de eventos y Nomina real

### Que falta

Hoy la logistica de cada evento Cambridge esta en `LOGISTICA_UNOi 2026.xlsx`:
- Rol del aplicador por evento (SE / ADMIN / INVIGILATOR / SUPER)
- Tabla de duracion: N alumnos + tipo examen -> cuantos SEs + cuantas horas
- Nomina: horas x tarifa por rol (no por aplicador individual)
- P&L por sesion: ingreso IH - nomina - viaticos = comision LEC

### Tablas propuestas

```sql
applicator_event_roles   -- aplicador + evento + rol + horas + tarifa + viaticos
duration_lookup          -- tipo examen + rango alumnos -> n_SEs + horas (catalogo editable)
applicator_role_tariffs  -- tarifa por rol por ano (SE, ADMIN, INVIGILATOR, SUPER)
```

---

## Dashboard Ejecutivo + Observabilidad (estado actual)

### Completado (MVP base)

- [x] Documentacion integral del frente en `docs/executive-observability/`
  - `README.md`, `SCREENS_AND_KPIS.md`, `BACKLOG_MVP_V2.md`
  - `HANDOFF_DASHBOARDS.md`, `RUNBOOK_DASHBOARD_OBSERVABILITY.md`
  - `PATHS_AND_ROUTES.md`, `TICKETS_SPRINT_BOARD.md`
  - `DB_SCHEMA_PROPOSAL.md`, `KPI_MATRIX_BY_ROLE.md`
- [x] ADR de arquitectura publicado: `docs/adr/ADR-008-executive-dashboard-and-observability.md`
- [x] API inicial implementada: `GET /api/v1/executive/overview`
- [x] Rutas UI navegables implementadas:
  - `/dashboard/executive` + subrutas (`finanzas`, `operacion`, `riesgo`)
  - `/dashboard/ops/observability` + subrutas (`logs`, `errors`, `apis`, `audit`)

### Pendiente inmediato (siguiente iteracion)

- [ ] Conectar `Finanzas` a endpoint agregado dedicado (`/api/v1/executive/finanzas`)
- [ ] Implementar primer endpoint tecnico real de observabilidad (`/api/v1/ops/audit`)
- [ ] Cerrar definiciones de fuente para `Ingresos MTD` (facturado vs cobrado)
- [ ] Activar filtros globales (periodo / unidad) en todas las vistas ejecutivas

---

## Proximos pasos concretos

### Alta prioridad

- [x] Auditoría RBAC completa + fix alias resolution en `checkServerPermission`
- [x] Migración `20260514_fix_module_registry_gaps.sql` aplicada (suppliers, documents slug)
- [x] Validación E2E del **Portal de Aplicadores** en producción (`orb.lec.mx/portal`)
- [x] Consolidación de **Nómina Histórica** (Feb/Mar) con desgloses expandibles
- [x] Fix **CRM Pipeline**: visibilidad de oportunidades restaurada (fix property mapping)
- [x] Fix org aislada de Diana (`dsuastegui@lec.mx`) — movida a LEC org como `admin`
- [x] Fix auth flow: Supabase email confirmation desactivado (plataforma es invite-only)
- [x] Auto-link aplicadores por email en invitación (`fn_accept_invitation`) y en login (`post-login-redirect`)
- [x] Binding explícito de aplicadores por `applicator_id` al invitar + fix UX email mismatch en `/join/[token]`
- [x] Provisión de periodos de Nómina Abril y Mayo 2026
- [ ] **Aplicar migración** `20260612_fix_applicator_portal_registration_and_linking.sql` en Supabase SQL Editor (PENDIENTE EN PROD)
- [ ] **Ejecutar "Recalcular Nómina"** para Mayo Q1/Q2 en el dashboard Admin para automatizar desgloses actuales.
- [ ] **Definir alcance Portal de Escuelas** (preguntas en `.codex-review/NEXT_SESSION_TODO.md`)
- [ ] Construir Portal de Escuelas (`(school-portal)` + `withSchoolAuth`)
- [ ] Smoke test funcional de Viaticos en dashboard productivo
- [ ] Conectar `fn_expire_old_invitations()` a Vercel Cron diario
- [ ] Agregar CTA en `/join/[token]?expired=1` para pedir nueva invitacion
- [ ] Dashboard diferenciado por rol (diseño en `.codex-review/RBAC_MATRIX_2026-05-13.md`)

### Datos / operacion

- [ ] Backfill CENNI `--status SOLICITADO` (19 registros) en cenni-bot
- [ ] Agregar CURP de Silvia Selene Moreno Carrasco (`CENNI-CF57JA`)
- [ ] Reintentar backfill de MARCO GASTELUM folio `336225`

### Deuda tecnica

- [x] PR #31 ya mergeado: mantener monitoreo de Security Advisor para `hr_profiles` (RLS guard aplicado)
- [ ] Bug en `fn_cleanup_isolated_org`: falla con FK constraint al borrar org personal porque `fn_audit_log` trigger intenta insertar con `org_id` de la org que se está borrando. Fix: en `fn_audit_log`, set `org_id = NULL` cuando `TG_TABLE_NAME = 'organizations'`.
- [ ] Sustituir "Language Evaluation Center" -> "Languages Education Consulting" en toda la UI
- [ ] KPI cards en Caja Chica
- [ ] Staging environment con org de prueba
- [ ] Cron `fn_expire_old_invitations()` (Vercel Cron / pg_cron)
- [ ] UI en formulario de invitación: mostrar banner cuando el email ya existe en `applicators` sin `auth_user_id` ("se vinculará automáticamente")

---

## Modulos faltantes

| Proceso | Como se hace hoy | Sprint |
|---------|-----------------|--------|
| Rol de aplicador por evento (SE/ADMIN/INVIG/SUPER) | LOGISTICA_UNOi 2026.xlsx | Sprint 3 |
| Nomina dinamica por rol | Tarifas hardcoded en Excel | Sprint 3 |
| P&L por sesion (IH - nomina - viaticos) | Hoja PRESUPUESTO GASTOS en Excel | Sprint 3 |
| Gestion transversal de tareas/proyectos (tipo Asana/Trello/Monday) | Mixto (Excel/WhatsApp/seguimiento manual) | Sprint 5-6 |
| Cursos | Sistema externo | Sprint 4 |
| Ferias de libros | Manual | Sprint 4 |
| Post-Evento: OOPT/Cambridge, Expediente (DMS) y USB Log | Sin rastreo digital unificado | Sprint Post-Evento (Fase A) |
| Post-Evento: Resultados, Certificados y Analítica Académica | Procesos dispersos / Reportes Manuales | Sprint Post-Evento (Fase B/C/D) |

---

## Notas operacionales

- `src/lib/demo/config.ts` y `src/lib/demo/data.ts` **NO eliminar** — los usan tests y paginas placeholder del portal.
- `NEXT_PUBLIC_DEMO_MODE=true` ya no da acceso al dashboard por si solo.
- `event_sessions` no tiene `org_id` propio: siempre filtrar via JOIN a `events` usando `events!inner`.
- No deshabilitar RLS en tablas tenant (`petty_cash_movements`, `org_members`, `org_invitations`, `cenni_cases`, `poa_lines`).
- Migraciones: crear archivo en `supabase/migrations/` y ejecutar manualmente en el SQL editor de Supabase.
- Al regenerar `database.types.ts` en PowerShell usar `| Out-File -Encoding utf8`; `>` genera UTF-16 y rompe CI.
- `SUPABASE_SERVICE_ROLE_KEY` es obligatorio en produccion para invitaciones y certificados CENNI.
- Tarifas Cambridge 2026: Starters $332, Movers $354, Flyers $366, KEY $499, PET $516, FCE $812.

---

## Documentacion principal

| Archivo | Contenido |
|---------|-----------|
| `CLAUDE.md` | Arquitectura, patrones criticos, done criteria, backlog tecnico |
| `HANDOFF.md` | Este archivo — resumen ejecutivo y backlog operativo |
| `AGENTS.md` | Contexto específico para agentes no-Claude (Antigravity, Cursor, Copilot) |
| `docs/ROADMAP.md` | Priorizacion actualizada |
| `INFRASTRUCTURE_STATUS.md` | Estado operativo y readiness de lanzamiento |
| `docs/POST_EXAM_OPERATIONS_AND_ANALYTICS.md` | **NUEVO:** Arquitectura de Módulo Post-Evento, Destrucción USBs, Certificados y Analítica |
| `.codex-review/RBAC_MATRIX_2026-05-13.md` | Matriz RBAC, gaps corregidos, dashboard por rol |
| `.codex-review/NEXT_SESSION_TODO.md` | Portal de escuelas: preguntas pendientes |
| `docs/adr/ADR-007-project-management-module-foundation.md` | Decision del modulo PM transversal |
| `docs/PM_RUNBOOK.md` | Operacion, validacion y troubleshooting del modulo PM |
| `docs/PM_PATHS_AND_ROUTES.md` | Mapa de rutas/archivos/migraciones del modulo PM |
| `docs/TESTING_GUIDE.md` | Estado real de build, Vitest y Playwright |
| `docs/TESTING_PATTERNS.md` | Patrones Vitest y notas del harness E2E |
| `docs/API_MODULES.md` | Referencia de rutas API |
| `docs/DATABASE_SCHEMA.md` | Schema, enums y RPCs |
| `docs/FINANCE_MODULES.md` | Detalle de Caja Chica y Presupuesto |
| `docs/executive-observability/README.md` | Indice de dashboard ejecutivo y observabilidad |
| `docs/executive-observability/TICKETS_SPRINT_BOARD.md` | Tickets sprint-ready con owners y SP |
