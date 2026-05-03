# LEC Orb — Contexto para Agentes

## Proyecto

SaaS multi-tenant para gestión académica y administrativa de centros de evaluación de idiomas
(Cambridge, TOEFL, CENNI) en México. Empresa: **Languages Education Consulting (LEC)**.
Cada cliente = una `org_id`. Módulos operativos + finanzas (Caja Chica y Presupuesto POA).

**Estética Visual:** Premium SaaS (Dark mode, glassmorphism, temas dinámicos por examen).
**Ingreso principal:** Exámenes Cambridge institucionales — LEC aplica en escuelas, IH (International House) paga a LEC por alumno/examen. Gap crítico: $245K en CxC sin módulo en plataforma → Sprint 2.

**Repo canónico:** `lec-orb` (los proyectos `lec-orb-develop` y `lec-orb-finance` son
referencias históricas — no modificar).

**Contexto de negocio completo:**
```
C:\Users\luuis\.claude\projects\C--Users-luuis-Downloads-Proyectos-LEC-lecorb\memory\
|- MEMORY.md                   <- Indice — leer primero en sesión nueva
|- project_lec_business.md     <- Negocio, organigrama, flujos Cambridge
|- project_ih_billing.md       <- IH Billing: CxC, Excels analizados, modelo de datos
|- project_event_logistics.md  <- Logística de eventos: roles, nómina, P&L por sesión
```

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
# Bash / WSL — produce UTF-8 directamente
npx supabase gen types typescript --project-id <id> > src/types/database.types.ts
# PowerShell — el `>` produce UTF-16 LE y rompe ESLint en CI ("File appears to be binary").
# Usar Out-File con utf8 explícito:
#   npx supabase gen types typescript --project-id <id> | Out-File -Encoding utf8 src/types/database.types.ts
# Tras correr el comando, eliminar la primera línea si el CLI prefijó un warning de npm
# (ej. "Need to install the following packages: supabase@x.y.z").
```

## Patrones Críticos — LEER ANTES DE ESCRIBIR CÓDIGO

### Server Actions — nunca `throw`

En Next.js 15+, lanzar un `throw` dentro de un Server Action produce "Application error"
(pantalla blanca) en producción. **Todos los error paths deben usar `redirect()`.**

```ts
// MAL — causa pantalla blanca en prod
throw new Error('token inválido');

// BIEN — redirige con error inline
redirect(`/join/${token}?error=${encodeURIComponent('Invitación inválida')}`);
```

Las páginas destino leen `searchParams.error` para mostrar el mensaje al usuario.

### Next.js 15+ — `params` y `searchParams` son Promises

En Next.js 15+, acceder a `params.property` sin `await` produce "Application error"
en producción (funciona en dev, falla en build). **Siempre tipar y await los params.**

```tsx
// MAL — falla en producción
export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params; // crash en Next.js 15+
}

