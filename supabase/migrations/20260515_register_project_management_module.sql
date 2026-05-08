-- Migration: 20260515_register_project_management_module.sql
-- Description: Registers native module "project-management" in module_registry.

INSERT INTO public.module_registry (slug, name, icon, category, is_native, sort_order, description)
VALUES (
  'project-management',
  'Proyectos',
  'Kanban',
  'Institucional',
  true,
  13,
  'Gestión transversal de tareas y tableros (estilo Asana/Trello/Monday)'
)
ON CONFLICT (org_id, slug) DO NOTHING;

-- Migration: 20260515_register_project_management_module.sql
-- Description: Registers native module "project-management" in module_registry.

INSERT INTO public.module_registry (slug, name, icon, category, is_native, sort_order, description)
VALUES (
  'project-management',
  'Proyectos',
  'Kanban',
  'Institucional',
  true,
  13,
  'Gestión transversal de tareas y tableros (estilo Asana/Trello/Monday)'
)
ON CONFLICT (org_id, slug) DO NOTHING;

