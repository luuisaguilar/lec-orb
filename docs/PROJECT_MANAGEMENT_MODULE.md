# Project Management Module (Asana/Trello/Monday style) — Technical Implementation Guide

Este documento es el blueprint técnico para implementar el módulo transversal de gestión de trabajo en LEC Orb.
Decisión: `docs/adr/ADR-007-project-management-module-foundation.md`.

---

## Objetivo (MVP)

Entregar un módulo nativo que permita:

- crear proyectos
- operar un tablero kanban por proyecto (columnas + orden de tareas)
- asignar responsables
- fechas límite y prioridades
- etiquetas
- vista Kanban + vista Tabla (timeline/calendario queda para fase posterior)

---

## Principios no negociables

- **Multi-tenant**: toda tabla con `org_id` y RLS habilitado.
- **Auth**: toda ruta mutante bajo `withAuth`.
- **Auditoría**: toda mutación genera `logAudit` (API) y/o `audit_log` (si aplica trigger).
- **Regla de migraciones**: nunca editar migraciones existentes; solo agregar nuevas en `supabase/migrations/`.

---

## Alcance por fases (para evitar creep)

### Fase 1 (MVP)
- Proyectos, tableros, columnas, tareas
- Campos: título, descripción, status/columna, orden, prioridad, fecha límite, responsable
- Etiquetas (tagging simple)
- Kanban (DnD) + Tabla (filtros, búsqueda)

### Fase 2 (colaboración)
- Comentarios en tareas
- Subtareas/checklist
- Watchers y notificaciones in-app
- Adjuntos (reusar DMS `documents` o tabla propia de links)

### Fase 3 (planificación avanzada)
- Dependencias entre tareas
- Timeline/Gantt y calendario
- Métricas: lead time, vencidas, carga por usuario, throughput
- Automatizaciones (reglas)

---

## Modelo de datos (Fase 1)

> Nomenclatura: prefijo `pm_` para aislar el dominio.

### 1) `pm_projects`

Proyecto contenedor.

Campos sugeridos:
- `id uuid PK default gen_random_uuid()`
- `org_id uuid not null`
- `key text` (ej. `OPS`, `FIN`, `SGC`) — opcional pero útil en refs
- `name text not null`
- `description text null`
- `status text not null default 'active'` (`active` | `archived`)
- `owner_user_id uuid null` (FK `auth.users`)
- `created_by uuid null`, `updated_by uuid null`
- `created_at timestamptz default now()`, `updated_at timestamptz default now()`

Índices:
- `(org_id, status)`
- `(org_id, created_at desc)`
- `unique(org_id, key)` si se usa key humano

### 2) `pm_boards`

Un proyecto puede tener uno o más tableros.

Campos sugeridos:
- `id uuid PK`
- `org_id uuid not null`
- `project_id uuid not null` (FK `pm_projects`)
- `name text not null`
- `default_view text not null default 'kanban'` (`kanban` | `table`)
- `created_by`, `updated_by`, `created_at`, `updated_at`

Índices:
- `(org_id, project_id)`

### 3) `pm_columns`

Columnas del Kanban.

Campos sugeridos:
- `id uuid PK`
- `org_id uuid not null`
- `board_id uuid not null` (FK `pm_boards`)
- `name text not null`
- `slug text not null` (ej. `todo`, `doing`, `done`)
- `sort_order int not null default 0`
- `wip_limit int null`
- `is_done boolean not null default false` (columna que cuenta como “done”)
- `created_at`, `updated_at`

Índices:
- `(org_id, board_id, sort_order)`
- `unique(org_id, board_id, slug)`

### 4) `pm_tasks`

Tarea principal.

Campos sugeridos:
- `id uuid PK`
- `org_id uuid not null`
- `project_id uuid not null` (FK `pm_projects`)
- `board_id uuid not null` (FK `pm_boards`)
- `column_id uuid not null` (FK `pm_columns`)
- `ref text not null` (ej. `OPS-000123`) — opcional en fase 1, recomendado
- `title text not null`
- `description text null`
- `priority text not null default 'normal'` (`low` | `normal` | `high` | `urgent`)
- `due_date date null`
- `assignee_user_id uuid null` (FK `auth.users`)
- `reporter_user_id uuid null` (FK `auth.users`)
- `sort_order int not null default 0` (orden dentro de columna)
- `completed_at timestamptz null`
- `created_by`, `updated_by`, `created_at`, `updated_at`

Índices:
- `(org_id, board_id, column_id, sort_order)`
- `(org_id, project_id, due_date)`
- `(org_id, assignee_user_id, due_date)`
- `unique(org_id, ref)` si se implementa `ref`

