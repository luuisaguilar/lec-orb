# LEC Orb — Contexto para Agentes

## Proyecto

SaaS multi-tenant para gestión académica y administrativa de centros de evaluación de inglés
(TOEFL, CENNI, Cambridge) en México. Cada cliente = una `org_id`. Módulos operativos +
finanzas (Caja Chica y Presupuesto).

**Repo canónico:** `lec-orb` (los proyectos `lec-orb-develop` y `lec-orb-finance` son
referencias históricas — no modificar).

## Stack

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js App Router | 16.1.6 |
| UI | React + Tailwind CSS + Radix UI | 19.2.3 / 4 |
| Lenguaje | TypeScript | 5 |
| Backend | Supabase (Postgres + RLS + Auth + Storage) | @supabase/ssr 0.8 |
| Forms | React Hook Form + Zod | 7.x / 4.x |
| Email | Resend | 6.x |
| Data fetch | SWR | 2.x |
| Runtime | Node.js | 20.x (requerido) |
| Hosting | Vercel + Supabase Cloud | — |

## Estructura de Carpetas

```
src/
├── app/
│   ├── (auth)/                   ← Login / register (rutas públicas)
│   ├── (dashboard)/
│   │   └── dashboard/            ← Todas las rutas protegidas
│   │       ├── finanzas/
│   │       │   ├── caja-chica/   ← Petty Cash UI
│   │       │   └── presupuesto/  ← Budget UI
│   │       └── [20+ módulos]     ← applicators, events, users, etc.
│   ├── (portal)/                 ← Portal para applicators
│   └── api/v1/                   ← 64 route handlers
│       ├── finance/petty-cash/   ← CRUD + balance RPC
│       ├── finance/budget/       ← Upsert + comparative
│       ├── invitations/          ← Creación + aceptación
│       └── [19 módulos más]
├── components/                   ← Componentes React reutilizables
├── lib/
│   ├── auth/with-handler.ts      ← withAuth — WRAPPER OBLIGATORIO
│   ├── supabase/                 ← Clientes (browser, server, admin, proxy)
│   ├── finance/export-xlsx.ts    ← Exportación Excel
│   ├── email/resend.ts           ← Integración Resend
│   ├── audit/                    ← logAudit()
│   └── ...
└── types/                        ← Tipos TypeScript globales
```

## Comandos

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción — debe pasar limpio antes de cualquier PR
npm run lint         # ESLint
npm run test         # Vitest (unit/integration)
npm run test:watch   # Vitest en modo watch
npm run test:e2e     # Playwright E2E (requiere servidor local corriendo)

