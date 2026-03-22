# Developer Onboarding

Guía de entrada para levantar, entender y contribuir al proyecto sin depender de contexto oral.

## Objetivo De Esta Guía

Al terminar esta guía deberías poder:

- instalar el proyecto localmente
- configurar `.env.local`
- correr la aplicación
- validar tus cambios antes de push
- entender dónde entra Supabase en la arquitectura
- saber qué documentos leer después según tu tarea

## Qué Es El Proyecto

`LEC Platform` es una plataforma interna multi-tenant para operación académica y administrativa de Language Evaluation Center.

El sistema concentra funcionalidades como:

- autenticación y onboarding de usuarios
- organizaciones y membresías
- control de accesos por rol y por `member_module_access`
- eventos, aplicadores y catálogos
- pagos, cotizaciones y órdenes
- documentos con Supabase Storage
- auditoría de actividad por organización

## Stack Y Componentes Clave

### Frontend y runtime

- Next.js 16
- React 19
- App Router
- Tailwind CSS 4

### Tipado y validación

- TypeScript 5
- Zod

### Backend y datos

- Supabase Auth
- Supabase Postgres
- Supabase Storage
- RLS y funciones SQL en `supabase/migrations/`

### Calidad y automatización

- ESLint
- GitHub Actions CI
- validación local con `typecheck`, `lint`, `build` y `check`

## Estructura Mental Del Repo

### Código principal

- `src/app/`
  Páginas App Router y API routes (`/api/v1/...`)

- `src/components/`
  Componentes UI y componentes de dominio

- `src/lib/`
  Auth, Supabase, permisos, helpers y lógica compartida

### Infraestructura y operación

- `supabase/migrations/`
  Historial SQL del esquema y fixes de release

- `docs/`
  Runbooks, fixes, release readiness y onboarding

- `.github/workflows/`
  Pipeline mínima de CI

## Prerequisitos

- Node.js 20.x
- npm 10+ recomendado
- acceso a un proyecto Supabase de desarrollo o staging
- acceso al proyecto de Vercel si vas a validar Preview deployments

Útiles pero opcionales:

- Supabase CLI
- Vercel CLI

## Cómo Clonar E Instalar

1. Clona el repositorio.
2. Entra al directorio del proyecto.
3. Instala dependencias:

```bash
npm install
```

## Cómo Configurar `.env.local`

1. Copia el ejemplo:

```bash
cp .env.example .env.local
```

2. Llena como mínimo:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Deja `NEXT_PUBLIC_DEMO_MODE=false` salvo que estés haciendo una corrida local controlada de demo.

Importante:

- Preview y Production no usan demo mode
- si dejas placeholders o faltan env vars de Supabase, la app ahora falla explícitamente

Referencia:

- [../deployment/environment-variables.md](../deployment/environment-variables.md)
- [../fixes/demo-mode-hardening.md](../fixes/demo-mode-hardening.md)

## Cómo Correr Local

Inicia el entorno local:

```bash
npm run dev
```

Luego abre:

```text
http://localhost:3000
```

Pantallas útiles para una primera validación:

- `/login`
- `/register`
- `/dashboard`

## Cómo Validar Cambios Antes De Push

Usa el gate local completo:

```bash
npm run check
```

Si necesitas correr pasos separados:

```bash
npm run typecheck
npm run lint
npm run build
```

Qué esperar:

- `typecheck` debe pasar
- `lint` hoy puede reportar warnings heredados, pero no errores
- `build` debe pasar

Referencia:

- [../development/validation-workflow.md](../development/validation-workflow.md)

## Cómo Entender La Relación Con Supabase

Supabase no es un detalle accesorio del proyecto; es parte central del runtime.

### Auth

- login y registro dependen de Supabase Auth
- el bootstrap de usuario/organización depende de triggers y funciones SQL

### Database

- la app usa tablas multi-tenant con `org_id`
- varias garantías del sistema viven en RLS, triggers y migraciones

### Storage

- documentos usan el bucket `org-documents`
- el path se construye server-side con `org_id`
- el aislamiento tenant-to-tenant se refuerza con policies

### Importante para desarrollo

