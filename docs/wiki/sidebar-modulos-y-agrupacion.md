---
title: "Sidebar — módulos padre, submódulos y cómo pedirlos al agente"
slug: sidebar-modulos-y-agrupacion
date: 2026-05-14
updated: 2026-05-15
tags: [wiki, sidebar, module_registry, navigation, rbac]
status: active
audience: [engineering, product]
related_components:
  - sidebar-nav
  - module_registry
---

# Sidebar: jerarquía y convenciones (LEC Orb)

El menú lateral del dashboard se arma en **`src/components/sidebar-nav.tsx`** a partir de:

1. **`module_registry`** (Supabase): cada fila es un módulo con `slug`, `name`, `icon`, **`category`**, `is_native`, etc.
2. **`/api/v1/users/me`**: `member_module_access` → qué slugs nativos puede ver el usuario.
3. **`NATIVE_ROUTES`** (mismo archivo): slug nativo → ruta Next (`/dashboard/...`).

---

## Diseño visual (colores, estética): ¿hay reglas Cursor?

En **`lec-orb`** no hay hoy un `.cursor/rules` dedicado solo a paleta o UI. Lo que sí existe como referencia:

| Recurso | Contenido |
|---------|-------------|
| [ADR-004 — Premium SaaS design system](../adr/ADR-004-premium-saas-design-system.md) | Dirección visual, tokens, patrones premium. |
| **Tailwind + shadcn/ui** en el código | Preferir utilidades semánticas (`bg-muted`, `border-border`, `text-primary`, `text-muted-foreground`) en lugar de colores “a mano” (`slate-900`, etc.) salvo casos documentados (p. ej. temas por examen). |
| **Iconos del sidebar** | Nombre Lucide válido en `module_registry.icon` y en `src/lib/icon-registry.ts`. |

Si quieres que el agente **siempre** respete una guía de marca, lo habitual es crear **reglas de Cursor** (`.cursor/rules/*.mdc`) o un **skill** con checklist; se puede pedir explícitamente en el chat.

---

## Cómo se llaman estos patrones de UI (para pedirlos al agente)

| Lo que ves | Nombre técnico (EN) | Cómo pedirlo en español |
|------------|---------------------|-------------------------|
| Pestañas horizontales arriba del contenido (Overview, Concentrado, …) | **Tab navigation** / **tab bar** | “Navegación por **pestañas** en el área principal” o “**tab bar** horizontal bajo el título”. |
| Menú lateral con secciones que se abren/cierran | **Collapsible sidebar** / **nested sidebar navigation** | “**Sidebar** con grupos **colapsables**” o “navegación lateral **anidada**”. |
| Segundo nivel solo bajo un padre (p. ej. Cambridge → Sistema Uno) | **Nested navigation** / **accordion sections** | “**Submódulos** en el sidebar bajo el padre X” o “árbol de navegación de **dos niveles**”. |

**Ejemplos de prompt concretos**

- Solo pestañas: *“Mantén **solo tab bar** en la vista principal; no añadas enlaces nuevos al sidebar.”*
- Solo sidebar: *“Quita X del tab bar y expón **enlaces en el sidebar** bajo la categoría Y.”*
- Mixto (como Coordinación de proyectos LEC): *“**Catálogos / Evidencias / Comparativos** en el **sidebar** bajo Coordinación de proyectos; el resto sigue en **pestañas** en `coordinacion-proyectos-shell`.”*

---

## Nivel 1 — Padre en el sidebar (mismo renglón que «Coordinación de Exámenes»)

- El **título del desplegable** del sidebar es el valor de **`category`** (tras `canonicalSidebarCategory`, si aplica).
- Todos los módulos que comparten **exactamente** la misma cadena `category` aparecen como **enlaces hermanos** bajo ese padre (lista plana ordenada A→Z por etiqueta).
- **Ejemplo:** `category = 'Coordinación de proyectos'` → aparece un bloque **Coordinación de proyectos** al mismo nivel que **Coordinación de Exámenes** (no anidado dentro de Exámenes).
- Icono del padre: mapa **`CATEGORY_ICONS`** en `sidebar-nav.tsx` (clave = categoría canónica).

**Checklist al crear un padre nuevo**

