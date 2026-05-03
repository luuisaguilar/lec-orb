# Handoff - LEC Orb

Resumen ejecutivo del estado del proyecto. Para contexto tecnico completo ver `CLAUDE.md`.

**Repo canonico:** `lec-orb` | **Ultima actualizacion:** 2026-05-02

---

## Estado actual

| Area | Estado |
|------|--------|
| Build / Typecheck | Pass sin errores (`npm run build`) |
| ESLint | Pass (`0` errores) |
| Vitest (unit/integration) | `26` archivos, `164` tests, `22/22` modulos API cubiertos |
| Playwright (E2E) | Pass (`10/10`) |
| Finance - Nómina Operativa | **COMPLETADO (Fase 3)** - Motor dinámico, P&L real, recalculo |
| Finance - Caja Chica | CRUD + balance RPC + Excel export/import + receipt upload |
| Finance - Presupuesto (POA) | Tabla `poa_lines` libre por seccion/concepto, dos fuentes (CAJA_CHICA / CUENTA_BAC) |
| Finance - IH Billing | Operativo: sesiones, tarifas, facturas, pagos, conciliacion e import |
| Finance - Viáticos | **COMPLETADO** - Módulo integrado con PR #29 mergeado |
| Invitaciones | **COMPLETADO** - Flujo + Resend + Vercel Cron + UI de expiración |
| CENNI | **COMPLETADO** - CRUD + bulk import + certificados PDF + visor + dashboard KPIs |
| TOEFL | Administraciones + codigos |
| SGC (checklist auditoria) | **OPERATIVO** - Fix de navegación y refinamiento visual aplicado |
| Calculadora de Tiempos | **PREMIUM** - Versión 2.0 con temas dinámicos |
| Sentry | Activo (project `orb-lec`) |
| Portal de aplicadores | Datos reales (Supabase integration complete) |
| Nombre Institucional | **COMPLETADO** - Actualizado a "Languages Education Consulting" |

---

## Roadmap

| Sprint | Estado | Notas |
|--------|--------|-------|
| Sprint 1: Estabilización | Completado | Auth, CENNI, Caja Chica base. |
| Sprint 2: IH Billing | Completado | Facturación, CxC, Viáticos. |
| Sprint 3: Nómina y Eventos | Completado | Pulido visual y auditoría terminada. |
| Sprint 4: Cursos y Ferias | **En Desarrollo** | Iniciando esquema de inventario dual y costos. |
| Sprint 5: Dashboard Gerencial | Pendiente | Integración de P&L consolidado. |

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

## Sprint 4 — Cursos y Ferias de Libros (EN CURSO)

### Objetivo
Digitalizar la operación académica y el control logístico de ferias con inventario centralizado.

### Componentes clave
- **Módulo de Cursos**: 
  - Esquema DB para cursos, niveles y alumnos.
  - Calculadora de Costos y Márgenes (basada en Excel Mayo-Julio 2026).
  - Dashboard de rentabilidad por curso.
- **Módulo de Ferias e Inventario**:
  - Almacén Central (Maestro) vs Ubicaciones por Evento/Feria.
  - Sistema de Transferencias/Asignaciones de stock con auditoría.
  - Registro de ventas rápidas en sitio.

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
