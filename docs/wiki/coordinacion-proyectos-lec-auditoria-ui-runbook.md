---
title: "Coordinación proyectos LEC — auditoría (paths, API, UI, runbook)"
slug: coordinacion-proyectos-lec-auditoria-ui-runbook
date: 2026-05-15
updated: 2026-05-15
tags: [wiki, coordinacion-proyectos-lec, ui, runbook, checklist]
status: active
audience: [engineering, qa, product]
related_components:
  - coordinacion-proyectos-lec
---

# Coordinación proyectos LEC — inventario para revisión minuciosa

Usa esta página como **lista de chequeo** antes de releases o rediseños. La guía funcional sigue en [coordinacion-proyectos-lec.md](./coordinacion-proyectos-lec.md); el modelo de datos y API en [COORDINACION_PROYECTOS_LEC.md](../COORDINACION_PROYECTOS_LEC.md) y [API_MODULES.md](../API_MODULES.md). Contexto de los cuatro ejes LEC: [COORDINACIONES_LEC_ARQUITECTURA.md](../COORDINACIONES_LEC_ARQUITECTURA.md).

---

## 1. Identidad del módulo

| Campo | Valor |
|-------|--------|
| Slug RBAC / `member_module_access.module` | `coordinacion-proyectos-lec` |
| Constante TS | `CP_MODULE` en `src/lib/coordinacion-proyectos/schemas.ts` |
| Categoría sidebar | `Coordinación de proyectos` (hermano de Coordinación de Exámenes) |
| `NATIVE_ROUTES` | `src/components/sidebar-nav.tsx` → `/dashboard/coordinacion-proyectos-lec` |
| Redirect `m/[slug]` | `src/app/(dashboard)/dashboard/m/[slug]/page.tsx` |
| Hub enlazado | `src/app/(dashboard)/dashboard/coordinacion-examenes/proyectos/page.tsx` (QuickLink) |

---

## 2. Rutas UI (App Router)

| Ruta | Archivo | API principal (SWR / acción) |
|------|-----------|--------------------------------|
| `/dashboard/coordinacion-proyectos-lec` | `…/coordinacion-proyectos-lec/page.tsx` | `GET …/overview?year=` |
| `…/concentrado` | `…/concentrado/page.tsx` | `GET …/program-projects?year=` |
| `…/examenes` | `…/examenes/page.tsx` | `GET …/exam-lines?year=` |
| `…/cursos` | `…/cursos/page.tsx` | `GET …/course-offerings` |
| `…/catalogos` | `…/catalogos/page.tsx` | `GET …/catalog` |
| `…/evidencias` | `…/evidencias/page.tsx` | `GET …/program-projects?year=` (filtro cliente) |
| `…/importar` | `…/importar/page.tsx` | `POST …/import` |
| `…/comparativos` | `…/comparativos/page.tsx` | `GET` + `PATCH …/kpi-comparison` |

**Layout / shell**

| Archivo | Rol |
|---------|-----|
| `…/layout.tsx` | Padding página; envuelve shell. |
| `…/_components/coordinacion-proyectos-shell.tsx` | Cabecera, intro, **tab bar** (Overview, Concentrado, Exámenes, Cursos, Importar). |
| `…/_components/cp-ui.tsx` | Piezas UI compartidas: `CpStatCard`, `CpListCard`, `CpPanel`, `cpTableShellClass`, estados carga/denegación. |

**Sidebar (sintético + registry)**

- `buildCoordinacionProyectosSubgroups` en `src/components/sidebar-nav.tsx`: **Vista general** → enlace **Overview**; **Catálogos, evidencias y comparativos** → tres rutas.

---

## 3. API (prefijo `/api/v1`)

Base: `/api/v1/coordinacion-proyectos/`

