# RBAC Validation Matrix — 9 Groups

This matrix validates `project-management` permissions across 9 groups (3 roles x 3 actions) using `member_module_access` as source of truth.

## Scope

- Roles: `admin`, `supervisor`, `operador`
- Actions: `view`, `edit`, `delete`
- Module: `project-management`
- Guard path: `withAuth` + `checkServerPermission`

## Expected Matrix

| Group | Role | Action | Expected |
|------|------|--------|----------|
| G1 | admin | view | allow |
| G2 | admin | edit | allow |
| G3 | admin | delete | allow |
| G4 | supervisor | view | allow when `can_view=true` |
| G5 | supervisor | edit | deny when `can_edit=false` |
| G6 | supervisor | delete | deny when `can_delete=false` |
| G7 | operador | view | allow when `can_view=true` |
| G8 | operador | edit | allow when `can_edit=true` |
| G9 | operador | delete | deny when `can_delete=false` |

## Automated Validation

Run:

```bash
npm run test -- src/tests/lib/auth/check-server-permission.matrix.test.ts
```

Validation target:

- `src/lib/auth/permissions.ts`
- `src/lib/auth/with-handler.ts`

## Staging / Production Re-run Checklist

For each environment, verify with real users seeded in `org_members` and `member_module_access`:

1. `GET /api/v1/pm/projects` as each group
2. `POST /api/v1/pm/projects` as each group
3. `POST /api/v1/pm/tasks` as each group
4. `POST /api/v1/pm/tasks/:id/move` as each group
5. Confirm `403` for denied paths and `2xx` for allowed paths

Expected PM policy baseline from migrations:

- `can_view`: admin/supervisor/operador/applicator
- `can_edit`: admin/supervisor/operador
- `can_delete`: admin/supervisor

