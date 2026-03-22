# LEC Platform

Plataforma interna multi-tenant para operación académica y administrativa de Language Evaluation Center.

El proyecto centraliza flujos de autenticación, organizaciones, usuarios, permisos, eventos, aplicadores, CENNI, pagos, documentos y auditoría sobre una stack Next.js + TypeScript + Supabase, con despliegue objetivo en Vercel.

## Qué Hace La Plataforma

La aplicación combina módulos operativos y administrativos para:

- gestión de organizaciones y membresías
- autenticación y onboarding de usuarios
- control de accesos por rol y por `member_module_access`
- operación de eventos, aplicadores y catálogos
- flujos de pagos, cotizaciones y órdenes
- gestión documental con Supabase Storage
- auditoría de actividad por organización

## Stack Principal

- Next.js 16
- React 19
- TypeScript 5
- Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- Tailwind CSS 4
- ESLint 9
- GitHub Actions para CI
- Vercel como plataforma de deploy objetivo

## Estado Actual

Estado de release actual: revisar [docs/release/deploy-readiness-report.md](docs/release/deploy-readiness-report.md).

En el estado documentado más reciente:

- `npm run typecheck` pasa
- `npm run lint` pasa con warnings heredados
- `npm run build` pasa
- sigue siendo obligatorio validar staging con Supabase real y un Preview deployment antes de promover a producción

## Estructura Del Repositorio

```text
.
├─ src/
│  ├─ app/            App Router, páginas y API routes
│  ├─ components/     UI y componentes de dominio
│  └─ lib/            auth, supabase, permisos, helpers y lógica compartida
├─ supabase/
│  └─ migrations/     historial SQL del esquema y hardening de release
├─ docs/
│  ├─ deployment/     variables de entorno, CI/CD y checklist de Supabase
│  ├─ development/    flujo de validación local
│  ├─ fixes/          decisiones y remediaciones técnicas
│  ├─ release/        readiness, smoke plan y cierre de release
│  └─ repo/           higiene y mantenimiento del repositorio
├─ tests/             guards ligeros y pruebas de regresión de fixes
├─ public/            assets estáticos
├─ scripts/           utilidades auxiliares
└─ .github/workflows/ CI de GitHub Actions
```

## Requisitos Previos

- Node.js 20.x
- npm 10+ recomendado
- cuenta/proyecto de Supabase para desarrollo o staging
- acceso al proyecto de Vercel si vas a validar Preview/Production

Opcional pero útil:

- Supabase CLI
- Vercel CLI

## Instalación Local

1. Instala dependencias:

```bash
npm install
```

2. Crea tu archivo local de variables:

```bash
cp .env.example .env.local
```

3. Configura al menos:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. Inicia el servidor local:

```bash
npm run dev
```

5. Abre `http://localhost:3000`

## Variables De Entorno

El proyecto usa una superficie de configuración pequeña, pero crítica.

Variables principales:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_DEMO_MODE` solo para desarrollo local controlado

Referencias:

- ejemplo base: [`.env.example`](.env.example)
- guía completa: [docs/deployment/environment-variables.md](docs/deployment/environment-variables.md)
- hardening de demo mode: [docs/fixes/demo-mode-hardening.md](docs/fixes/demo-mode-hardening.md)

Importante:

- Preview y Production no deben entrar en demo mode
- si la configuración de Supabase falta o usa placeholders, la app ahora falla explícitamente en vez de degradarse a demo

## Comandos Importantes

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
npm run check
```

Qué hace cada uno:

- `npm run dev`: servidor local
- `npm run typecheck`: `tsc --noEmit`
- `npm run lint`: ESLint del repo
- `npm run build`: build de producción de Next.js
- `npm run check`: gate local completo de typecheck + lint + build

## Flujo De Validación Local

Antes de abrir PR o preparar deploy:

```bash
npm run check
```

Referencia detallada:

- [docs/development/validation-workflow.md](docs/development/validation-workflow.md)

## Supabase Y Migraciones

La base de datos no debe tratarse como un proyecto bootstrap-safe desde cero sin revisión.

Puntos clave:

- el historial mezcla baselines numerados y patches fechados
- hay migraciones heredadas que no son replay-safe en vacío
- staging debe ensayar el set exacto de migraciones antes de producción

Referencias:

- checklist operativo: [docs/deployment/supabase-release-checklist.md](docs/deployment/supabase-release-checklist.md)
- estrategia de bootstrap/migraciones: [docs/fixes/supabase-migration-bootstrap-strategy.md](docs/fixes/supabase-migration-bootstrap-strategy.md)

Comandos típicos con Supabase CLI:

```bash
supabase link --project-ref <project-ref>
supabase migration list
supabase db push
```

