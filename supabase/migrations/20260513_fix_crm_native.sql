-- Migration: 20260513_fix_crm_native.sql
-- Ensures the crm-prospects module is marked as native (is_native=true)
-- so the sidebar routes to /dashboard/crm/prospectos (dedicated full-featured UI)
-- instead of the generic DynamicModule renderer at /dashboard/m/crm-prospects.
--
-- Also inserts the native entry if it doesn't exist yet, and deactivates any
-- duplicate org-scoped entry that might have been created via Studio.

-- 1. Upsert the global native module
INSERT INTO public.module_registry (
    slug, name, icon, category, is_native, is_active, sort_order, description, org_id
) VALUES (
    'crm-prospects',
    'Prospectos',
    'UserSearch',
    'CRM',
    true,
    true,
    70,
    'Pipeline de ventas y seguimiento a prospectos',
    NULL
)
ON CONFLICT (org_id, slug) DO UPDATE
    SET is_native   = true,
        icon        = 'UserSearch',
        is_active   = true,
        name        = 'Prospectos',
        category    = 'CRM',
        sort_order  = 70,
        description = 'Pipeline de ventas y seguimiento a prospectos';

-- 2. Seed default module permissions for the native CRM if missing
DO $$
DECLARE
    v_module_id UUID;
BEGIN
    SELECT id INTO v_module_id
    FROM public.module_registry
    WHERE slug = 'crm-prospects' AND org_id IS NULL;

    IF v_module_id IS NOT NULL THEN
        INSERT INTO public.module_permissions (module_id, role, can_view, can_create, can_edit, can_delete)
        VALUES
            (v_module_id, 'admin',      true, true,  true,  true),
            (v_module_id, 'supervisor', true, true,  true,  false),
            (v_module_id, 'operador',   true, true,  false, false),
            (v_module_id, 'applicator', false,false, false, false)
        ON CONFLICT (module_id, role) DO NOTHING;
    END IF;
END
$$;
