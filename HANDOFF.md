# Handoff — LEC Orb

Resumen ejecutivo del estado del proyecto. Para contexto técnico completo ver `CLAUDE.md`.

**Repo canónico:** `lec-orb` | **Última actualización:** Abril 2026

---

## Estado actual

| Área | Estado |
|------|--------|
| Build / Typecheck / Lint | ✅ Pasan sin errores |
| Vitest (unit/integration) | ✅ 26 archivos, 143 tests — 21/21 módulos API cubiertos |
| Playwright (E2E) | ✅ Cubre finanzas e invitaciones contra servidor demo |
| Finance — Caja Chica | ✅ CRUD + balance RPC + Excel export + receipt upload |
| Finance — Presupuesto | ✅ Upsert mensual + comparativo presupuesto-vs-real |
| Invitaciones | ✅ Creación atómica vía RPC + email Resend + joinUrl fallback |
| DEMO_MODE | ✅ Documentado en `docs/DEMO_MODE.md` |

---

## Próximos pasos

1. **KPI cards + gráficas en Caja Chica** — richer dashboard de finanzas
2. **Preview de comprobantes** — en vez de solo descarga
3. **Staging smoke tests** — contra Supabase real con org de prueba dedicada

---

## Notas operacionales

- No deshabilitar RLS en tablas de tenant (`petty_cash_movements`, `org_members`, `invitations`).
- Monitorear uso de Supabase Storage (bucket `petty-cash-receipts` y `org-documents`).
- Al extender RBAC, verificar consistencia entre **module slug** y **permission-module name**.
- `SUPABASE_SERVICE_ROLE_KEY` es obligatorio en producción para invitaciones.

---

## Documentación del proyecto

| Archivo | Contenido |
|---------|-----------|
| `CLAUDE.md` | Arquitectura completa, patrones, comandos, criterio de done |
| `AGENTS.md` | MCP servers + flujos específicos para Antigravity/Cursor/Copilot |
| `docs/DEMO_MODE.md` | DEMO_MODE: activación, seed data, rutas afectadas, mocking en Vitest |
| `docs/TESTING_PATTERNS.md` | Patrones Vitest: mock Supabase, withAuth, invocación de handlers |
| `docs/API_MODULES.md` | Referencia completa de los 23 módulos API + tabla RBAC |
| `docs/DATABASE_SCHEMA.md` | Schema completo — todas las tablas, enums y RPCs |
| `docs/FINANCE_MODULES.md` | Detalle de módulos Caja Chica y Presupuesto |
| `docs/TESTING_GUIDE.md` | Comandos y estructura de tests |