Regla de completado:
- si `pm_columns.is_done = true` → setear `completed_at` (API o trigger)

### 5) Etiquetas (tagging simple)

Opción A (recomendada): dos tablas.

#### `pm_labels`
- `id uuid PK`
- `org_id uuid not null`
- `name text not null`
- `color text null` (ej. `#7c3aed`)
- `created_at`, `updated_at`
- `unique(org_id, name)`

#### `pm_task_labels`
- `task_id uuid not null` FK `pm_tasks`
- `label_id uuid not null` FK `pm_labels`
- `org_id uuid not null`
- `primary key (task_id, label_id)`

---

## Seguridad (RLS)

Patrón mínimo (igual a módulos existentes):

- SELECT: miembros de la org pueden leer.
- INSERT/UPDATE/DELETE: `admin` y `supervisor` (y opcionalmente `operador` para tareas).

Recomendación para PM:

- **Leer**: `admin`, `supervisor`, `operador` (y opcional `applicator` si se usa como checklist operativo).
- **Escribir**:
  - proyectos/tableros/columnas: `admin` y `supervisor`
  - tareas: `admin`, `supervisor`, `operador`

> La decisión final debe alinearse con la validación de “9 grupos de permisos”.

---

## API (Fase 1)

Base path: `/api/v1/pm`.

### Endpoints mínimos

#### Proyectos
- `GET  /api/v1/pm/projects`
- `POST /api/v1/pm/projects`
- `GET  /api/v1/pm/projects/[id]`
- `PATCH /api/v1/pm/projects/[id]`

#### Tableros y columnas
- `GET  /api/v1/pm/projects/[projectId]/boards`
- `POST /api/v1/pm/projects/[projectId]/boards`
- `GET  /api/v1/pm/boards/[boardId]/columns`
- `POST /api/v1/pm/boards/[boardId]/columns`
- `PATCH /api/v1/pm/columns/[id]` (rename, reorder, done flag)

#### Tareas
- `GET  /api/v1/pm/tasks?projectId=&boardId=&columnId=&assignee=&q=&due=`
- `POST /api/v1/pm/tasks`
- `GET  /api/v1/pm/tasks/[id]`
- `PATCH /api/v1/pm/tasks/[id]`
- `POST /api/v1/pm/tasks/[id]/move` (DnD: column + sort_order)

### Reglas de implementación (API)

- Todas las mutaciones deben:
  - validar body con `zod`
  - filtrar por `org_id`
  - setear `updated_by`/`updated_at`
  - llamar `logAudit` al final
- Evitar `throw` dentro de server actions (no aplica directamente a route handlers, pero mantener consistencia).

---

## UI (Fase 1)

### Rutas sugeridas

- `src/app/(dashboard)/dashboard/proyectos/page.tsx` (lista de proyectos + quick actions)
- `src/app/(dashboard)/dashboard/proyectos/[projectId]/page.tsx` (board por defecto)

> Alternativa: un slug nativo `project-management` y mapear en `src/components/sidebar-nav.tsx`.

### Componentes

- `src/components/pm/pm-kanban-board.tsx`
  - reusar patrón de DnD de `src/components/sgc/sgc-kanban-board.tsx`
- `src/components/pm/pm-task-card.tsx`
- `src/components/pm/pm-task-dialog.tsx`
- `src/components/pm/pm-board-toolbar.tsx` (filtros, búsqueda, “Nueva tarea”)
- `src/components/pm/pm-table.tsx` (vista tabla, similar a listados existentes)

### Data fetching

- SWR (ya usado en módulos existentes)
- endpoints deben soportar filtros para no cargar “todo” a cliente

---

## Integraciones (Fase 2+)

### Documentos/adjuntos

Opción recomendada: reusar `documents`:

- `module_slug = 'project-management'`
- `record_id = pm_tasks.id`

Esto evita crear un Storage bucket nuevo y mantiene un único DMS transversal.

### Notificaciones

Reusar tabla `notifications`:
- `module_slug = 'project-management'`
- `link = /dashboard/proyectos/[projectId]?taskId=...`

---

## Checklist “Definition of Done” (MVP)

- [ ] Migración `pm_*` creada en `supabase/migrations/` con RLS + policies
- [ ] Endpoints `/api/v1/pm/*` implementados con `withAuth` + `logAudit`
- [ ] Navegación: módulo visible en sidebar para roles definidos
- [ ] UI Kanban: mover tarea entre columnas persiste y refresca
- [ ] UI Tabla: filtra por responsable / vencidas / búsqueda
- [ ] `npm run build` pasa
- [ ] `npm run test` pasa
- [ ] (Opcional) Playwright E2E: crear tarea + mover + editar

