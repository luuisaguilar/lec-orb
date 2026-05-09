---
title: "Eventos — documentos por examen y Coordinación de Exámenes"
slug: eventos-documentos-coordinacion
date: 2026-05-09
updated: 2026-05-09
tags: [wiki, events, documents, exams, navigation, supabase]
status: active
audience: [engineering, operations]
related_components:
  - next-app
  - documents-api
  - module-registry
  - sidebar-nav
---

# Eventos: documentos por examen y “Coordinación de Exámenes”

## Por qué existe

LEC necesita **trazabilidad documental por evento** (logística, certificados, resultados) alineada con **tipos de examen** y sedes, sin duplicar pantallas dentro del planner. La navegación lateral agrupa operaciones de examen bajo **Coordinación de Exámenes** para que coordinadores encuentren en un solo lugar eventos, sedes, TOEFL/CENNI/códigos y el control documental.

## Cómo está montado (flujo)

1. **`module_registry`** categoriza módulos nativos; tras migración, varios slugs pasan a la categoría `Coordinación de Exámenes` (ver migración abajo).
2. **`SidebarNav`** resuelve rutas nativas (`NATIVE_ROUTES`) y alias de permisos (`MODULE_PERMISSION_ALIAS`).
3. La UI **lista / detalle** vive bajo rutas canónicas `coordinacion-examenes`; las rutas históricas `institucional/*` **redirigen** para no romper bookmarks.

```text
Usuario → sidebar “Documentos de Eventos”
       → /dashboard/coordinacion-examenes/documentos-eventos
       → clic evento → .../documentos-eventos/[eventId]
       → tabs por área + checklist + upload con tags
```

## Rutas canónicas (Next.js App Router)

| Ruta | Rol |
|------|-----|
| `/dashboard/coordinacion-examenes/documentos-eventos` | Lista: búsqueda, vistas lista/grid, por escuela, Gantt simplificado. |
| `/dashboard/coordinacion-examenes/documentos-eventos/[eventId]` | Detalle: tabs Logística / Certificados / Resultados, selector de tipo de examen, tabla de archivos, checklist. |
| `/dashboard/coordinacion-examenes/proyectos` | Tablero operativo de “Proyectos (Coordinación)” enlazado desde `project-management` cuando aplica. |

**Código:** `src/app/(dashboard)/dashboard/coordinacion-examenes/`.

## Compatibilidad (legacy)

| Ruta antigua | Comportamiento |
|--------------|----------------|
| `/dashboard/institucional/documentos-eventos` | Redirección servidor → ruta canónica lista. |
| `/dashboard/institucional/documentos-eventos/[eventId]` | Redirección servidor → detalle canónico. |
| `/dashboard/institucional/proyectos` | Redirección → `/dashboard/coordinacion-examenes/proyectos`. |

**Código:** `src/app/(dashboard)/dashboard/institucional/`.

Otros enlaces de producto:

- Planner: botón “documentos” debe usar la ruta **`/dashboard/coordinacion-examenes/documentos-eventos/[eventId]`** (`eventos/planner/[id]/page.tsx`).
- **`/dashboard/m/[slug]`:** si alguien entra a `m/event-documents`, el “safety redirect” envía a la ruta canónica de documentos de eventos.

## Datos y API de documentos

- **Módulo en BD:** documentos ligados a eventos usan `module_slug: "events"` y `record_id: <eventId>` (convención existente del panel de documentos).
- **GET** `/api/v1/documents`: admite filtros por módulo y, donde exista implementación, por `tag` / `record_id` para segmentar por evento y área.
- **Tags semánticos** (para checklist y filtros en UI):
  - `event-logistics`, `event-certificate`, `event-results`
  - Opcional por tipo de examen: `exam-type:<nivel>` (minúsculas en uso).

**Por qué tags:** permite checklist dinámico y filtro por tipo de examen sin duplicar registros de evento.

## Sidebar y permisos

- Slug registro: **`event-documents`**.
- Ruta nativa en código: `src/components/sidebar-nav.tsx` → `NATIVE_ROUTES["event-documents"]`.
- **`MODULE_PERMISSION_ALIAS`:** `event-documents` → permiso lógico `documents` (reutiliza matriz de documentos).

Si un usuario no ve el ítem, revisar **rol**, **`member_module_access`** y que el módulo siga **`is_active`** en `module_registry`.

## Migraciones Supabase relevantes

| Archivo | Propósito |
|---------|-----------|
| `supabase/migrations/20260507_event_documents_module.sql` | Alta/actualización del módulo nativo `event-documents` en `module_registry`. |
| `supabase/migrations/20260524_coordinacion_examenes_sidebar.sql` | Reubica categorías: todo lo que era `Exámenes` y los slugs institucionales listados (sedes, aplicadores, eventos, documentos de eventos, PM coordinación) bajo **`Coordinación de Exámenes`**; RRHH/SGC permanecen en Institucional. |

Tras aplicar migraciones en un entorno, recargar sesión; el menú sale de **`GET /api/v1/modules`** filtrado por org.

## Componentes clave

| Pieza | Ubicación |
|-------|-----------|
| Lista / grid / vistas | `coordinacion-examenes/documentos-eventos/page.tsx` |
| Detalle + upload | `.../[eventId]/page.tsx` |
| Checklist por área | `src/components/events/event-documents-checklist.tsx` |
| Panel upload genérico | `src/components/documents/DocumentPanel.tsx` |

## Documentación relacionada

- [CAMBRIDGE_LOGISTICS_IMPORT_MATRIX](../CAMBRIDGE_LOGISTICS_IMPORT_MATRIX.md) — contexto logístico Cambridge.
- [API_MODULES](../API_MODULES.md) — inventario de módulos API.
- [Índice Wiki](./README.md) — mapa temático.

---

*Última revisión alineada con rutas `coordinacion-examenes` y migración de sidebar.*
