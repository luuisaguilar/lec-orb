---
title: "Coordinaciones LEC — arquitectura de módulos e interconexión"
slug: coordinaciones-lec-arquitectura
date: 2026-05-15
updated: 2026-05-15
status: active
audience: [engineering, product, operations]
related_components:
  - sidebar-nav
  - module_registry
  - coordinacion-proyectos-lec
  - org_locations
---

# Coordinaciones LEC — arquitectura de módulos e interconexión

Documento **canónico** que define los cuatro ejes operativos de LEC en la plataforma, cómo se reflejan hoy en el sidebar, qué falta implementar y cómo se conectan entre sí. Complementa el inventario técnico en [wiki/auditoria-coordinaciones-sidebar.md](./wiki/auditoria-coordinaciones-sidebar.md).

| Eje de negocio | Estado en sidebar (mayo 2026) | Documentación detallada |
|----------------|--------------------------------|-------------------------|
| Coordinación Exámenes | Implementado (árbol anidado) | [eventos-documentos-coordinacion](./wiki/eventos-documentos-coordinacion.md), [sidebar-navegacion-y-sistema-uno](./wiki/sidebar-navegacion-y-sistema-uno.md) |
| Feria del Libro | Parcial (label UI; slug `inventory`) | Esta página §3 + [auditoria](./wiki/auditoria-coordinaciones-sidebar.md) |
| Coordinación Académica | Parcial (categoría `Académico` → `courses`) | Esta página §4 |
| Coordinación de Proyectos | Hub KPI (`coordinacion-proyectos-lec`) | [COORDINACION_PROYECTOS_LEC](./COORDINACION_PROYECTOS_LEC.md) |

---

## 1. Principio de diseño

LEC Orb organiza la operación en **cuatro coordinaciones** que comparten datos institucionales (escuelas, aplicadores, eventos) pero tienen flujos distintos. La plataforma debe:

1. **Mostrar** cada coordinación como bloque reconocible en el menú (o subárbol claro).
2. **Conectar** indicadores y reportes en un **hub** sin duplicar captura.
3. **Aislar por sede** (Sonora, Baja California, Nuevo León) para personal operativo sin filtrar manualmente en Excel.

```text
                    ┌─────────────────────────────┐
                    │  Coordinación de Proyectos   │
                    │  (concentrado + KPI LEC)     │
                    └──────────────┬──────────────┘
           department_id / FKs    │
    ┌──────────────┬───────────────┼───────────────┬──────────────┐
    ▼              ▼               ▼               ▼              │
 Exámenes      Feria libro    Académica      Sedes (filtro)      │
 (operación)   (inventario)   (cursos)       (transversal)       │
```

**Regla de oro:** `lec_cp_departments` clasifica filas del concentrado; **no** sustituye padres del sidebar. Los nombres de departamento seed coinciden con los ejes de negocio, pero el menú sigue `module_registry.category`.

---

## 2. Coordinación Exámenes

### 2.1 Alcance de negocio

Cambridge (Sistema Uno / UNOi), TOEFL, CENNI, OOPT, IELTS, eventos de aplicación, nómina de aplicadores, CxC IH, planeación logística de sesiones y documentación por evento.

### 2.2 Implementación actual

| Artefacto | Ubicación |
|-----------|-----------|
| Categoría sidebar | `Coordinación de Exámenes` |
| Builder de subgrupos | `buildCoordinationExamSubgroups()` en `src/components/sidebar-nav.tsx` |
| Rutas UI | `src/app/(dashboard)/dashboard/coordinacion-examenes/` |
| Migración categorías | `supabase/migrations/20260524_coordinacion_examenes_sidebar.sql` |

**Subárbol (slugs principales):**

| Subgrupo | Slugs |
|----------|-------|
| Cambridge → Sistema Uno | `unoi-planning`, `calculator`, `payroll`, `ih-billing` |
| TOEFL | `toefl`, `toefl-codes`, `speaking-packs` |
| CENNI / OOPT / IELTS | `cenni`, `oopt-pdf`, `ielts` |
| Eventos y otros | `events`, `event-documents`, `project-management` (como «Proyectos (Coordinación)») |

**Directorio:** `schools` y `applicators` se muestran bajo **Directorio** aunque en BD puedan conservar categoría Coordinación para permisos.

### 2.3 Objetivo de consolidación