## Deploy En Vercel

La app está pensada para desplegarse en Vercel con Supabase como backend real.

Antes de deploy:

- configura `NEXT_PUBLIC_SUPABASE_URL`
- configura `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- confirma que `NEXT_PUBLIC_DEMO_MODE` esté ausente o en `false`
- valida staging con Preview deployment + Supabase staging

Referencias:

- variables de entorno: [docs/deployment/environment-variables.md](docs/deployment/environment-variables.md)
- readiness actual: [docs/release/deploy-readiness-report.md](docs/release/deploy-readiness-report.md)
- smoke plan de staging: [docs/release/staging-smoke-test-plan.md](docs/release/staging-smoke-test-plan.md)

## CI/CD

Existe un workflow mínimo de CI en GitHub Actions que valida:

- `npm run typecheck`
- `npm run lint`
- `npm run build`

Referencia:

- [docs/deployment/ci-cd.md](docs/deployment/ci-cd.md)

## Navegación Rápida De Documentación

Índice principal recomendado:

- [docs/INDEX.md](docs/INDEX.md)

### Release y operación

- [docs/release/deploy-readiness-report.md](docs/release/deploy-readiness-report.md)
- [docs/release/final-release-summary.md](docs/release/final-release-summary.md)
- [docs/release/staging-smoke-test-plan.md](docs/release/staging-smoke-test-plan.md)
- [docs/release/staging-smoke-test-results-template.md](docs/release/staging-smoke-test-results-template.md)

### Deploy

- [docs/deployment/environment-variables.md](docs/deployment/environment-variables.md)
- [docs/deployment/ci-cd.md](docs/deployment/ci-cd.md)
- [docs/deployment/supabase-release-checklist.md](docs/deployment/supabase-release-checklist.md)
- [docs/deployment-audit.md](docs/deployment-audit.md)

### Fixes y decisiones técnicas

- [docs/fixes/typescript-build-fix.md](docs/fixes/typescript-build-fix.md)
- [docs/fixes/registration-slug-alignment.md](docs/fixes/registration-slug-alignment.md)
- [docs/fixes/org-documents-storage-provisioning.md](docs/fixes/org-documents-storage-provisioning.md)
- [docs/fixes/audit-log-schema-alignment.md](docs/fixes/audit-log-schema-alignment.md)
- [docs/fixes/demo-mode-hardening.md](docs/fixes/demo-mode-hardening.md)
- [docs/fixes/supabase-migration-bootstrap-strategy.md](docs/fixes/supabase-migration-bootstrap-strategy.md)

### Mantenimiento del repositorio

- [docs/repo/repository-hygiene.md](docs/repo/repository-hygiene.md)

## Troubleshooting Básico

### La app falla al iniciar con error de Supabase config

Verifica:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- que no estés usando el placeholder de `.env.example`

Referencia:

- [docs/deployment/environment-variables.md](docs/deployment/environment-variables.md)

### El login funciona pero el usuario no ve módulos

Revisa:

- fila en `org_members`
- filas en `member_module_access`
- permisos por rol y módulo

Referencia:

- [docs/deployment/supabase-release-checklist.md](docs/deployment/supabase-release-checklist.md)

### El registro crea el usuario pero no queda operable

Revisa si staging/producción tiene aplicada la migración de alineación de `organizations.slug`.

Referencia:

- [docs/fixes/registration-slug-alignment.md](docs/fixes/registration-slug-alignment.md)

### Documentos no suben o no descargan

Revisa:

- bucket `org-documents`
- policies de `storage.objects`
- path server-side por organización

Referencia:

- [docs/fixes/org-documents-storage-provisioning.md](docs/fixes/org-documents-storage-provisioning.md)

### La auditoría no muestra eventos esperados

Revisa:

- migración `20260322_audit_log_schema_alignment.sql`
- RLS de `audit_log`
- que el evento auditado tenga derivación segura de `org_id`

Referencia:

- [docs/fixes/audit-log-schema-alignment.md](docs/fixes/audit-log-schema-alignment.md)

## Punto De Partida Recomendado Para Un Developer Nuevo

1. Lee este `README.md`
2. Configura `.env.local` desde [`.env.example`](.env.example)
3. Ejecuta `npm install`
4. Ejecuta `npm run check`
5. Revisa:
   - [docs/deployment/environment-variables.md](docs/deployment/environment-variables.md)
   - [docs/deployment/supabase-release-checklist.md](docs/deployment/supabase-release-checklist.md)
   - [docs/release/deploy-readiness-report.md](docs/release/deploy-readiness-report.md)

Con eso deberías entender qué es el proyecto, cómo levantarlo, qué riesgos siguen abiertos y por qué documentos continuar.
