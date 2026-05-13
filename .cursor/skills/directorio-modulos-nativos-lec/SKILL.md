---
name: directorio-modulos-nativos-lec
description: Cómo encajan Escuelas, Aplicadores y Catálogo de conceptos en LEC Orb (sidebar Directorio vs rutas de primer nivel).
---

# Directorio y módulos nativos (LEC Orb)

## Principio

En **Directorio** (categoría `Catálogos` en BD, etiqueta UI “Directorio”) conviven en el **sidebar** varias entradas hermanas: Catálogo de conceptos, Documentos, Proveedores, Escuelas, Aplicadores, etc.

**No** deben agruparse en una sola pantalla con pestañas tipo “submódulo dentro de catálogo”. Cada módulo nativo debe comportarse como **Proveedores**: **ruta propia** bajo `/dashboard/...`, **página con su propio chrome** (título, acciones, tabla/cards) y **sin** `layout` compartido que mezcle UNOi con conceptos de pago.

## Rutas canónicas

| Módulo (slug)   | Ruta Next.js                          | Notas |
|-----------------|----------------------------------------|--------|
| `catalog`       | `/dashboard/catalogo/conceptos`      | Solo conceptos de pago. |
| `schools`       | `/dashboard/schools`                 | UI en `SchoolsDashboard`; misma API `/api/v1/schools`. |
| `applicators`   | `/dashboard/applicators`             | UI en `ApplicatorsDashboard`; misma API `/api/v1/applicators`. |
| `suppliers`     | `/dashboard/proveedores`             | Referencia de patrón UI. |

## Sidebar (`src/components/sidebar-nav.tsx`)

- `schools` y `applicators` suelen venir de `module_registry` con categoría **Coordinación de Exámenes**, pero el menú los **inyecta** también bajo **Directorio** (`DIRECTORIO_UNOI_SLUGS`) y los **excluye** del árbol Coordinación → Cambridge → Sistema Uno para no duplicar.
- `NATIVE_ROUTES` debe apuntar siempre a las rutas de primer nivel anteriores (no bajo `/dashboard/catalogo/escuelas` salvo redirects de compatibilidad).

## Compatibilidad

- Rutas antiguas `/dashboard/catalogo/escuelas` y `/dashboard/catalogo/applicadores` pueden existir como **`redirect()`** mínimos hacia `/dashboard/schools` y `/dashboard/applicators`.
- `/dashboard/catalogo` puede redirigir a `/dashboard/catalogo/conceptos` si no hay “hub” de resumen.

## Qué evitar

- Un `catalogo/layout.tsx` con pestañas que mezcle UNOi y conceptos.
- Enlazar Escuelas/Aplicadores solo desde dentro del catálogo de conceptos.

## Archivos típicos

- Rutas: `src/app/(dashboard)/dashboard/schools/page.tsx`, `applicators/page.tsx`, `catalogo/conceptos/page.tsx`.
- Navegación: `src/components/sidebar-nav.tsx` (`NATIVE_ROUTES`, `DIRECTORIO_UNOI_SLUGS`, filtro Coordinación).
- Redirección módulos nativos: `src/app/(dashboard)/dashboard/m/[slug]/page.tsx`.