# Regenerar tipos de Supabase (solo cuando cambia el schema)
npx supabase gen types typescript --project-id <id> > src/types/database.types.ts
```

## Patrones Críticos — LEER ANTES DE ESCRIBIR CÓDIGO

### `withAuth` — obligatorio en toda ruta mutante

Toda ruta `POST / PUT / PATCH / DELETE` DEBE usar `withAuth`. Proporciona `user` y `org`
automáticamente con aislamiento por tenant.

```ts
// src/lib/auth/with-handler.ts — referencia canónica
export const POST = withAuth(async (req, { user, org }) => {
  // org.id  → tenant actual (usar en todos los queries)
  // user.id → usuario autenticado
  const { data, error } = await supabase
    .from('tabla')
    .insert({ ...payload, org_id: org.id });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
});
```

Referencia de patrón: `src/app/api/v1/finance/petty-cash/route.ts`

### `logAudit` — auditoría de mutaciones

Llamar después de toda mutación exitosa. `withAuth` NO lo llama automáticamente.

```ts
await logAudit({
  org_id: org.id,
  user_id: user.id,
  action: 'create' | 'update' | 'delete',
  entity: 'nombre_tabla',
  entity_id: resultado.id,
});
```

### RLS — reglas de oro

- TODA tabla nueva debe tener RLS habilitado desde el primer momento.
- Las políticas usan `auth.uid()` y `org_id` para el filtrado de tenant.
- El `admin client` (`src/lib/supabase/admin.ts`) bypasea RLS — usar **solo** para
  operaciones privilegiadas (invitaciones, RPCs de sistema).
- Nunca deshabilitar RLS en tablas de tenant: `petty_cash_movements`, `org_members`,
  `invitations` y derivadas.

### Manejo de errores Supabase

```ts
const { data, error } = await supabase.from('table').select();
if (error) return NextResponse.json({ error: error.message }, { status: 500 });
```

### RBAC — roles y módulos

Roles activos: `admin`, `supervisor`, `operador`, `applicator`.
Al extender rutas con permisos nuevos, verificar la consistencia entre el **module slug**
y el **permission-module name** — son distintos y su desalineación rompe el acceso.

## Variables de Entorno Requeridas

| Variable | Obligatoria en prod | Notas |
|----------|-------------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Clave pública |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Para invitaciones (bypasea RLS) |
| `NEXT_PUBLIC_APP_URL` | ✅ | Evita links con `localhost` |
| `RESEND_API_KEY` | ✅ | Email de invitaciones |
| `RESEND_FROM_EMAIL` | ✅ | Sender drift en producción |

Plantilla en `.env.example`. Archivo local: `.env.local` (no commitear).

## Módulos Financieros

### Caja Chica (`src/app/api/v1/finance/petty-cash/`)
- CRUD completo de movimientos.
- Balance calculado vía RPC `fn_petty_cash_balance` (server-side).
- Subida de comprobantes al bucket `petty-cash-receipts` en Supabase Storage.
- Exportación Excel en `src/lib/finance/export-xlsx.ts`.

### Presupuesto (`src/app/api/v1/finance/budget/`)
- Upsert de presupuesto mensual.
- Análisis comparativo presupuesto-vs-real en `/comparative`.
- UI con tabs: Configuración y Comparativo.

## Invitaciones

- Creación: `src/app/api/v1/invitations/route.ts` — siempre devuelve `joinUrl`.
- Aceptación: RPC `fn_accept_invitation` (atómica, privilegiada via admin client).
- Email: Resend es opcional en local, obligatorio en producción.
- Si el email falla, el flujo de invitación NO debe fallar — el `joinUrl` es el fallback.

## Testing

```
Vitest   → unit/integration (src/tests/)
           26 archivos, 143 tests — 21/21 módulos API cubiertos
Playwright → E2E contra servidor demo local (npm run dev)
           Cobertura: flows de finanzas e invitaciones
```

Antes de cada sprint, correr:
```bash
npm run build && npm run test
```

## Archivos que NUNCA Modificar

| Archivo/Carpeta | Razón |
|----------------|-------|
| `src/types/database.types.ts` | Autogenerado por Supabase CLI |
| `src/middleware.ts` | Routing de auth — cambios rompen toda la app |
| `supabase/migrations/` | Solo agregar migraciones nuevas, nunca editar existentes |

## Deploy

```bash
git push origin main   # Vercel despliega automáticamente desde main
```

Variables de entorno: Vercel Dashboard → lec-orb → Settings → Environment Variables.
Monitorear uso de Supabase Storage (bucket `petty-cash-receipts` y documentos).

## Criterio de Done para Cualquier Sprint

- [ ] `npm run build` pasa sin errores
- [ ] `npm run lint` pasa sin errores nuevos
- [ ] `npm run test` pasa (Vitest)
- [ ] Sin regresiones en módulos de finanzas e invitaciones
- [ ] Toda ruta mutante usa `withAuth`
- [ ] Toda tabla nueva tiene RLS habilitado

## Próximos Pasos Documentados

1. KPI cards, gráficas y preview de comprobantes en Caja Chica.
2. Staging smoke tests con Supabase auth real + org de prueba dedicada.
3. Mantener docs alineados cuando cambien rutas, reglas de auth o module slugs.

---

## Agent-Specific

### Para Claude Code
- Usar `/compact` cuando la sesión supere 50 % de contexto útil.
- Correr `npm run build && npm run test` antes de dar por terminado cualquier sprint.
- Al agregar una ruta API nueva, copiar la estructura de `src/app/api/v1/finance/petty-cash/route.ts`.

### Para Antigravity
- Usar el MCP `supabase-lec` con `read_only=true` para inspeccionar la DB.
- No ejecutar migraciones desde el MCP — generar el SQL y pedirle a Luis que lo aplique.
- Al generar componentes UI, seguir el patrón de componentes existentes en `src/components/`.