// BIEN — patrón obligatorio
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
```

Aplica igual para `searchParams`. Toda página dinámica server-side debe seguir este patrón.

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

### Sentry — bootstrap modernos (no crear archivos legacy)

Stack: `@sentry/nextjs` v10 + Next 15+. La inicialización vive en estos archivos —
**NO crear `sentry.client.config.ts`**, ese patrón legacy duplica `Sentry.init` y
rompe el sample rate.

| Archivo | Runtime |
|---|---|
| `src/instrumentation.ts` | Carga `sentry.server.config.ts` o `sentry.edge.config.ts` según el runtime |
| `src/instrumentation-client.ts` | Browser — equivalente moderno de `sentry.client.config.ts` |
| `sentry.server.config.ts` / `sentry.edge.config.ts` | Sólo `Sentry.init` |
| `next.config.ts` | Envuelto con `withSentryConfig` (source maps, Vercel Cron Monitors) |

### Estética Premium SaaS — Reglas de Oro

1. **Glassmorphism**: Usar `bg-slate-900/60` o similar con `backdrop-blur-md` y bordes `border-slate-700/50`.
2. **Jerarquía Visual**: Los valores principales (KPIs) deben ser el foco, con iconos sutiles (generalmente alineados abajo o arriba del título).
3. **Temas Dinámicos**: En módulos de exámenes (Cambridge, TOEFL), usar el objeto `EXAM_THEMES` para aplicar colores de acento, sombras (*glow*) y anillos de enfoque específicos por nivel (ej. Starters=Purple, FCE=Blue).
4. **Interactividad**: Todo elemento interactivo debe tener transiciones suaves (`duration-300`) y estados hover/focus refinados.
5. **Legibilidad**: Mantener contrastes altos (texto blanco o slate-200 sobre fondos oscuros). Evitar grises lavados en CTAs principales.

Sample rate: 10% en prod, 100% en dev. Project: `orb-lec` (org `luis-aguilar-aguila`).

## Variables de Entorno Requeridas

| Variable | Obligatoria en prod | Notas |
|----------|-------------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Clave pública |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Para invitaciones (bypasea RLS) |
| `NEXT_PUBLIC_APP_URL` | ✅ | Evita links con `localhost` |
| `RESEND_API_KEY` | ✅ | Email de invitaciones |
| `RESEND_FROM_EMAIL` | ✅ | Sender drift en producción |
| `NEXT_PUBLIC_SENTRY_DSN` | ✅ | Error tracking — Sentry project `orb-lec` (org `luis-aguilar-aguila`). Configurada en Vercel (Production + Preview). |
| `SENTRY_AUTH_TOKEN` | ✅ | Source maps upload en build. Local: `.env.sentry-build-plugin`. Producción: Vercel env vars. |

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

## Módulo CENNI (`src/app/api/v1/cenni/`)

Gestión de casos CENNI (Certificado Nacional de Nivel de Idioma).

### Enums y campos clave

- **Estatus** (`cenni_status`): `EN OFICINA` | `SOLICITADO` | `EN TRAMITE/REVISION` | `APROBADO` | `RECHAZADO`
- **Estatus certificado** (`cenni_cert_status`): `APROBADO` | `RECHAZADO` | `EN PROCESO DE DICTAMINACION`
- **Campos:** `folio_cenni`, `cliente_estudiante`, `datos_curp`, `celular`, `correo`,
  `solicitud_cenni BOOL`, `acta_o_curp BOOL`, `id_documento BOOL`,
  `certificado TEXT`, `cliente TEXT`, `estatus`, `estatus_certificado`,
  `fecha_recepcion DATE`, `fecha_revision DATE`, `motivo_rechazo TEXT`, `notes TEXT`
- **Certificado Storage:** `certificate_storage_path TEXT`, `certificate_uploaded_at TIMESTAMPTZ`,
  `certificate_sent_at TIMESTAMPTZ`, `certificate_sent_to TEXT`
- **Soft delete** vía `deleted_at`.
- **Constraint DB:** `UNIQUE(org_id, folio_cenni)` — requerida para upsert masivo.

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/cenni` | Lista casos. Params: `q` (búsqueda), `limit` (max 500, def 300) |
| POST | `/api/v1/cenni` | Crea caso individual |
| PATCH | `/api/v1/cenni/[id]` | Edita caso + audit log |
| DELETE | `/api/v1/cenni/[id]` | Soft delete + audit log |
| POST | `/api/v1/cenni/bulk` | Upsert masivo desde Excel (`onConflict: org_id,folio_cenni`) |
| POST | `/api/v1/cenni/[id]/certificate-upload` | Sube PDF al bucket `cenni-certificates` |
| POST | `/api/v1/cenni/[id]/send-certificate` | Genera signed URL (7 días) y envía por email via Resend |

### Storage

- Bucket: `cenni-certificates`
- Path por caso: `{org_id}/{case_id}.pdf`
- `upsert: true` — reemplaza el PDF si ya existe uno previo
- Para in-app preview: signed URL con expiración 300s
- Para email: signed URL con expiración 7 días

### Import masivo (UI)