- Mantener un solo padre **Coordinación de Exámenes**.
- Renombrar «Proyectos (Coordinación)» → **Logística de sesión** o enlazar solo al hub de proyectos LEC.
- Añadir **contexto de sede** (filtro UI + RLS) — ver [wiki/sedes-multisede-y-aislamiento-operativo.md](./wiki/sedes-multisede-y-aislamiento-operativo.md).

---

## 3. Feria del Libro

### 3.1 Alcance de negocio

Inventario multi-ubicación, ferias en escuelas, ventas, utilidades, convenios. Proceso documentado en SGC/RRHH: `PROC_FERIA_LIBRO` (`supabase/migrations/20260505_hr_and_processes_update.sql`).

### 3.2 Implementación actual

| Artefacto | Valor |
|-----------|--------|
| Slug módulo | `inventory` |
| Categoría DB | `Logística` |
| Label sidebar | **Feria de libro** (`categoryDisplayLabel`) |
| Ruta | `/dashboard/logistica/inventario` |
| Tablas | `inventory_items`, `inventory_locations`, `inventory_stock`, `inventory_transactions` |
| Migración | `20260510_sprint_4_courses_inventory.sql` |

En el concentrado LEC: departamento **Feria del Libro** y producto/servicio **Feria del libro** en catálogos `lec_cp_*`.

### 3.3 Objetivo de consolidación

| Fase | Entrega |
|------|---------|
| 1 | Migración: `module_registry.category = 'Feria del Libro'` (alinear BD con UI) |
| 2 | Enlaces desde concentrado → inventario filtrado por feria |
| 3 | Módulos de ventas/cierre de feria (o extensión de cotizaciones con tag departamento) |

---

## 4. Coordinación Académica

### 4.1 Alcance de negocio

Programas de estudio, cursos activos, oferta comercial, desempeño docente. Proceso HR: `SUBPROC_COORD_ACADEMICA`.

### 4.2 Implementación actual

| Artefacto | Valor |
|-----------|--------|
| Slug módulo | `courses` |
| Categoría sidebar | `Académico` |
| Ruta simulador | `/dashboard/academico/cursos` → API `/api/v1/courses` |
| Concentrado operativo | `lec_course_offerings` → pestaña **Cursos** en coordinación proyectos LEC |

**Importante:** `courses` (simulador financiero) y `lec_course_offerings` (operación mensual tipo Excel) son **modelos distintos** hasta que se unifiquen en producto.

### 4.3 Objetivo de consolidación

- Renombrar categoría sidebar a **Coordinación Académica**.
- Shell con pestañas: Programas | Cursos activos | Ofertas | Importar.
- Deep links bidireccionales entre simulador y `lec_course_offerings`.

---

## 5. Coordinación de Proyectos (hub LEC)

### 5.1 Rol en la arquitectura

Es el **pegamento analítico**: reemplaza Excels INDICADORES / EXAMENES 2026 / listados de cursos. **No** es el PM Kanban de la empresa.

| Concepto | Slug / ruta |
|----------|-------------|
| Módulo nativo | `coordinacion-proyectos-lec` |
| API | `/api/v1/coordinacion-proyectos/*` |
| UI | `/dashboard/coordinacion-proyectos-lec/*` |
| Doc técnica | [COORDINACION_PROYECTOS_LEC.md](./COORDINACION_PROYECTOS_LEC.md) |
| Wiki operativa | [wiki/coordinacion-proyectos-lec.md](./wiki/coordinacion-proyectos-lec.md) |

### 5.2 Departamentos seed (`lec_cp_departments`)

Insertados por org en `20260614_coordinacion_proyectos_lec.sql`:

| Orden | Nombre | Relación con otros ejes |
|-------|--------|-------------------------|
| 1 | Coordinación Exámenes | Filas de concentrado ligadas a `event_id`, líneas de examen |
| 2 | Baja California | Dimensión regional en reportes (no módulo sidebar) |
| 3 | Feria del Libro | Inventario / ventas feria |
| 4 | Coordinación Académica | `lec_course_offerings` |
| 5 | Coordinación de Proyectos | Meta / proyectos institucionales transversales |

### 5.3 FKs de interconexión (`lec_program_projects`)

| Campo | Módulo destino |
|-------|----------------|
| `school_id` | Escuelas |
| `event_id` | Eventos |
| `crm_opportunity_id` | CRM |
| `pm_project_id` | PM empresa (opcional) |
| `department_id` | Catálogo `lec_cp_departments` |

---

## 6. Tres “proyectos” — glosario obligatorio

