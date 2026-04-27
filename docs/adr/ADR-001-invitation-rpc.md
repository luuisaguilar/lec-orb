# ADR-001 — Usar RPC atómica con SECURITY DEFINER para aceptar invitaciones

**Estado:** Aceptado  
**Fecha:** 2026-04-21  
**PR:** #7

---

## Contexto

Al aceptar una invitación, se necesita realizar múltiples operaciones de forma segura:
1. Validar que el token existe y está pendiente
2. Insertar al usuario en `org_members`
3. Marcar la invitación como aceptada en `org_invitations`

Estas operaciones afectan tablas protegidas por RLS. Un usuario recién registrado no tiene
`org_id` asignado aún, por lo que no pasaría las políticas RLS estándar. Ejecutar la lógica
desde el cliente (browser) expondría la lógica de negocio y requeriría permisos elevados del lado del cliente.

## Decisión

Se implementó la función PostgreSQL `fn_accept_invitation(p_token TEXT, p_user_id UUID)`
con `SECURITY DEFINER`, que:

- Se ejecuta con los privilegios del dueño de la función (superuser de Supabase)
- Valida el token, inserta en `org_members`, y actualiza `org_invitations` en una transacción
- Solo puede ser invocada desde el servidor via el **admin client** (`SUPABASE_SERVICE_ROLE_KEY`)

```sql
CREATE OR REPLACE FUNCTION fn_accept_invitation(p_token TEXT, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- ... lógica atómica
$$;
```

La llamada desde el servidor usa el cliente admin:
```ts
const { data, error } = await adminSupabase.rpc('fn_accept_invitation', {
  p_token: token,
  p_user_id: user.id,
});
```

## Consecuencias

**Positivas:**
- La lógica de aceptación es atómica — no hay estado inconsistente si algo falla a la mitad
- El cliente nunca tiene acceso directo a `org_members` o `org_invitations` durante el flujo
- Fácil de testear unitariamente mockeando el admin client

**Negativas / Restricciones:**
- Requiere `SUPABASE_SERVICE_ROLE_KEY` configurado en todas las instancias de producción
- Si esta variable no está disponible, la aceptación de invitaciones falla completamente
- La función bypasea RLS de forma controlada — cualquier cambio a la función requiere revisión de seguridad

---

## Addendum — 2026-04-24 — Fixes de la RPC y triggers relacionados

En producción se descubrieron tres bugs relacionados con la RPC y el ecosistema de
triggers que la rodean. Todos fueron corregidos con migraciones fechadas 2026-04-24.

1. **`pg_catalog.trim` no existe.** La RPC usaba `pg_catalog.trim()` para normalizar
   el email; `pg_catalog` solo expone `btrim`. Fix: `pg_catalog.btrim()`.

2. **Mismatch de enums `user_role` ↔ `member_role`.** `org_invitations.role` es
   `member_role` y `org_members.role` es `user_role`. La RPC ahora hace cast explícito
   `v_invitation.role::text::public.user_role` al insertar.

3. **`audit_log.operation` NOT NULL.** El trigger `fn_audit_log` solo llenaba la columna
   legacy `action`; la columna real requerida es `operation`. Ahora se llenan ambas y
   `auth.uid()` hace fallback a `new_data.user_id` cuando el trigger se dispara desde
   una RPC `SECURITY DEFINER` (como ésta).

4. **`handle_new_user` duplicaba memberships.** El trigger creaba una org personal +
   admin membership para **todo** usuario nuevo. Si el usuario venía por invitación,
   terminaba con 2 filas en `org_members` y `getAuthenticatedMember().single()` fallaba
   con 403 en cada ruta API. Fix: `handle_new_user` ahora salta la creación de la org
   personal si hay una invitación pendiente con el email del nuevo usuario.

**Migraciones asociadas:**
- `20260424_fix_invitation_accept_audit.sql`
- `20260424_fix_fn_audit_log_operation.sql`
- `20260424_handle_new_user_skip_invited.sql`