No asumas que el historial de `supabase/migrations/` es bootstrap-safe en vacío. Hay historia heredada, patches y fixes que requieren lectura consciente.

Documentos clave:

- [../deployment/supabase-release-checklist.md](../deployment/supabase-release-checklist.md)
- [../fixes/supabase-migration-bootstrap-strategy.md](../fixes/supabase-migration-bootstrap-strategy.md)
- [../fixes/registration-slug-alignment.md](../fixes/registration-slug-alignment.md)
- [../fixes/org-documents-storage-provisioning.md](../fixes/org-documents-storage-provisioning.md)
- [../fixes/audit-log-schema-alignment.md](../fixes/audit-log-schema-alignment.md)

## Qué Leer Después

### Si vas a trabajar en setup, envs o Vercel

- [../deployment/environment-variables.md](../deployment/environment-variables.md)
- [../deployment/ci-cd.md](../deployment/ci-cd.md)
- [../release/deploy-readiness-report.md](../release/deploy-readiness-report.md)

### Si vas a tocar backend o Supabase

- [../deployment/supabase-release-checklist.md](../deployment/supabase-release-checklist.md)
- [../fixes/supabase-migration-bootstrap-strategy.md](../fixes/supabase-migration-bootstrap-strategy.md)

### Si vas a preparar staging o release

- [../release/staging-smoke-test-plan.md](../release/staging-smoke-test-plan.md)
- [../release/staging-smoke-test-results-template.md](../release/staging-smoke-test-results-template.md)
- [../release/deploy-readiness-report.md](../release/deploy-readiness-report.md)

### Si quieres navegar toda la documentación

- [../INDEX.md](../INDEX.md)

## Errores Comunes Al Comenzar

### 1. Levantar el proyecto con env vars incompletas

Síntoma:

- error de configuración de Supabase al iniciar o al navegar

Qué revisar:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- que no estés usando el placeholder de `.env.example`

### 2. Asumir que demo mode resolverá una mala configuración

Ya no funciona así.

- demo mode solo aplica en desarrollo local
- no se activa por placeholders
- Preview y Production fallan explícitamente si la config es incorrecta

### 3. Asumir que `supabase db push` en vacío es seguro

No lo es por defecto en este repo.

Antes de hacerlo, lee:

- [../fixes/supabase-migration-bootstrap-strategy.md](../fixes/supabase-migration-bootstrap-strategy.md)

### 4. Pensar que `build` verde significa release listo

No basta.

Todavía hay validaciones runtime que dependen de:

- staging Supabase real
- Preview deployment real
- smoke tests documentados

### 5. No entender por qué un usuario no-admin no puede entrar

Revisa:

- `org_members`
- `member_module_access`
- permisos por módulo

Referencia:

- [../deployment/supabase-release-checklist.md](../deployment/supabase-release-checklist.md)

## Gaps Y Conocimiento Manual Que Aún Existen

La documentación ya cubre bastante, pero todavía hay gaps reales:

- no existe todavía una guía formal de arquitectura por módulos funcionales
- no hay estrategia de seeds mínimos para staging/dev suficientemente consolidada
- el historial de migraciones heredadas requiere criterio técnico, no solo ejecución mecánica
- los smoke tests de staging siguen siendo paso obligatorio antes de declarar producción lista

En otras palabras: un developer nuevo ya puede levantar y trabajar en el proyecto con esta guía, pero para cambios profundos en Supabase o para un release real todavía hace falta leer los runbooks de `docs/deployment/`, `docs/fixes/` y `docs/release/`.

## Checklist Rápido De Entrada

- [ ] instalar Node.js 20.x
- [ ] correr `npm install`
- [ ] crear `.env.local` desde `.env.example`
- [ ] configurar `NEXT_PUBLIC_SUPABASE_URL`
- [ ] configurar `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] correr `npm run dev`
- [ ] correr `npm run check`
- [ ] leer [../deployment/environment-variables.md](../deployment/environment-variables.md)
- [ ] leer [../deployment/supabase-release-checklist.md](../deployment/supabase-release-checklist.md)
- [ ] revisar [../release/deploy-readiness-report.md](../release/deploy-readiness-report.md)
