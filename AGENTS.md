# LEC Orb — AGENTS.md (Antigravity / Cursor / Copilot / Gemini CLI)

> Fuente canónica: **`CLAUDE.md`** — leerlo primero.
> Este archivo solo documenta lo específico para agentes no-Claude.

---

## MCP Servers disponibles

| MCP Server | Alias | Permisos | Cuándo usar |
|-----------|-------|----------|-------------|
| Supabase MCP | `supabase-lec` | Solo lectura en producción | Inspeccionar tablas, contar registros, ver schema |
| GitHub MCP | `github-lec` | Lectura + PRs | Ver historial, abrir PRs |
| Filesystem MCP | `filesystem` | Lectura/escritura en repo | Leer/escribir archivos del proyecto |

**Regla de migraciones:** Nunca ejecutar SQL desde el MCP de Supabase.
Generar el SQL → Luis lo aplica en Supabase Dashboard o CLI.

---

## Flujo: nueva ruta API

1. Copiar `src/app/api/v1/finance/petty-cash/route.ts` como base
2. Implementar con `withAuth` — ver patrón completo en `CLAUDE.md`
3. Llamar `logAudit` después de cada mutación exitosa
4. Confirmar que la tabla destino tiene RLS habilitado

## Flujo: Resiliencia de Datos SGC
Debido a la migración de esquemas de auditoría y nombres de columnas históricos en el SGC:
1. **Audit Logs**: Al leer el timeline, soportar tanto `operation` (nuevo) como `action` (antiguo) y `changed_by` vs `performed_by`.
2. **Fechas**: Siempre proveer fallbacks para columnas de fecha (`detection_date`, `completed_at`). Si el valor es nulo, usar `created_at` o la fecha actual para evitar errores en el dashboard de métricas.
3. **Tablas de Riesgo**: Usar siempre `risk_assessments` (no `sgc_risks`).

## Gotchas de Base de Datos (Seeding & Migrations)
1. **Case Sensitivity**: Los estados en `events` y `event_slots` **DEBEN** ser mayúsculas (`COMPLETED`, `PUBLISHED`, `CONFIRMED`).
2. **Applicators**: No existe columna `status`. El email **no es único**; usar lógica de búsqueda manual en scripts de seeding.
3. **Payroll v2**: Las `payroll_entries` aún requieren columnas legadas `NOT NULL` (`rate_per_hour`, `subtotal`, `total`) para compatibilidad.
4. **Event Staff**: Llenar `status` ('confirmed') y `acknowledgment_status` para asegurar visibilidad en nómina y portal.
5. **CRM Columns**: La tabla `crm_opportunities` usa `title` (no name) y `expected_amount` (no amount).
6. **CRM API**: El endpoint `/api/v1/crm/opportunities` devuelve `{ opportunities: [...] }`. No usar `.data` directamente.
7. **Payroll Detail**: Para ver eventos y horas en el portal/admin, se DEBE insertar en `payroll_line_items` vinculado al `entry_id`.

## Flujo: nuevo componente UI

1. Revisar `src/components/` — puede existir algo reutilizable
2. Usar primitivos de Radix UI + Tailwind CSS 4
3. **Estética Premium**: Seguir el patrón de "Premium SaaS" (glassmorphism, bordes sutiles, contrastes altos).
4. **Temas Dinámicos**: Si el componente depende de un nivel de examen, usar el patrón `EXAM_THEMES` (visto en `calculadora-tiempos`) para aplicar colores y glows específicos.
5. Formularios: React Hook Form + Zod
6. Notificaciones: `sonner`

---

## Flujo: RBAC y permisos

1. `checkServerPermission()` resuelve `MODULE_ALIAS_MAP` antes de consultar `member_module_access`
2. Aliases como `"finanzas"` → `"payments"` y `"examenes"` → `"exam-codes"` se resuelven automáticamente
3. **Fail-closed**: si no hay row en `member_module_access`, el acceso se niega (excepto admin)
4. Todo nuevo módulo **debe** registrarse en `module_registry` (migración SQL) antes de usarse como guard
5. Documentación completa: `.codex-review/RBAC_MATRIX_2026-05-13.md`

## Flujo: Portales

| Portal | URL Producción | Route Group | Auth Handler | Estado |
|--------|----------------|------------|-------------|--------|
| Aplicadores | `orb.lec.mx` | `(portal)` | `withApplicatorAuth` | ✅ Activo |
| Escuelas | `school.lec.mx` 🔜 | `(school-portal)` 🔜 | `withSchoolAuth` 🔜 | ⏳ Escuelas piden acceso |
| Ejecutivos | TBD | `(executive)` 🔜 | TBD | Sin demanda |

**PRÓXIMA SESIÓN:** Preguntar a Luis por respuestas en `.codex-review/NEXT_SESSION_TODO.md`
antes de construir el portal de escuelas.

---

## Restricciones (no tocar sin instrucción explícita)

| Archivo/Carpeta | Razón |
|----------------|-------|
| `src/middleware.ts` | Rompe todo el routing de auth |
| `src/types/database.types.ts` | Autogenerado por Supabase CLI |
| `supabase/migrations/` | Solo agregar migraciones nuevas, nunca editar |
| RLS en tablas de tenant | Nunca deshabilitar |
| `src/lib/supabase/admin.ts` | Único punto de uso del service role key |
