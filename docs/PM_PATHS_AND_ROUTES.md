# PM Paths and Routes

Mapa rapido de archivos y rutas del modulo Project Management.

---

## UI Routes

- `/dashboard/proyectos`

Archivo principal:

- `src/app/(dashboard)/dashboard/proyectos/page.tsx`

---

## API Routes

- `GET|POST /api/v1/pm/projects`
  - `src/app/api/v1/pm/projects/route.ts`
- `GET|PATCH /api/v1/pm/projects/[id]`
  - `src/app/api/v1/pm/projects/[id]/route.ts`
- `GET|POST /api/v1/pm/tasks`
  - `src/app/api/v1/pm/tasks/route.ts`
- `GET|PATCH /api/v1/pm/tasks/[id]`
  - `src/app/api/v1/pm/tasks/[id]/route.ts`
- `POST /api/v1/pm/tasks/[id]/move`
  - `src/app/api/v1/pm/tasks/[id]/move/route.ts`

---

## Database migrations

- `supabase/migrations/20260515_project_management_module_phase1.sql`
- `supabase/migrations/20260515_register_project_management_module.sql`
- `supabase/migrations/20260516_pm_tasks_scope_role_personal.sql`

---

## Core PM tables

- `pm_projects`
- `pm_boards`
- `pm_columns`
- `pm_tasks`
- `pm_labels`
- `pm_task_labels`

Campos nuevos fase 1.1 en `pm_tasks`:

- `scope` (`team|role|personal`)
- `role_target` (`admin|supervisor|operador|applicator|null`)
- `is_private` (`boolean`)

---

## Security and platform integration

- Auth wrapper: `src/lib/auth/with-handler.ts`
- Audit helper: `src/lib/audit/log.ts`
- Sidebar route map: `src/components/sidebar-nav.tsx` (`project-management` -> `/dashboard/proyectos`)