- Componente: `src/components/cenni/cenni-import-dialog.tsx`
- Acepta `.xlsx`, `.xls`, `.csv`
- Columnas reconocidas del CSV maestro: `FOLIO CENNI`, `CLIENTE/ESTUDIANTE`, `DATOS CURP`,
  `CELULAR`, `CORREO`, `SOLICITUD CENNI`, `ACTA O CURP`, `ID`, `CERTIFICADO`, `CLIENTE`,
  `ESTATUS`, `RECIBIDO` (→ `fecha_recepcion`), `REVISADO` (→ `fecha_revision`),
  `MOTIVO RECHAZO`, `ESTATUS CERTIFICADO`, `NOTAS`
- Normalización de estatus: `ENVIADO`/`ENVIADO DIGITAL` → `APROBADO`; desconocidos → `EN OFICINA`
- Filas sin folio (casos en trámite sin asignar): se omiten con aviso, no fallan el import
- Upsert por `folio_cenni` — seguro de re-ejecutar

### Migraciones aplicadas

| Archivo | Descripción |
|---------|-------------|
| `006_cenni.sql` | Schema base |
| `20260422_cenni_estatus_and_new_fields.sql` | Enum estatus + campos extra |
| `20260427_cenni_certificate_fields.sql` | Campos certificate_* en cenni_cases |
| `20260427_cenni_unique_folio.sql` | UNIQUE(org_id, folio_cenni) — aplicada en DB |

### UI — tabla principal

- Folio: muestra solo el código sin prefijo "CENNI-" (tooltip con valor completo)
- Columna CURP visible en tabla
- Paginación server-side: 50 registros por página
- Búsqueda de texto: debounce 350ms → query `q` al servidor
- Columnas Recepción y Revisión eliminadas de la tabla (datos se conservan y son editables)

> Después de aplicar migraciones CENNI, regenerar `src/types/database.types.ts`
> con: `npx supabase gen types typescript --project-id yyuegezottorxuxdfrpi > src/types/database.types.ts`
> **Nota:** el CLI puede prefijar el output con un warning de npm — eliminar las primeras líneas si sucede.
> **PowerShell:** usar `| Out-File -Encoding utf8 ...` en lugar de `>` (el redirect default produce UTF-16 LE, ESLint lo rechaza como binario en CI).

## Invitaciones

**Flujo completo:**
1. Admin crea invitación desde `/dashboard/users` → `POST /api/v1/invitations`
2. El servidor devuelve `invitation` + `joinUrl` (siempre, incluso si el email falla)
3. Admin comparte `joinUrl` manualmente si Resend no está configurado
4. Usuario visita el enlace `/join/[token]` → se le pide login/registro si no está autenticado
5. Después del login, se redirige a `/join/[token]?next=...` preservando el token
6. El usuario acepta → RPC atómica `fn_accept_invitation` procesa la invitación

**Archivos clave:**
- `src/app/join/[token]/page.tsx` — página de aceptación
- `src/app/join/[token]/actions.ts` — Server Action (nunca throw, siempre redirect)
- `src/app/join/[token]/queries.ts` — queries con admin client

**Endpoints de limpieza:**
- `DELETE /api/v1/invitations/[id]` — elimina invitación individual (no-pendiente)
- `DELETE /api/v1/invitations/cleanup` — elimina todas las no-pendientes (historial)

**Reglas:**
- Email (Resend) es opcional — `joinUrl` es el fallback confiable.
- Si el email falla, el flujo de invitación NO debe fallar.
- `SUPABASE_SERVICE_ROLE_KEY` es obligatoria en producción para la RPC.
- ✅ Resend configurado y enviando (abril 2026). `RESEND_FROM_EMAIL` debe usar formato
  `Nombre <email@dominio.com>` y el dominio debe estar verificado en Resend.
- Al firmarse un usuario con invitación pendiente, `handle_new_user` **no** crea org personal
  (evita el bug de doble membership → `.single()` 403). El trigger `fn_audit_log` llena tanto
  `operation` (NOT NULL) como la columna legacy `action`.