| Método | Path relativo | Acción típica |
|--------|----------------|-----------------|
| GET | `overview` | view |
| GET/POST | `program-projects` | view / edit |
| GET/PATCH/DELETE | `program-projects/[id]` | view / edit / delete |
| GET/POST | `exam-lines` | view / edit |
| GET/PATCH/DELETE | `exam-lines/[id]` | … |
| GET/POST | `course-offerings` | … |
| GET/PATCH/DELETE | `course-offerings/[id]` | … |
| GET/POST | `catalog` | view / edit |
| PATCH/DELETE | `catalog/[id]` | edit / delete |
| GET/PATCH | `kpi-comparison` | view / edit |
| POST | `import` | edit |

Carpeta: `src/app/api/v1/coordinacion-proyectos/`.

---

## 4. Base de datos y migraciones

| Artefacto | Archivo / tabla |
|-----------|------------------|
| Schema principal | `supabase/migrations/20260614_coordinacion_proyectos_lec.sql` |
| Sidebar registry | `20260615_coordinacion_proyectos_lec_nav_category.sql`, `20260616_coordinacion_proyectos_sidebar_parent.sql` |
| Tablas `lec_*` | Ver [DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md) §16 |

---

## 5. Tests

| Archivo | Cobertura aproximada |
|---------|----------------------|
| `src/tests/api/coordinacion-proyectos.test.ts` | Catálogo, schema import |

Tras cambios de permisos globales: `src/tests/api/sgc-permissions.test.ts` (no específico del módulo pero puede romperse con cambios en `checkServerPermission`).

---

## 6. Runbook operativo (dónde mirar)

| Tema | Documento |
|------|-------------|
| Deploy, env vars, flujos generales | [RUNBOOK.md](../RUNBOOK.md) — sección **Coordinación proyectos LEC** (enlace a este wiki + COORDINACION doc). |
| Estado del repo / build | [README.md](../../README.md) |
| Diseño visual global | [ADR-004](../adr/ADR-004-premium-saas-design-system.md) |
| Sidebar / padres / subgrupos | [sidebar-modulos-y-agrupacion.md](./sidebar-modulos-y-agrupacion.md) |

**Operación típica**

1. Aplicar migraciones en Supabase (orden por fecha).
2. Regenerar `database.types.ts` si cambió el schema.
3. Verificar `module_registry` + `member_module_access` para la org.
4. `npm run build && npm run test` antes de merge a `main` (Vercel despliega desde `main` según RUNBOOK).

---

## 7. Checklist UI (claro / oscuro)

Marca en cada release o rediseño:

- [ ] **Shell:** cabecera con gradiente legible en `light` y `dark` (contraste texto / enlaces `primary`).
- [ ] **Tab bar:** estado activo `primary` + foco teclado visible.
- [ ] **Overview:** cuatro `CpStatCard` (acentos sky / emerald / amber / violet); texto “Sin ingreso” legible en oscuro.
- [ ] **Tablas:** cabecera `bg-muted/40`, filas con hover suave (`primary` / `violet` / `emerald` / `rose` / `cyan` según pantalla), números `tabular-nums`.
- [ ] **Catálogos:** listas con zebra `odd:bg-muted/50` (o `dark:odd:bg-muted/25`).
- [ ] **Evidencias:** badges Sí/No (emerald / amber) legibles.
- [ ] **Importar:** panel `CpPanel`, textarea monoespaciada, permiso `edit` claro si falta.
- [ ] **Comparativos:** inputs alineados, botón guardar solo con `edit`.
- [ ] **Estados:** `CpLoadingState`, `CpDeniedState` coherentes con el resto del dashboard.
- [ ] **Sin colores hardcodeados** tipo `slate-900` en este módulo; preferir tokens (`border-border`, `bg-card`, `text-muted-foreground`).

---

## 8. README del repo

En [README.md](../../README.md), sección **Core Modules** (o equivalente): debe mencionarse el módulo y enlazar a `docs/COORDINACION_PROYECTOS_LEC.md` o a este wiki.

---

Volver al **[índice wiki](./README.md)** o a [coordinacion-proyectos-lec.md](./coordinacion-proyectos-lec.md).