1. Elegir un **`category`** único y estable (recomendado: título en españel, singular coherente con el resto).
2. `INSERT` en `module_registry` con ese `category` (migración SQL, nunca editar migraciones ya desplegadas).
3. Añadir icono en `CATEGORY_ICONS` si no existe (evita fallback genérico).
4. Si el módulo es nativo: entrada en **`NATIVE_ROUTES`**, permisos en **`permissions.ts`**, API/UI, y filas en **`member_module_access`** / `module_permissions` según el patrón del repo.

---

## Nivel 2 — Submódulos en sidebar (anidado especial)

- **«Coordinación de Exámenes»** usa **`subgroups`**: segunda y tercera fila (p. ej. Cambridge → Sistema Uno → enlaces), en `buildCoordinationExamSubgroups()` y sets `COORD_EXAM_*_SLUGS`.
- **«Coordinación de proyectos»** añade **enlaces sintéticos** (Catálogos, Evidencias, Comparativos) en la misma categoría que el slug `coordinacion-proyectos-lec`, en `sidebar-nav.tsx` (rama `category === 'Coordinación de proyectos'`). No son filas extra en `module_registry`; comparten RBAC del mismo slug.

Para **otro padre** con subgrupos colapsables como Exámenes: añadir rama `if (category === '…') { … subgroups … }` y un builder tipo `buildTuPadreSubgroups`.

**Submódulo solo en URL / pestañas** dentro de la app: rutas bajo el layout del módulo (p. ej. `…/concentrado`) sin tocar el sidebar.

---

## Nivel 3 — Sub-submódulos

- En el sidebar actual, la tercera profundidad aparece en **Coordinación de Exámenes → Cambridge → Sistema Uno** (`NavSubgroup.children`).
- Misma regla: nuevo árbol = extender el builder o introducir metadata en `module_registry.config` (no implementado hoy de forma genérica).

---

## Cómo referenciar esto al pedir un módulo (plantilla para el agente)

Copia y rellena:

```text
Sidebar / module_registry:
- Padre (category en sidebar, nivel 1): «___________»
- Slug(s) hijo(s): ___________
- ¿Solo pestañas en la vista principal? sí / no (lista de pestañas: ___)
- ¿Enlaces extra solo en sidebar (mismo RBAC)? sí / no (rutas: ___)
- ¿Subgrupos colapsables bajo ese padre (como Coordinación de Exámenes)? sí / no
  - Si sí: estructura deseada (nivel 2 y 3): ___________
- Rutas Next: ___________
- RBAC slug(s) en member_module_access: ___________
```

**Referencias en código**

| Qué | Dónde |
|-----|--------|
| Agrupación, orden A→Z, padres | `src/components/sidebar-nav.tsx` |
| Datos de módulos | `public.module_registry` + `GET /api/v1/modules` |
| Slug → ruta dashboard | `NATIVE_ROUTES` en `sidebar-nav.tsx` |
| Permisos por módulo | `src/lib/auth/permissions.ts`, `member_module_access` |

---

## Caso concreto: Coordinación de proyectos (LEC)

- **Padre sidebar:** categoría **`Coordinación de proyectos`** (hermano de **Coordinación de Exámenes**).
- **Hijos en sidebar:** entrada del registry (`coordinacion-proyectos-lec`) + enlaces **Catálogos**, **Evidencias**, **Comparativos** (rutas `/catalogos`, `/evidencias`, `/comparativos`).
- **Pestañas en vista:** Overview, Concentrado, Exámenes, Cursos, Importar (`coordinacion-proyectos-shell.tsx`).
- **Slug / RBAC:** `coordinacion-proyectos-lec` → base `/dashboard/coordinacion-proyectos-lec`.
- Migraciones de alineación: `20260615_coordinacion_proyectos_lec_nav_category.sql`, `20260616_coordinacion_proyectos_sidebar_parent.sql`.
- En cliente, el slug `coordinacion-proyectos-lec` se **reubica** bajo ese padre si el registry aún no migró (`sidebar-nav.tsx`, comentario en código).

Documentación funcional: [COORDINACION_PROYECTOS_LEC.md](../COORDINACION_PROYECTOS_LEC.md), [coordinacion-proyectos-lec.md](./coordinacion-proyectos-lec.md).

---

Volver al **[índice wiki](./README.md)** o al **[MOC principal](../index.md)**.
