---
title: "Sidebar, Sistema Uno / Cambridge y datos compartidos"
slug: sidebar-navegacion-sistema-uno
date: 2026-05-13
updated: 2026-05-15
tags: [wiki, navigation, rbac, cambridge, sistema-uno]
status: active
audience: [engineering, product]
related_components:
  - sidebar-nav
  - module_registry
---

# Sidebar, orden alfabético, Feria de libro y Sistema Uno

## Reglas de la barra lateral (`src/components/sidebar-nav.tsx`)

1. **Dashboard** es la única fila **fija al inicio** (si existe en el registro). **Calendario de sesiones** participa del **orden A→Z** con el resto (ya no va forzado en 2º lugar).
2. **Categorías** (`module_registry.category`): el **título de cada bloque** en la barra (categoría o fila suelta) participa en un **único orden A→Z** junto con los módulos sin categoría; **Ajustes** va **siempre al final** de ese listado.
3. **Módulos dentro de cada categoría**: orden **alfabético de la A a la Z, letra por letra** (como en un diccionario en español): todo lo que empiece por **C** va antes que lo que empiece por **D**, y así sucesivamente. La implementación usa `Intl.Collator("es", { numeric: true })` para que también los números en el nombre ordenen bien (p. ej. “Parte 2” antes que “Parte 10”). Aplica a listas planas, Proyectos (Empresa), portal y cada sublista bajo Coordinación de Exámenes; los encabezados de subgrupo (Cambridge, CENNI, …) siguen la misma regla.
4. **Orden de bloques en el sidebar**: los módulos **sin categoría** en `module_registry` (entrada suelta, p. ej. RRHH) ya **no se quedan arriba** en el orden que devuelve la API: se **mezclan** con los grupos por categoría y **todos** se ordenan por el título visible (A→Z), salvo **Ajustes** al final y **Proyectos (Empresa)** justo después de Coordinación o Institucional si aplica.
5. **Logística → Feria de libro**: en la UI el grupo que en base de datos puede seguir llamándose `Logística` se muestra como **Feria de libro**; icono de categoría en sidebar: **`Library`** (feria de libro / acervo). Si en Studio o en la BD se guarda la categoría `Feria de libro`, el sidebar la **fusiona** con el bucket interno `Logística` para no duplicar secciones.
6. **Catálogos → Directorio**: igual que arriba: la categoría en BD puede seguir siendo `Catálogos`; en el menú se muestra **Directorio**. Si se guarda `Directorio` en Studio/BD, se **fusiona** con el bucket `Catálogos`.
7. **Coordinación de Exámenes** conserva su bloque anidado (Cambridge → Sistema Uno, TOEFL, etc.); la posición del bloque completo sigue el orden alfabético entre bloques.
8. **Proyectos (Empresa)** sigue insertándose justo después del primer grupo entre **Coordinación de Exámenes** e **Institucional** cuando el usuario puede ver `project-management` (comportamiento previo).

## ¿“Sistema Uno” interconecta los datos entre módulos?

**No en el sentido de una base “Sistema Uno” separada.** “Sistema Uno” en el menú es una **agrupación de navegación**: bajo Coordinación de Exámenes → **Cambridge → Sistema Uno** siguen módulos como `unoi-planning`, `payroll`, `ih-billing`, etc. Los slugs **`schools`** y **`applicators`** siguen en `module_registry` con categoría Coordinación para permisos y Studio, pero el sidebar **los muestra también** bajo **Directorio** (misma fila que Proveedores y Documentos) y **no** los duplica bajo Sistema Uno.

- **Escuelas** y **aplicadores** usan **rutas de primer nivel** como Proveedores: **`/dashboard/schools`** y **`/dashboard/applicators`**, cada una con su propia página (mismo patrón de layout que `proveedores/page.tsx`: contenedor `flex-1 space-y-4 p-4 pt-6 md:p-8` + UI en `SchoolsDashboard` / `ApplicatorsDashboard`). Las APIs no cambian (`/api/v1/schools`, `/api/v1/applicators`).
- **Catálogo de conceptos** (`slug` `catalog`): solo **`/dashboard/catalogo/conceptos`**. La raíz **`/dashboard/catalogo`** redirige a conceptos. Rutas antiguas **`/dashboard/catalogo/escuelas`** y **`/dashboard/catalogo/applicadores`** redirigen a las rutas de primer nivel (compatibilidad).
- **Directorio** en el sidebar es solo **agrupación visual**: no hay un `layout` con pestañas que mezcle UNOi con conceptos de pago.

## Convención para el agente / Cursor

Ver skill del repo: **`.cursor/skills/directorio-modulos-nativos-lec/SKILL.md`** (rutas, sidebar, qué evitar).

## Dónde tocar qué

| Objetivo | Dónde |
|----------|--------|
| Orden / etiquetas de categorías en el menú | `src/components/sidebar-nav.tsx` |
| Escuelas / aplicadores (páginas) | `src/app/(dashboard)/dashboard/schools/page.tsx`, `applicators/page.tsx` |
| Catálogo de conceptos | `src/app/(dashboard)/dashboard/catalogo/conceptos/page.tsx`; raíz `catalogo/page.tsx` (redirect) |
| Redirecciones legacy bajo `/catalogo/...` | `src/app/(dashboard)/dashboard/catalogo/escuelas/page.tsx`, `catalogo/applicadores/page.tsx` |
| Categoría al crear/editar módulos en Studio | `src/app/(dashboard)/dashboard/studio/StudioClient.tsx` (`PRESET_CATEGORIES`) |
| Categoría persistida por organización o global | `module_registry` en Supabase (migraciones nuevas si se renombra masivamente en BD) |

## Referencias

- Arquitectura cuatro coordinaciones: [COORDINACIONES_LEC_ARQUITECTURA.md](../COORDINACIONES_LEC_ARQUITECTURA.md)
- Auditoría sidebar y roadmap: [auditoria-coordinaciones-sidebar.md](./auditoria-coordinaciones-sidebar.md)
- Sedes / Baja California: [sedes-multisede-y-aislamiento-operativo.md](./sedes-multisede-y-aislamiento-operativo.md)
- Coordinación de exámenes y rutas: [eventos-documentos-coordinacion](./eventos-documentos-coordinacion.md)
- Padres y subgrupos: [sidebar-modulos-y-agrupacion](./sidebar-modulos-y-agrupacion.md)
- Índice wiki: [README](./README.md)
