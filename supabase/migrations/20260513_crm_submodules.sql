-- Eliminar el módulo CRM monolítico anterior y asegurar que no haya duplicados
DELETE FROM public.module_registry 
WHERE slug IN ('crm', 'crm-prospects', 'crm-pipeline', 'crm-directory', 'crm-activities', 'crm-metrics');

-- Insertar los nuevos submódulos
INSERT INTO public.module_registry (id, slug, name, icon, category, is_native, sort_order)
VALUES 
    (gen_random_uuid(), 'crm-pipeline', 'Pipeline', 'LayoutDashboard', 'Comercial', true, 10),
    (gen_random_uuid(), 'crm-directory', 'Directorio', 'Users', 'Comercial', true, 20),
    (gen_random_uuid(), 'crm-activities', 'Actividades', 'Activity', 'Comercial', true, 30),
    (gen_random_uuid(), 'crm-metrics', 'Métricas', 'BarChart3', 'Comercial', true, 40);

-- Darte permisos a ti y a los admins para que los vean de inmediato
DO $$
DECLARE
    admin_member RECORD;
    mod RECORD;
BEGIN
    FOR admin_member IN SELECT id, user_id, org_id FROM org_members WHERE role = 'admin' LOOP
        FOR mod IN SELECT slug FROM module_registry WHERE category = 'Comercial' LOOP
            -- Intentar actualizar si existe, si no, insertar
            IF EXISTS (SELECT 1 FROM member_module_access WHERE member_id = admin_member.id AND module = mod.slug) THEN
                UPDATE member_module_access 
                SET can_view = true, can_edit = true 
                WHERE member_id = admin_member.id AND module = mod.slug;
            ELSE
                INSERT INTO member_module_access (org_id, member_id, module, can_view, can_edit)
                VALUES (admin_member.org_id, admin_member.id, mod.slug, true, true);
            END IF;
        END LOOP;
    END LOOP;
END $$;
