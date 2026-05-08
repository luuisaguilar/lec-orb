-- Migration: 20260516_pm_tasks_scope_role_personal.sql
-- Description: Adds team/role/personal scope fields for PM tasks.

ALTER TABLE public.pm_tasks
ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'team'
    CHECK (scope IN ('team', 'role', 'personal')),
ADD COLUMN IF NOT EXISTS role_target text NULL
    CHECK (role_target IN ('admin', 'supervisor', 'operador', 'applicator')),
ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_pm_tasks_org_scope ON public.pm_tasks(org_id, scope);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_org_role_target ON public.pm_tasks(org_id, role_target);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_org_private ON public.pm_tasks(org_id, is_private);