| Nombre en UI | Slug | Qué es |
|--------------|------|--------|
| **Proyectos (Empresa)** | `project-management` | Kanban interno LEC (`pm_*`) |
| **Proyectos (Coordinación)** | `project-management` (ruta distinta) | Vista eventos bajo coordinación exámenes |
| **Coordinación de proyectos (LEC)** | `coordinacion-proyectos-lec` | Concentrado KPI / Excel replacement |

**Nombres objetivo (documentación / UI futura):**

- Proyectos (Empresa) → *Gestión de proyectos internos*
- Proyectos (Coordinación) → *Logística de sesión* o eliminar duplicado
- Coordinación de proyectos (LEC) → *Indicadores y concentrado LEC*

---

## 7. Multisede y Baja California

La sede **no** debe ser un quinto padre del sidebar. Se modela en tres capas:

1. **Catálogo:** `org_locations` (SONORA, BAJA CALIFORNIA, NUEVO LEON).
2. **Usuario:** `org_members.location` al invitar / editar miembro.
3. **Datos:** `location_zone` en aplicadores; región en IH billing; futuro `location_id` en eventos/nómina/inventario.

Detalle de RBAC propuesto y fases: **[wiki/sedes-multisede-y-aislamiento-operativo.md](./wiki/sedes-multisede-y-aislamiento-operativo.md)**.

---

## 8. Sidebar objetivo (referencia)

Ver diagrama completo y matriz condensar/agregar en [wiki/auditoria-coordinaciones-sidebar.md](./wiki/auditoria-coordinaciones-sidebar.md).

Orden sugerido de bloques:

1. Dashboard, Calendario de sesiones  
2. Coordinación Exámenes (+ contexto sede)  
3. Feria del Libro  
4. Coordinación Académica  
5. Coordinación de Proyectos (hub)  
6. Directorio, Finanzas transversal, Comercial, Ajustes  
7. Gestión de proyectos internos (ex Proyectos Empresa)

---

## 9. Plan de implementación (resumen)

| Fase | Alcance | Esfuerzo |
|------|---------|----------|
| **1 — Claridad** | Renombrar copy de “proyectos”; enlaces cruzados en hub; actualizar `module_registry.category` Feria/Académica | Bajo |
| **2 — Interconexión** | Deep links concentrado ↔ módulos; badge sede en header | Medio |
| **3 — Seguridad sede** | RLS + `applyLocationScope` en APIs sensibles | Alto |
| **4 — Feria completa** | Flujo ventas/cierre según `PROC_FERIA_LIBRO` | Alto |

---

## 10. Referencias cruzadas

| Tema | Documento |
|------|-----------|
| Sidebar / padres / subgrupos | [wiki/sidebar-modulos-y-agrupacion.md](./wiki/sidebar-modulos-y-agrupacion.md) |
| Auditoría completa + matrices | [wiki/auditoria-coordinaciones-sidebar.md](./wiki/auditoria-coordinaciones-sidebar.md) |
| Sedes y aislamiento | [wiki/sedes-multisede-y-aislamiento-operativo.md](./wiki/sedes-multisede-y-aislamiento-operativo.md) |
| Invitaciones con sede | [wiki/invitaciones-campos-y-api.md](./wiki/invitaciones-campos-y-api.md) |
| Módulo concentrado LEC | [COORDINACION_PROYECTOS_LEC.md](./COORDINACION_PROYECTOS_LEC.md) |
| Mapa maestro | [LEC_ORB_MASTER_MAP.md](./LEC_ORB_MASTER_MAP.md) |

---

## 11. Mantenimiento

Al cambiar categorías en `module_registry`, slugs o departamentos seed:

1. Actualizar este archivo y [wiki/auditoria-coordinaciones-sidebar.md](./wiki/auditoria-coordinaciones-sidebar.md).
2. Revisar `src/components/sidebar-nav.tsx` (`NATIVE_ROUTES`, `CATEGORY_ICONS`, builders).
3. Ejecutar **`npm run check:sidebar-docs`** — valida código ↔ wiki (`scripts/check-coordinaciones-sidebar-drift.ts`).
4. Actualizar [BACKEND_FLOWS.md](./BACKEND_FLOWS.md) si cambia un recorrido E2E.
5. Actualizar [wiki/README.md](./wiki/README.md) e [index.md](./index.md) si cambia el descubrimiento.
6. Entrada en [CHANGELOG.md](./CHANGELOG.md).
