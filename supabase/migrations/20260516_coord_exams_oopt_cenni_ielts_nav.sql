-- Nav / módulos: CENNI y OOPT bajo "Coordinación de Exámenes"; módulo nativo IELTS (placeholder).

-- 1) Reclasificar CENNI y OOPT a Coordinación de Exámenes (filas globales y por org si existieran)
UPDATE public.module_registry
SET
    category = 'Coordinación de Exámenes',
    updated_at = NOW()
WHERE slug IN ('cenni', 'oopt-pdf');

-- 2) Módulo nativo IELTS (sin pantallas funcionales aún — ruta placeholder en app)
INSERT INTO public.module_registry (
    org_id,
    slug,
    name,
    icon,
    description,
    category,
    is_native,
    is_active,
    sort_order
)
SELECT
    NULL,
    'ielts',
    'IELTS',
    'Languages',
    'Espacio reservado para gestión IELTS (en construcción).',
    'Coordinación de Exámenes',
    true,
    true,
    43
WHERE NOT EXISTS (
    SELECT 1 FROM public.module_registry mr WHERE mr.slug = 'ielts' AND mr.org_id IS NULL
);

-- 3) Permisos granulares: mismo patrón que OOPT (quien ve exam-codes ve IELTS en sidebar)
INSERT INTO public.member_module_access (member_id, org_id, module, can_view, can_edit, can_delete)
SELECT m.member_id, m.org_id, 'ielts', m.can_view, false, false
FROM public.member_module_access m
WHERE m.module = 'exam-codes'
ON CONFLICT (member_id, module) DO NOTHING;

-- 4) Misma regla que OOPT: quien ya puede ver IELTS puede editar (guardados futuros, etc.)
UPDATE public.member_module_access
SET can_edit = true
WHERE module = 'ielts' AND can_view = true AND can_edit = false;
