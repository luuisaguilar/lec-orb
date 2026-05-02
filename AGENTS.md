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

## Flujo: nuevo componente UI

1. Revisar `src/components/` — puede existir algo reutilizable
2. Usar primitivos de Radix UI + Tailwind CSS 4
3. **Estética Premium**: Seguir el patrón de "Premium SaaS" (glassmorphism, bordes sutiles, contrastes altos).
4. **Temas Dinámicos**: Si el componente depende de un nivel de examen, usar el patrón `EXAM_THEMES` (visto en `calculadora-tiempos`) para aplicar colores y glows específicos.
5. Formularios: React Hook Form + Zod
6. Notificaciones: `sonner`

---

## Restricciones (no tocar sin instrucción explícita)

| Archivo/Carpeta | Razón |
|----------------|-------|
| `src/middleware.ts` | Rompe todo el routing de auth |
| `src/types/database.types.ts` | Autogenerado por Supabase CLI |
| `supabase/migrations/` | Solo agregar migraciones nuevas, nunca editar |
| RLS en tablas de tenant | Nunca deshabilitar |
| `src/lib/supabase/admin.ts` | Único punto de uso del service role key |
