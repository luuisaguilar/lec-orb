# Handoff - LEC Orb

Resumen ejecutivo del estado del proyecto. Para contexto tecnico completo ver `CLAUDE.md`.

**Repo canonico:** `lec-orb` | **Ultima actualizacion:** 2026-05-04 (Financial Intelligence) |

---

## Estado actual

| Area | Estado |
|------|--------|
| Build / Typecheck | Pass sin errores (`npm run build`) |
| ESLint | Pass (`0` errores) |
| Vitest (unit/integration) | `26` archivos, `164` tests, `22/22` modulos API cubiertos |
| Playwright (E2E) | Pass (`10/10`) |
| Finance - Nómina Operativa | **COMPLETADO** - Motor dinámico, P&L real, recalculo |
| Finance - Viáticos | **COMPLETADO** - Módulo integrado, esquema verificado, UI operativa |
| Finance - Caja Chica | CRUD + balance RPC + Excel export/import |
| Finance - Presupuesto (POA) | Tabla `poa_lines` operativa |
| Finance - Dashboard P&L | **EN DESARROLLO** - Consolidación de ingresos/egresos |
| SGC (Calidad) | **COMPLETADO** - Estabilización técnica (Stats API + Timeline NC resiliente) |
| Cursos e Inventario | **COMPLETADO** - Simulador ROI + Control de stock multi-ubicación |

---

## Roadmap

| Sprint | Estado | Notas |
|--------|--------|-------|
| Sprint 1: Estabilización | Completado | Auth, CENNI, Caja Chica base. |
| Sprint 2: IH Billing | Completado | Facturación, CxC, Viáticos. |
| Sprint 3: Nómina y Eventos | Completado | Pulido visual y auditoría terminada. |
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

## Proximos pasos concretos

### Alta prioridad

- [x] Merge PR #29 de Viaticos (incluye migración `20260503_travel_expenses.sql`)
- [x] Merge PR #32 (fix SGC + Refinamiento Visual Premium)
- [ ] Smoke test funcional de Viaticos en dashboard productivo
- [ ] Conectar `fn_expire_old_invitations()` a Vercel Cron diario
- [ ] Agregar CTA en `/join/[token]?expired=1` para pedir nueva invitacion

### Datos / operacion

- [ ] Backfill CENNI `--status SOLICITADO` (19 registros) en cenni-bot
- [ ] Agregar CURP de Silvia Selene Moreno Carrasco (`CENNI-CF57JA`)
- [ ] Reintentar backfill de MARCO GASTELUM folio `336225`

### Deuda tecnica

- [x] PR #31 ya mergeado: mantener monitoreo de Security Advisor para `hr_profiles` (RLS guard aplicado)
- [ ] Sustituir "Language Evaluation Center" -> "Languages Education Consulting" en toda la UI
- [ ] KPI cards en Caja Chica
- [ ] Staging environment con org de prueba
- [ ] Validar propuesta de 9 grupos de permisos con gerencia
- [ ] Cron `fn_expire_old_invitations()` (Vercel Cron / pg_cron)

---

## Modulos faltantes

| Proceso | Como se hace hoy | Sprint |
|---------|-----------------|--------|
| Rol de aplicador por evento (SE/ADMIN/INVIG/SUPER) | LOGISTICA_UNOi 2026.xlsx | Sprint 3 |
| Nomina dinamica por rol | Tarifas hardcoded en Excel | Sprint 3 |
| P&L por sesion (IH - nomina - viaticos) | Hoja PRESUPUESTO GASTOS en Excel | Sprint 3 |
| Cursos | Sistema externo | Sprint 4 |
| Ferias de libros | Manual | Sprint 4 |
| IELTS / OOPT | Sin rastreo | Sin asignar |

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
| `docs/ROADMAP.md` | Priorizacion actualizada |
| `docs/TESTING_GUIDE.md` | Estado real de build, Vitest y Playwright |
| `docs/TESTING_PATTERNS.md` | Patrones Vitest y notas del harness E2E |
| `docs/API_MODULES.md` | Referencia de rutas API |
| `docs/DATABASE_SCHEMA.md` | Schema, enums y RPCs |
| `docs/FINANCE_MODULES.md` | Detalle de Caja Chica y Presupuesto |
