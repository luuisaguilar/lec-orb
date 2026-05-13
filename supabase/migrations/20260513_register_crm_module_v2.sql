-- Migration: 20260612_register_crm_module.sql
-- Description: Register CRM module in module_registry + sidebar category

DELETE FROM public.member_module_access WHERE module = 'crm-prospects';
DELETE FROM public.module_permissions WHERE module_id IN (SELECT id FROM public.module_registry WHERE slug = 'crm-prospects' AND org_id IS NULL);
DELETE FROM public.module_registry WHERE slug = 'crm-prospects' AND org_id IS NULL;

INSERT INTO public.module_registry (slug, name, icon, category, is_native, sort_order, description)
VALUES 
('crm', 'CRM', 'Users', 'Comercial', true, 15, 'Pipeline comercial, contactos y seguimiento de oportunidades')
ON CONFLICT (org_id, slug) DO NOTHING;

DO $$
DECLARE
    v_module_id UUID;
BEGIN
    SELECT id INTO v_module_id FROM public.module_registry WHERE slug = 'crm' AND org_id IS NULL LIMIT 1;
    IF v_module_id IS NOT NULL THEN
        INSERT INTO public.module_permissions (module_id, role, can_view, can_create, can_edit, can_delete) VALUES
            (v_module_id, 'admin',      true, true,  true,  true),
            (v_module_id, 'supervisor', true, true,  true,  false),
            (v_module_id, 'operador',   true, true,  false, false),
            (v_module_id, 'applicator', false, false, false, false)
        ON CONFLICT (module_id, role) DO NOTHING;
    END IF;
END
$$;
