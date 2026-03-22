# Documentation Index

Puerta de entrada central para la documentación técnica del repositorio.

Usa este índice para encontrar rápido el documento correcto según el momento en el que estás trabajando: onboarding, desarrollo, deploy, Supabase, CI o release.

## Cómo Usar Este Índice

- si eres nuevo en el proyecto, empieza por **Onboarding**
- si vas a trabajar en código local, revisa **Development**
- si vas a preparar deploy o release, revisa **Deployment**, **Supabase** y **Release**
- si estás investigando una corrección concreta, revisa **Fixes**

## Onboarding

| document | propósito | cuándo leerlo |
| --- | --- | --- |
| [README.md](../README.md) | Resumen general del proyecto, stack, setup local y navegación inicial del repo. | Primer contacto con el repositorio o regreso después de tiempo. |
| [onboarding/developer-onboarding.md](./onboarding/developer-onboarding.md) | Guía de entrada ejecutable para levantar, validar y empezar a contribuir al proyecto. | Cuando un developer entra por primera vez o necesita retomar el proyecto como checklist real. |
| [deployment-audit.md](./deployment-audit.md) | Auditoría inicial de readiness para Vercel y diagnóstico de riesgos del repo. | Cuando necesitas contexto histórico de por qué se abrió el trabajo de hardening. |
| [repo/repository-hygiene.md](./repo/repository-hygiene.md) | Estado de higiene del repositorio, deuda visible y criterios de limpieza. | Cuando quieras entender anomalías del árbol del repo o planear mantenimiento. |

## Development

| document | propósito | cuándo leerlo |
| --- | --- | --- |
| [development/validation-workflow.md](./development/validation-workflow.md) | Flujo local de validación con `typecheck`, `lint`, `build` y `check`. | Antes de desarrollar, abrir PR o validar cambios localmente. |

## Deployment

| document | propósito | cuándo leerlo |
| --- | --- | --- |
| [deployment/environment-variables.md](./deployment/environment-variables.md) | Inventario completo de variables de entorno, matriz por ambiente y configuración en Vercel. | Antes de levantar local, configurar Preview/Production o depurar errores de configuración. |
| [deployment/ci-cd.md](./deployment/ci-cd.md) | Qué valida la pipeline mínima de GitHub Actions y qué queda fuera de CI. | Cuando prepares branch protection, revises CI o quieras endurecer validaciones. |
| [deployment/supabase-release-checklist.md](./deployment/supabase-release-checklist.md) | Checklist operativo de base de datos, auth, storage, RLS y objetos requeridos antes de deploy. | Antes de aplicar migraciones remotas o aprobar un deploy real. |

## Supabase

| document | propósito | cuándo leerlo |
| --- | --- | --- |
| [deployment/supabase-release-checklist.md](./deployment/supabase-release-checklist.md) | Fuente operativa de verdad para objetos, políticas y verificaciones previas a deploy. | Antes de tocar staging o production. |
| [fixes/supabase-migration-bootstrap-strategy.md](./fixes/supabase-migration-bootstrap-strategy.md) | Estrategia dual para ambientes existentes y nuevos, con riesgos del historial heredado. | Cuando necesites bootstrapear un ambiente o decidir cómo promover migraciones sin drift. |
| [fixes/org-documents-storage-provisioning.md](./fixes/org-documents-storage-provisioning.md) | Contrato del bucket `org-documents`, policies y smoke tests de storage multi-tenant. | Antes de validar upload/download o revisar seguridad de Storage. |
| [fixes/registration-slug-alignment.md](./fixes/registration-slug-alignment.md) | Alineación DB-first entre registro y `organizations.slug`. | Cuando revises onboarding, signup o bootstrap de organización. |
| [fixes/audit-log-schema-alignment.md](./fixes/audit-log-schema-alignment.md) | Contrato canónico multi-tenant del módulo de auditoría y reglas de derivación de `org_id`. | Cuando revises audit logs, feed de actividad o migraciones relacionadas. |

## CI/CD

| document | propósito | cuándo leerlo |
| --- | --- | --- |
| [deployment/ci-cd.md](./deployment/ci-cd.md) | Documenta el workflow actual de GitHub Actions y siguientes pasos posibles. | Cuando mantengas CI o quieras agregar tests/deploy gates. |

## Release

| document | propósito | cuándo leerlo |
| --- | --- | --- |
| [release/deploy-readiness-report.md](./release/deploy-readiness-report.md) | Estado más reciente de readiness: blockers, warnings, checks pasados y pasos manuales pendientes. | Antes de declarar que el proyecto está listo para staging o producción. |
| [release/final-release-summary.md](./release/final-release-summary.md) | Resumen consolidado del trabajo de hardening y propuesta de PR/release. | Cuando prepares cierre de branch, PR o handoff a otro reviewer. |
| [release/staging-smoke-test-plan.md](./release/staging-smoke-test-plan.md) | Plan reproducible de smoke tests con Vercel Preview y Supabase staging. | Antes de ejecutar validación runtime en staging. |
| [release/staging-smoke-test-results-template.md](./release/staging-smoke-test-results-template.md) | Plantilla para registrar resultados reales, evidencias y gate final de promoción. | Durante o después de la corrida de smoke tests en staging. |

