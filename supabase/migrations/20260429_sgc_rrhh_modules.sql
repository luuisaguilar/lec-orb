-- Migration: 20260429_sgc_rrhh_modules.sql
-- Description: Registers the new native RRHH and SGC modules in the module_registry

-- We remove the old 'hr' module if it was manually inserted by the user, 
-- or we just insert the new ones.

INSERT INTO public.module_registry (slug, name, icon, category, is_native, sort_order, description) VALUES
('rrhh', 'Recursos Humanos', 'Users', 'Institucional', true, 15, 'Gestión de Capital Humano, Onboarding y Perfiles'),
('sgc', 'Calidad (SGC)', 'Workflow', 'Institucional', true, 16, 'Sistema de Gestión de Calidad ISO 9001/21001')
ON CONFLICT (org_id, slug) DO NOTHING;

-- If 'hr' was inserted globally, remove it so there are no duplicates.
DELETE FROM public.module_registry WHERE slug = 'hr' AND org_id IS NULL;
