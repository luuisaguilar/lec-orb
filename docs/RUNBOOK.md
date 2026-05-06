# Runbook Operacional — LEC Orb

Guía de operaciones para el equipo. Cubre despliegue, configuración, flujos comunes y resolución de errores.

---

## Deploy

### Procedimiento estándar

```bash
git push origin main
```

Vercel detecta el push y despliega automáticamente desde `main`. No se requiere ningún paso manual.

**Verificar el deploy:**
1. Abrir [vercel.com/dashboard](https://vercel.com/dashboard) → proyecto `lec-orb`
2. Confirmar que el build más reciente tenga estado **Ready**
3. Revisar los logs del build si falla

**Antes de hacer push a main:**
```bash
npm run build && npm run lint && npm run test
```

---

## Dashboard Ejecutivo + Observabilidad

Referencia operativa del frente:

- `docs/executive-observability/README.md`
- `docs/executive-observability/SCREENS_AND_KPIS.md`
- `docs/executive-observability/BACKLOG_MVP_V2.md`
- `docs/executive-observability/HANDOFF_DASHBOARDS.md`
- `docs/executive-observability/RUNBOOK_DASHBOARD_OBSERVABILITY.md`
- `docs/executive-observability/PATHS_AND_ROUTES.md`
- `docs/executive-observability/TICKETS_SPRINT_BOARD.md`

---

## Variables de Entorno

Todas las variables se configuran en: **Vercel Dashboard → lec-orb → Settings → Environment Variables**

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Clave pública anon de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Clave service_role (NO la anon key) — para invitaciones |
| `NEXT_PUBLIC_APP_URL` | ✅ | URL de producción (ej. `https://app.lecorb.com`) — evita links con `localhost` |
| `RESEND_API_KEY` | ✅ prod | API key de Resend para emails de invitación |
| `RESEND_FROM_EMAIL` | ✅ prod | Remitente en formato `Nombre <email@dominio.com>` (dominio debe estar verificado en Resend) |

> ✅ **Abril 2026:** Resend operativo. Dominio `updates.luisaguilaraguila.com` verificado.
> `RESEND_FROM_EMAIL` debe seguir el formato `Nombre <email@dominio>`;
> si se usa solo `email@dominio`, Resend responde con error
> `Invalid from field`.

**Cómo agregar/editar una variable en Vercel:**
1. Vercel Dashboard → lec-orb → Settings → Environment Variables
2. Clic en "Add New" o en el lápiz de la variable existente
3. Seleccionar entornos: Production, Preview, Development según corresponda
4. Guardar → el próximo deploy tomará el nuevo valor

---

## Cómo Agregar un Nuevo Usuario a una Org

### Flujo completo (paso a paso)

1. Iniciar sesión como **admin** de la org en la plataforma
2. Ir a **Dashboard → Usuarios**
3. Clic en "Invitar usuario"
4. Ingresar email y seleccionar rol (`admin`, `supervisor`, `operador`, `applicator`)
5. Clic en "Enviar invitación"
6. El sistema devuelve un `joinUrl` (y opcionalmente envía email si Resend está configurado)
7. Si el email no se envió, copiar el `joinUrl` y enviarlo manualmente al usuario
8. El usuario visita el enlace, inicia sesión (o se registra), y acepta la invitación
9. Al aceptar, queda automáticamente agregado a la org con el rol asignado

### Verificar que la invitación fue aceptada

- En Dashboard → Usuarios, la invitación debe aparecer con estatus `accepted`
- El nuevo usuario debe aparecer en la lista de miembros

---

## Cómo Aplicar una Migración de Base de Datos

Las migraciones están en `supabase/migrations/`. **Nunca editar archivos existentes** — solo agregar nuevos.

### Procedimiento

1. Abrir [supabase.com](https://supabase.com) → proyecto LEC Orb
2. Ir a **SQL Editor**
3. Copiar el contenido del archivo `.sql` de la migración
4. Pegar en el editor y ejecutar
5. Verificar que no haya errores en el output
6. Si el schema cambió, regenerar los tipos:
   ```bash
   npx supabase gen types typescript --project-id <project-id> > src/types/database.types.ts
   ```

> Las migraciones en `supabase/migrations/` son referencia histórica. Supabase Cloud no las aplica automáticamente — se deben ejecutar manualmente en el SQL Editor.

---

## Cómo Revisar Logs de Vercel (Join Page)

Cuando un usuario reporta error en `/join/[token]`:

1. Abrir Vercel Dashboard → lec-orb → **Logs** (o Functions → View Function Logs)
2. Filtrar por la ruta `/join` o buscar `[join]`
3. Los logs del join page usan prefijos discriminados:
   - `[join] token_not_found` — token no existe en la DB
   - `[join] already_processed` — invitación ya fue aceptada/cancelada
   - `[join] server_error` — error inesperado (revisar detalle)
   - `[join] admin_client_unavailable` — `SUPABASE_SERVICE_ROLE_KEY` no configurada

---

## Errores Comunes y Soluciones

### "Application error" en `/join/[token]`

**Causa más probable:** `SUPABASE_SERVICE_ROLE_KEY` no está configurada o tiene el valor incorrecto.

**Diagnóstico:**
1. Verificar en Vercel → Settings → Environment Variables que `SUPABASE_SERVICE_ROLE_KEY` existe
2. Confirmar que el valor es la clave **service_role** (empieza con `eyJ...` y es más larga que la anon key) — NO usar la anon key
3. Revisar logs en Vercel para el mensaje `admin_client_unavailable`

**Solución:** Agregar/corregir la variable y esperar el próximo deploy.

---

### "Invitación Inválida" al visitar el join link

**Causa:** El token no existe en la base de datos.

**Diagnóstico:**
1. Revisar logs de Vercel para `[join] token_not_found` o código `PGRST116`
2. Verificar en Supabase → tabla `org_invitations` que el token existe
3. Si `PGRST116`: el token genuinamente no existe — fue eliminado o el link está mal

**Solución:** El admin debe crear una nueva invitación y compartir el nuevo `joinUrl`.

---

### "Invitación Ya Utilizada"

**Causa:** La invitación ya fue aceptada anteriormente.

**Diagnóstico:** Log `[join] already_processed` en Vercel.

**Solución:** El admin debe crear una nueva invitación para el mismo email.

---

### Email de invitación no se envía

**Causa:** `RESEND_API_KEY` no está configurado en Vercel.

**Diagnóstico:** El endpoint `POST /api/v1/invitations` devuelve `emailSent: false` con `emailError` en el body.

**Solución inmediata:** Usar el `joinUrl` devuelto por el endpoint y enviarlo manualmente.

**Solución permanente:** Configurar `RESEND_API_KEY` y `RESEND_FROM_EMAIL` en Vercel.

---

### "Application error" genérico en una Server Action

**Causa:** Un Server Action está usando `throw` en lugar de `redirect()`.

**Diagnóstico:** Revisar el stack trace en Vercel Logs. Si el error proviene de un archivo `actions.ts`, buscar sentencias `throw`.

**Solución:** Reemplazar todo `throw` en Server Actions por:
```ts
redirect(`/ruta?error=${encodeURIComponent('Mensaje de error')}`);
```

---

### 403 en todos los endpoints API para un usuario recién invitado

**Causa:** el usuario tiene **más de una fila** en `org_members` (doble membership).
`getAuthenticatedMember()` usa `.single()` y falla silenciosamente → 403 en cada ruta,
incluso en `/api/v1/users/me` que no checa permisos de módulo.

**Historial:** antes del 2026-04-24 el trigger `handle_new_user` creaba una org personal
+ membership admin para **todo** usuario nuevo, sin importar si venía por invitación.
Cuando el usuario aceptaba la invitación quedaban 2 filas en `org_members`.

**Diagnóstico:**
```sql
SELECT m.id AS member_id, m.user_id, m.org_id, m.role, o.name AS org_name, m.created_at
FROM public.org_members m
LEFT JOIN public.organizations o ON o.id = m.org_id
WHERE m.user_id IN (SELECT id FROM auth.users WHERE email = '<email-del-usuario>')
ORDER BY m.created_at;
```

**Solución inmediata** (para usuarios afectados antes del fix):
```sql
-- Borrar la membership personal (la más antigua, role='admin' en "X's Organization")
DELETE FROM public.org_members WHERE id = '<member_id_personal>';
DELETE FROM public.organizations WHERE id = '<org_id_personal>';
```

**Solución estructural:** aplicada en migración `20260424_handle_new_user_skip_invited.sql`
— el trigger ahora salta la creación de org personal si el email del usuario tiene una
invitación pendiente.

---

### Error "null value in column 'operation' of relation 'audit_log'"

**Causa:** `audit_log` tiene `operation NOT NULL` pero el trigger `fn_audit_log`
solo llenaba la columna legacy `action`.

**Solución:** aplicada en migración `20260424_fix_fn_audit_log_operation.sql` — el trigger
ahora llena ambas columnas (`operation` y `action`) y hace fallback de `auth.uid()` al
`user_id` de `new_data` cuando el trigger se dispara desde un RPC `SECURITY DEFINER`.

---

### Error "params is not iterable" o similar en página dinámica

**Causa:** La página dinámica no está usando `await params` (patrón Next.js 15+).

**Solución:** Actualizar la firma de la página:
```tsx
// Antes (rompe en prod)
export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params;
}

```tsx
// Después (correcto)
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
```

---

## Mantenimiento SGC y Finanzas

### Verificar Salud del Módulo SGC
Si el Dashboard de SGC muestra errores 500 o métricas en cero:
1. **Verificar Tablas**: Asegurarse que existen registros en `risk_assessments`.
2. **Timeline de Auditoría**: Si el timeline de una NC no carga, revisar si hay registros en `audit_log` para esa `table_name = 'sgc_nonconformities'`. El código es resiliente a cambios de columna (`action` vs `operation`), pero requiere que el `record_id` coincida.
3. **Métricas**: Las métricas fallan si `detection_date` es nulo en registros creados antes de la estabilización. Se implementó un fallback en el API, pero se recomienda completar los datos manualmente si es crítico.

### Verificar Integración de Viáticos
Para confirmar que el módulo de Viáticos está 100% operativo:
1. **Ejecutar Check de Migraciones**:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'travel_expense_reports' 
   AND column_name = 'ppto_aereos';
   ```
   Si no devuelve nada, aplicar `supabase/migrations/20260509_travel_expenses_detailed_fields.sql`.
2. **Cierre de Ciclo**: Un reporte de viáticos solo afecta al P&L consolidado (futuro) cuando su estado es `approved` o `reimbursed`.