**Vencimiento automático (abril 2026):**
- `org_invitations.expires_at` (NOT NULL, default `now() + 7 days`).
- POST `/api/v1/invitations` acepta `expiresInDays` opcional (1–60). Sin override usa el default de la DB.
- POST `/api/v1/invitations/[id]/resend` extiende `expires_at` a `now() + 7 days` al reenviar.
- DELETE `/api/v1/invitations/cleanup` ahora hace dos pasos: (1) flip `pending → expired` para vencidas, (2) borra todas las no-pending.
- RPC `fn_accept_invitation` retorna `code='EXPIRED'` y flippea status a `'expired'` cuando el token aún es pending pero `expires_at < now()`. La página `/join/[token]` recibe `?expired=1` para renderizar CTA de "pedir nueva invitación" (UI pendiente).
- RPC helper `fn_expire_old_invitations()` (service_role only): bulk-flip de pendientes vencidas. Listo para colgarse de un cron.
- Migración: `20260428_org_invitations_expires_at.sql`. Tras aplicar, regenerar `database.types.ts`.

## Testing

```
Vitest   → unit/integration (src/tests/)
           26 archivos, 164 tests — 22/22 módulos API cubiertos
           cenni.test.ts: 27 tests (GET, POST, PATCH, DELETE, bulk, cert-upload, send-cert)
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
- [ ] `npm run lint` pasa sin errores nuevos (warnings OK)
- [ ] `npm run test` pasa (Vitest)
- [ ] Sin regresiones en módulos de finanzas e invitaciones
- [ ] Toda ruta mutante usa `withAuth`
- [ ] Toda tabla nueva tiene RLS habilitado
- [ ] Si se regeneró `database.types.ts`: confirmar UTF-8 (no UTF-16) — `file src/types/database.types.ts` debe decir "ASCII text" o "UTF-8"

## Módulo IH Billing — Sprint 2 (ANALIZADO, pendiente implementar)

Ver contexto completo en `memory/project_ih_billing.md`.

### Qué hace

Reemplaza los Excels `DESGLOSE 2025-2026.xlsx` y `PAGOS IH LEC v1.xlsx`.
Registra sesiones aplicadas, facturas emitidas a IH, pagos recibidos y calcula saldo pendiente.

### Tablas propuestas

```sql
ih_sessions   (org_id, school_name, exam_type, session_date, students_applied, tariff,
               students_paid_ih, amount_paid_ih, balance, status, ih_invoice_id)
ih_invoices   (org_id, invoice_number, region, period_label, total_amount, status)
ih_payments   (org_id, payment_date, amount, region, reference)
ih_tariffs    (org_id, year, exam_type, tariff)  -- editable, historial 2023-2026 disponible
```

### Endpoints propuestos

```
GET/POST  /api/v1/finance/ih/sessions
POST      /api/v1/finance/ih/sessions/import   <- import masivo desde Excel
PATCH     /api/v1/finance/ih/sessions/[id]
GET/POST  /api/v1/finance/ih/invoices
GET/POST  /api/v1/finance/ih/payments
GET       /api/v1/finance/ih/summary            <- dashboard CxC: ejecutado/pagado/saldo/alertas
GET/POST  /api/v1/finance/ih/tariffs/[year]
```

### Tarifas IH → LEC por alumno (historial completo)

| Examen | 2023 | 2024 | 2025 | 2026 |
|--------|------|------|------|------|
| YLE Starters | $250.80 | $270.69 | $275.69 | $332 |
| YLE Movers | $267.60 | $288.79 | $293.79 | $354 |
| YLE Flyers | $276.00 | $298.28 | $303.28 | $366 |
| KEY FS | $382.50 | $409.14 | $543.14 | $499 |
| PET FS | $394.80 | $422.93 | $556.93 | $516 |
| FCE FS | $614.80 | $663.10 | $787.10 | $812 |

### Tarifas LEC → Aplicadores por hora

| Rol | 2024 (YLE/general) | 2024 (KEY/KET) | 2026 (todos) |
|-----|-------------------|----------------|-------------|
| SE (Speaking Examiner) | $285 | $285 | **$300** |
| SE-Remoto | $285 | $285 | **$300** |
| ADMIN | $285 | $335 | **$300** |
| INVIGILATOR | $165 | $215 | **$300** |
| SUPER | $165 | $165 | **$200** |

Notas: En 2024 KET tenía tarifa especial (ADMIN $335, INVIG $215). En 2026 se homologó todo a $300 (excepto SUPER $200). Marisela Castillo en 2024 tenía cuota fija $1,850 por evento como SE-YLE en Larrea.

### Estado CxC al 15/abril/2026

- Total pendiente: **$245,425** (Sonora $179,488 + BC $65,937)
- Alerta urgente: Colegio Larrea **$149,672** — 6+ semanas vencido

---

## Módulo Logística de Eventos — Sprint 3 (ANALIZADO, pendiente implementar)

Ver contexto completo en `memory/project_event_logistics.md`.

### Qué hace

Reemplaza `LOGISTICA_UNOi 2026.xlsx`. Asigna aplicadores por rol a cada evento,
calcula nómina automática y genera P&L por sesión.

### Roles de aplicadores por evento

| Rol | Descripción |
|-----|-------------|
| SE | Speaking Examiner (debe estar certificado para ese nivel) |
| SE-Remoto | Speaking Examiner vía Zoom |
| ADMIN | Administra examen escrito |
| INVIGILATOR | Vigila sala durante escrito |
| SUPER | Supervisor del evento completo |

### Tablas propuestas

```sql
applicator_event_roles   (event_session_id, applicator_id, role, hours, tariff_per_hour,
                          viatics_amount, subtotal)