## Fixes

| document | propósito | cuándo leerlo |
| --- | --- | --- |
| [fixes/typescript-build-fix.md](./fixes/typescript-build-fix.md) | Fix del build/typecheck y normalización de payloads de TypeScript. | Si reaparecen errores de `strict` o build en Next.js. |
| [fixes/demo-mode-hardening.md](./fixes/demo-mode-hardening.md) | Política de activación segura de demo mode y validación fail-fast de envs Supabase. | Si revisas configuración de entornos o comportamiento inesperado entre local y Vercel. |
| [fixes/registration-slug-alignment.md](./fixes/registration-slug-alignment.md) | Decisión y rollout del slug de organizaciones. | Si tocas registro, auth bootstrap u organizaciones. |
| [fixes/org-documents-storage-provisioning.md](./fixes/org-documents-storage-provisioning.md) | Provisioning reproducible de Storage y modelo de seguridad tenant-to-tenant. | Si tocas documentos, Storage o RLS de `storage.objects`. |
| [fixes/audit-log-schema-alignment.md](./fixes/audit-log-schema-alignment.md) | Alineación de lectura/escritura/schema para audit logs. | Si tocas auditoría, dashboard de actividad o triggers. |
| [fixes/supabase-migration-bootstrap-strategy.md](./fixes/supabase-migration-bootstrap-strategy.md) | Riesgos del historial heredado y estrategia recomendada de bootstrap. | Si vas a crear un ambiente nuevo o revisar drift. |

## Recommended Reading Paths

### Nuevo developer

1. [README.md](../README.md)
2. [onboarding/developer-onboarding.md](./onboarding/developer-onboarding.md)
3. [deployment/environment-variables.md](./deployment/environment-variables.md)
4. [development/validation-workflow.md](./development/validation-workflow.md)
5. [release/deploy-readiness-report.md](./release/deploy-readiness-report.md)

### Engineer preparando staging

1. [release/deploy-readiness-report.md](./release/deploy-readiness-report.md)
2. [deployment/environment-variables.md](./deployment/environment-variables.md)
3. [deployment/supabase-release-checklist.md](./deployment/supabase-release-checklist.md)
4. [release/staging-smoke-test-plan.md](./release/staging-smoke-test-plan.md)
5. [release/staging-smoke-test-results-template.md](./release/staging-smoke-test-results-template.md)

### Engineer revisando Supabase

1. [deployment/supabase-release-checklist.md](./deployment/supabase-release-checklist.md)
2. [fixes/supabase-migration-bootstrap-strategy.md](./fixes/supabase-migration-bootstrap-strategy.md)
3. [fixes/registration-slug-alignment.md](./fixes/registration-slug-alignment.md)
4. [fixes/org-documents-storage-provisioning.md](./fixes/org-documents-storage-provisioning.md)
5. [fixes/audit-log-schema-alignment.md](./fixes/audit-log-schema-alignment.md)

## Redundancy Notes

No se borró documentación, pero sí hay solapamientos que conviene tener presentes:

- [deployment-audit.md](./deployment-audit.md), [release/deploy-readiness-report.md](./release/deploy-readiness-report.md) y [release/final-release-summary.md](./release/final-release-summary.md) comparten parte del contexto de readiness. No son equivalentes:
  - `deployment-audit.md` = diagnóstico inicial
  - `deploy-readiness-report.md` = estado actual
  - `final-release-summary.md` = cierre y handoff de release
- [deployment/supabase-release-checklist.md](./deployment/supabase-release-checklist.md) y [fixes/supabase-migration-bootstrap-strategy.md](./fixes/supabase-migration-bootstrap-strategy.md) se cruzan en temas de migraciones. El primero es operacional; el segundo explica la estrategia y el porqué.
- [deployment/environment-variables.md](./deployment/environment-variables.md) y [fixes/demo-mode-hardening.md](./fixes/demo-mode-hardening.md) se tocan en demo mode. La guía de variables es operativa; el fix documenta la decisión técnica.

## Gaps Documentales Restantes

Todavía faltan algunos documentos si el proyecto va a seguir creciendo:

- un overview de arquitectura funcional por módulos del producto
- una guía de seed/datos mínimos para staging y desarrollo
- una guía de testing más allá de `typecheck`, `lint`, `build` y smoke tests
- una guía de troubleshooting de Supabase con consultas de diagnóstico más profundas

Si se crean, este índice debería ser el primer archivo en actualizarse.
