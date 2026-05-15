---
title: "Coordinación proyectos LEC — módulo nativo"
slug: coordinacion-proyectos-lec
date: 2026-05-14
updated: 2026-05-15
status: active
audience: [engineering, operations, product]
related_components:
  - next-app
  - supabase
  - module-registry
  - sidebar-nav
---

# Coordinación proyectos LEC (módulo nativo)

Reemplaza el flujo manual basado en Excel (**INDICADORES PROYECTOS**, **EXAMENES 2026**, listados de cursos) con datos **tenant-scoped** (`org_id`), RLS y API versionada. **No** sustituye al PM Kanban (`project-management` / `pm_*`): aquí vive el **concentrado comercial-operativo**; el tablero de tareas sigue en [Proyectos (Empresa)](./PROJECT_MANAGEMENT_MODULE.md).

**Contexto de los cuatro ejes LEC** (Exámenes, Feria del Libro, Académica, este hub): [COORDINACIONES_LEC_ARQUITECTURA.md](./COORDINACIONES_LEC_ARQUITECTURA.md).

| Concepto | Valor |
|----------|--------|
| **Slug RBAC / `member_module_access.module`** | `coordinacion-proyectos-lec` |
| **Ruta UI** | `/dashboard/coordinacion-proyectos-lec` y subrutas (shell con pestañas) |
| **API base** | `/api/v1/coordinacion-proyectos/` |
| **Migración SQL** | `supabase/migrations/20260614_coordinacion_proyectos_lec.sql` |
| **Código UI** | `src/app/(dashboard)/dashboard/coordinacion-proyectos-lec/` |
| **Esquemas Zod** | `src/lib/coordinacion-proyectos/schemas.ts` |
| **Constante módulo** | `CP_MODULE` en `schemas.ts` (mismo string que slug) |

**Wiki operativa (pasos para coordinación):** [coordinacion-proyectos-lec.md](./wiki/coordinacion-proyectos-lec.md)

**Auditoría (paths, API, UI, runbook, checklist claro/oscuro):** [coordinacion-proyectos-lec-auditoria-ui-runbook.md](./wiki/coordinacion-proyectos-lec-auditoria-ui-runbook.md)

---

## 1. Diferencia vs Proyectos (Empresa) — PM

| Aspecto | Coordinación proyectos LEC | PM (`project-management`) |
|---------|---------------------------|---------------------------|
| Modelo de datos | Filas de negocio: proyectos institucionales, líneas de examen, cursos | `pm_projects`, `pm_tasks`, tableros Kanban |
| Objetivo | Indicadores, ingresos, beneficiados, evidencias de cierre | Ejecución interna de trabajo |
| Slug | `coordinacion-proyectos-lec` | `project-management` |

Opcional: `lec_program_projects.pm_project_id` → enlace a un `pm_project` para seguimiento de tareas sin mezclar modelos.

---

## 2. Tablas (Supabase)

| Tabla | Descripción |
|-------|-------------|
| `lec_cp_departments` | Catálogo departamentos por org (`UNIQUE(org_id, name)`). |
| `lec_cp_exam_types` | Catálogo tipos de examen (YLE, TOEFL, etc.). |
| `lec_cp_product_services` | Catálogo producto/servicio (Exámenes, Curso, Plataforma, Feria…). |
| `lec_program_projects` | Concentrado: `period_month` (date primer día del mes), departamento, descripción, `client_type`, producto, beneficiados, `revenue_amount`, `size_code` (MI/C/M/G), evidencias URL, `checklist_done`, FK opcionales a `schools`, `events`, `crm_opportunities`, `pm_projects`. |
| `lec_exam_sales_lines` | Líneas mensuales tipo Excel exámenes: candidato/institución, tipo, cantidad, monto, confirmación, etc. |
| `lec_course_offerings` | Cursos operativos (nombre, fechas, participantes, precio); distinto del **simulador** en `/dashboard/academico/cursos` (`/api/v1/courses`). |
| `lec_kpi_size_comparison` | Comparativos por `bucket_key` (`grandes`, `medianos`, `chicos`, `micro`, `totales`). |

**RLS:** SELECT para cualquier miembro de la org; INSERT/UPDATE/DELETE para roles `admin`, `supervisor`, `operador` (misma filosofía que otras tablas operativas).

Tras aplicar la migración en Supabase, regenerar `src/types/database.types.ts` con el CLI (`CLAUDE.md` / `AGENTS.md` — cuidado con encoding en PowerShell).

---

## 3. API — resumen de endpoints

Todos usan `withAuth` y el módulo `coordinacion-proyectos-lec` con acciones `view` | `edit` | `delete` según ruta. Mutaciones registran `logAudit` (tabla afectada).