duration_lookup          (exam_type, students_min, students_max, se_count, hours_speaking)
applicator_role_tariffs  (org_id, year, role, tariff_per_hour)
```

### P&L por sesión

```
Ingreso IH (alumnos × tarifa)
- Nómina aplicadores (horas × tarifa por rol)
- Viáticos (transporte + hospedaje + alimentación)
= Comisión LEC
```

---

## Módulo Viáticos — Sprint 2

Basado en formato oficial `SOLICITUD DE GASTOS DE VIAJE O VIATICOS (1).xlsx` Rev.02.

```sql
viaticos (
  org_id, applicator_id, event_session_id,
  fecha, motivo, unidad_responsable,
  ruta_salida, ruta_regreso,
  tipo_transporte TEXT CHECK ('AEREO','TERRESTRE','VEHICULO_PROPIO'),
  -- Presupuestado
  ppto_aereos, ppto_gasolina, ppto_taxis, ppto_casetas,
  ppto_hospedaje, ppto_alimentacion, ppto_otros,
  -- Real (con factura)
  real_aereos, real_gasolina, real_taxis, real_casetas,
  real_hospedaje, real_alimentacion, real_otros,
  comprobante_path,  -- Storage bucket 'viaticos-receipts'
  status TEXT CHECK ('SOLICITADO','APROBADO','COMPROBADO','RECHAZADO'),
  aprobado_por UUID
)
```

**Regla operativa:** Las diferencias de viáticos no comprobadas se descuentan de la nómina del empleado (campo `Dif Viáticos` en `REPORTE SEMANAL DE NOMINA.xlsx`).

**Pendiente de decisión:**
- ¿Por aplicador (campo event_session_id nullable) o siempre ligado a evento?
- ¿Módulo separado o tab dentro de Eventos?

---

## Ecosistema paralelo — Dashboard 360 HR

**No es parte de LEC Orb.** Es una herramienta HR interna construida con Antigravity AI (Gemini).

| Componente | Ruta |
|-----------|------|
| Generador Node.js | `C:\Users\luuis\.gemini\antigravity\scratch\hr_parser\build_app.js` |
| Output HTML | `LISTA MAESTRA DOCUMENTOS\02_RRHH_Recursos_Humanos\dashboard_perfiles.html` |
| Tablas Supabase que usa | `kpi_metrics`, `risk_assessments` (mismo Supabase que LEC Orb) |

**Gap actual:** El dashboard no consume datos de Supabase — usa seeds hardcodeados. `SGC_SYNC_WORKFLOW.json` (n8n) ya puebla `kpi_metrics` y `risk_assessments` pero el HTML no las lee.

**Oportunidad (Sprint 5):** El dashboard de LEC Orb podría consumir las mismas tablas `kpi_metrics` y `risk_assessments` que ya alimenta el workflow n8n.

---

## Próximos Pasos Documentados

### Sprint 2 — Completado y Cierres Técnicos

**Hitos Recientes:**
- ✅ **Auditoría Visual Premium**: Refinamiento estético completado en toda la plataforma (Mayo 2026).
- ✅ **Calculadora 2.0**: Layout simétrico y temas dinámicos por examen.
- ✅ **Fix SGC**: Resuelto crash de navegación y scroll de sidebar.
- ✅ **Viáticos**: Módulo integrado (PR #29) y migración aplicada.
- ✅ **Nombre Institucional**: Actualizado a "Languages Education Consulting".

**Prioridad Alta:**
1. Dashboard CENNI: Refinar vista de estadísticas si es necesario (ya cuenta con cards y barras).
2. Smoke test de viáticos en producción.

### Pendientes técnicos (cualquier sprint)

1. **Smoke test** de viáticos en dashboard productivo.
2. **Validación** de 9 grupos de permisos con gerencia.
3. **KPI cards** adicionales en Caja Chica.

### Prioridad media/baja

- KPI cards y gráficas en Caja Chica
- Dashboard CENNI: cards por estatus + gráfica (Sprint 5, el endpoint ya retorna `cenni.byStatus`)
- Permisos por puesto (9 grupos propuestos en Obsidian — pendiente validación con gerencia)
- Staging environment con org de prueba dedicada
- Portal de aplicadores (construido, no terminado)
- DMS: control de revisiones y versiones
- IELTS / OOPT: sin módulo en plataforma

---

**Completado — Sprint 1 (abril 2026):**
- ✅ `DEMO_MODE` eliminado de todos los archivos de producción (10 archivos)
- ✅ Bug `event_sessions` sin `org_id` en `dashboard/stats/route.ts` — corregido con JOIN `events!inner`
- ✅ `login/page.tsx` sin botón "Modo Demo"
- ✅ `lib/supabase/proxy.ts` sin early return de DEMO_MODE
- ✅ Build limpio + 26 archivos test + 164 tests verdes
- ⚠️ `lib/demo/config.ts` y `lib/demo/data.ts` **NO eliminar** — los tests los usan con mock `DEMO_MODE=false`

**Completado abril 2026 (Sentry):**
- ✅ `@sentry/nextjs` v10 instalado y configurado
- ✅ Bootstrap server/edge en `src/instrumentation.ts`
- ✅ Bootstrap browser en `src/instrumentation-client.ts` (NO usar el legacy `sentry.client.config.ts`)
- ✅ `withSentryConfig` en `next.config.ts` (source maps + Vercel Cron Monitors)
- ✅ Env vars `NEXT_PUBLIC_SENTRY_DSN` y `SENTRY_AUTH_TOKEN` activas en Vercel
- ✅ Sample rate: 10% en prod, 100% en dev

**Completado abril 2026 (Sentry):**
- ✅ `@sentry/nextjs` v10 instalado y configurado
- ✅ Bootstrap server/edge en `src/instrumentation.ts`
- ✅ Bootstrap browser en `src/instrumentation-client.ts` (NO usar el legacy `sentry.client.config.ts`)
- ✅ `withSentryConfig` en `next.config.ts` (source maps + Vercel Cron Monitors)
- ✅ Env vars `NEXT_PUBLIC_SENTRY_DSN` y `SENTRY_AUTH_TOKEN` activas en Vercel
- ✅ Sample rate: 10% en prod, 100% en dev

**Completado en sprint abril 2026 (CENNI):**
- ✅ Audit logging en PATCH/DELETE/bulk de cenni_cases
- ✅ Paginación server-side + búsqueda por texto en tabla CENNI
- ✅ Subida de certificados PDF a Supabase Storage (`cenni-certificates`)
- ✅ Envío de certificado por email via Resend (signed URL 7 días)
- ✅ Import masivo desde Excel con upsert por folio
- ✅ UNIQUE(org_id, folio_cenni) constraint aplicada en DB
- ✅ UI: folio sin prefijo, columna CURP, columnas Recepción/Revisión eliminadas
- ✅ Visor PDF integrado: botón ojo en tabla Certificados abre Dialog con iframe (signed URL 300s). Ícono: `Eye`. Dialog: max-w-4xl / 90vh.

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
