# Runbook - Project Management (PM)

Guia operativa para validar y operar el modulo PM (`/dashboard/proyectos`) en local y en ambientes remotos.

---

## Alcance

Este runbook cubre:

- migraciones PM fase 1 y fase 1.1 (`scope/role/personal`)
- endpoints PM principales (`/api/v1/pm/*`)
- verificacion UI basica (proyectos + tabs de tareas)
- incidencias comunes y resolucion rapida

---

## Pre-requisitos

- `.env.local` con credenciales Supabase validas
- usuario con membresia en una `org` activa
- modulo `project-management` registrado en `module_registry`

---

## Migraciones a aplicar

Orden recomendado:

1. `supabase/migrations/20260515_project_management_module_phase1.sql`
2. `supabase/migrations/20260515_register_project_management_module.sql`
3. `supabase/migrations/20260516_pm_tasks_scope_role_personal.sql`

Aplicar manualmente en Supabase SQL Editor.

---

## Smoke test manual (5-10 min)

1. Abrir `http://localhost:3000/dashboard/proyectos`
2. Crear proyecto desde "Nuevo proyecto"
3. Confirmar en DB:
   - `pm_projects` nuevo registro
   - `pm_boards` creado automaticamente
   - `pm_columns` con columnas base
4. Crear tarea via API o UI asociada a una columna
5. Validar segmentacion de tareas:
   - `scope=team` aparece en tab "Equipo"
   - `scope=role` + `role_target` coincide con tab "Por puesto"
   - `scope=personal` + `mine=true` aparece en "Mi registro"
6. Probar privacidad:
   - tarea `is_private=true` debe ser visible solo para assignee/reporter

---

## Endpoints clave

- `GET /api/v1/pm/projects`
- `POST /api/v1/pm/projects`
- `GET /api/v1/pm/projects/[id]`
- `PATCH /api/v1/pm/projects/[id]`
- `GET /api/v1/pm/tasks`
- `POST /api/v1/pm/tasks`
- `GET /api/v1/pm/tasks/[id]`
- `PATCH /api/v1/pm/tasks/[id]`
- `POST /api/v1/pm/tasks/[id]/move`

Filtros utiles en tareas:

- `scope=team|role|personal`
- `role_target=admin|supervisor|operador|applicator`
- `mine=true`
- `project_id`, `board_id`, `column_id`, `assignee_user_id`, `q`, `due`

---

## Troubleshooting rapido

### No aparece el modulo Proyectos en sidebar

- Verificar registro en `module_registry` (`slug='project-management'`, `is_active=true`)
- Verificar permisos de modulo en `member_module_access`

### Error al crear tareas por rol

- Si `scope=role`, enviar `role_target` obligatorio
- Confirmar que `role_target` este en el enum permitido

### "Mi registro" vacio

- Confirmar que tareas personales tengan `scope='personal'`
- Confirmar asignacion al usuario actual (`assignee_user_id`)
- Revisar filtro `mine=true`

### Tareas privadas visibles a otros usuarios

- Revisar valor de `is_private`
- Revisar `assignee_user_id`/`reporter_user_id` y logica de visibilidad en `GET /api/v1/pm/tasks`

---

## Referencias

- ADR: `docs/adr/ADR-007-project-management-module-foundation.md`
- Paths y rutas PM: `docs/PM_PATHS_AND_ROUTES.md`
- Runbook general: `docs/RUNBOOK.md`