| Método | Ruta | Acción | Descripción |
|--------|------|--------|-------------|
| GET | `/coordinacion-proyectos/overview` | view | KPIs agregados: `?year=YYYY` (conteos, sumas de beneficiarios/ingresos proyectos, líneas de examen, cursos). |
| GET | `/coordinacion-proyectos/program-projects` | view | Lista con `?year=`, `?month=`, `?limit`, `?offset`. |
| POST | `/coordinacion-proyectos/program-projects` | edit | Crea proyecto (body validado con Zod). |
| GET/PATCH/DELETE | `/coordinacion-proyectos/program-projects/[id]` | view / edit / delete | CRUD por id. |
| GET | `/coordinacion-proyectos/exam-lines` | view | Lista con `?year=`, `?month=`, paginación. |
| POST | `/coordinacion-proyectos/exam-lines` | edit | Crea línea. |
| GET/PATCH/DELETE | `/coordinacion-proyectos/exam-lines/[id]` | view / edit / delete | CRUD. |
| GET | `/coordinacion-proyectos/course-offerings` | view | Lista cursos operativos. |
| POST | `/coordinacion-proyectos/course-offerings` | edit | Alta curso. |
| GET/PATCH/DELETE | `/coordinacion-proyectos/course-offerings/[id]` | view / edit / delete | CRUD. |
| GET | `/coordinacion-proyectos/catalog` | view | `{ departments, examTypes, productServices }`. |
| POST | `/coordinacion-proyectos/catalog` | edit | Body: `{ kind: "department"|"exam_type"|"product_service", name, sort_order? }`. |
| PATCH | `/coordinacion-proyectos/catalog/[id]` | edit | Body: `{ kind, name?, sort_order?, is_active? }`. |
| DELETE | `/coordinacion-proyectos/catalog/[id]?kind=…` | delete | Borra fila del catálogo indicado. |
| GET | `/coordinacion-proyectos/kpi-comparison` | view | Filas `lec_kpi_size_comparison`. |
| PATCH | `/coordinacion-proyectos/kpi-comparison` | edit | Body: `{ rows: [{ id, count_2025?, count_2026?, projected_2026? }] }`. |
| POST | `/coordinacion-proyectos/import` | edit | Body: `{ entity: "program_projects"|"exam_sales_lines", rows: [...] }` (hasta 2000 filas). Mapeo flexible de columnas tipo Excel (ver wiki). |

Detalle extendido y convenciones comunes: [API_MODULES.md](./API_MODULES.md) (sección **Coordinación proyectos LEC**).

---

## 4. RBAC y registro de módulo

- **`module_registry`:** fila global `org_id IS NULL`, `is_native = true`, categoría sidebar **`Coordinación de proyectos`** (bloque hermano de «Coordinación de Exámenes»; ver [wiki/sidebar-modulos-y-agrupacion.md](./wiki/sidebar-modulos-y-agrupacion.md)), icono `Layers`.
- **`module_permissions`:** roles admin/supervisor/operador (applicator sin acceso por defecto en tabla de permisos de módulo).
- **`member_module_access`:** la migración inserta filas para miembros existentes no-applicator (mismo patrón que `project-management`).
- **`src/lib/auth/permissions.ts`:** tipo `Module`, `permissionsMap` y `MODULE_ALIAS_MAP` incluyen `coordinacion-proyectos-lec` y alias `coordinacion-proyectos`.
- **Sidebar:** `NATIVE_ROUTES["coordinacion-proyectos-lec"]` en `src/components/sidebar-nav.tsx`.
- **Redirect Studio / `m/[slug]`:** entrada en `NATIVE_ROUTES` del catch-all `src/app/(dashboard)/dashboard/m/[slug]/page.tsx`.

---

## 5. UI — submódulos (shell)

| Ruta | Contenido |
|------|-----------|
| `/dashboard/coordinacion-proyectos-lec` | Overview (cards desde `overview`). |
| `…/concentrado` | Tabla `program-projects`. |
| `…/examenes` | Tabla `exam-lines`. |
| `…/cursos` | Tabla `course-offerings`. |
| `…/catalogos` | Tres listas desde `catalog`. |
| `…/evidencias` | Proyectos con evidencias o checklist incompletos. |
| `…/importar` | JSON + `entity` → `POST …/import`. |
| `…/comparativos` | Edición de `kpi-comparison`. |

**Componentes UI compartidos:** `src/app/(dashboard)/dashboard/coordinacion-proyectos-lec/_components/cp-ui.tsx` (`CpStatCard`, tablas con `cpTableShellClass`, `CpPanel`, estados de carga/denegación). Diseño alineado a tokens Tailwind/shadcn y **modo claro/oscuro** (sin `slate-*` fijos en estas vistas).

**Hub Coordinación exámenes:** enlace rápido en `/dashboard/coordinacion-examenes/proyectos`.

**Checklist de revisión:** [wiki/coordinacion-proyectos-lec-auditoria-ui-runbook.md](./wiki/coordinacion-proyectos-lec-auditoria-ui-runbook.md).

---

## 6. Integraciones con otros módulos

| Vínculo | Campo / uso |
|---------|-------------|
| Escuelas | `school_id` en proyectos y líneas de examen |
| Eventos | `event_id` |
| CRM | `crm_opportunity_id` en proyectos |
| PM Kanban | `pm_project_id` en proyectos |
| Documentos | Evolución: URLs en `evidence_*` o enlaces a DMS (`documents`) |
| Académico “cursos” | Solo simulador financiero; **no** confundir con `lec_course_offerings` |

---

## 7. Tests

- `src/tests/api/coordinacion-proyectos.test.ts` — catálogo GET y validación de schema de import.

---

## 8. Mantenimiento documental

Al cambiar rutas API, campos de tablas o slug del módulo:

1. Actualizar este archivo y [API_MODULES.md](./API_MODULES.md).
2. Actualizar [wiki/coordinacion-proyectos-lec.md](./wiki/coordinacion-proyectos-lec.md) si afecta operación.
3. Si cambia relación con otros ejes o sidebar: [COORDINACIONES_LEC_ARQUITECTURA.md](./COORDINACIONES_LEC_ARQUITECTURA.md) y [wiki/auditoria-coordinaciones-sidebar.md](./wiki/auditoria-coordinaciones-sidebar.md).
4. Revisar [wiki/README.md](./wiki/README.md) y [index.md](./index.md) (MOC).
