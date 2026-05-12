-- OOPT PDF splitter (native module) + inherit view access from exam-codes for existing members

INSERT INTO public.module_registry (slug, name, icon, category, is_native, sort_order, description) VALUES
(
    'oopt-pdf',
    'OOPT — PDF por alumno',
    'FileText',
    'Exámenes',
    true,
    34,
    'Separa el PDF consolidado Oxford OOPT y renombra por alumno usando TableData.xls.'
)
ON CONFLICT (org_id, slug) DO NOTHING;

INSERT INTO public.member_module_access (member_id, org_id, module, can_view, can_edit, can_delete)
SELECT m.member_id, m.org_id, 'oopt-pdf', m.can_view, false, false
FROM public.member_module_access m
WHERE m.module = 'exam-codes'
ON CONFLICT (member_id, module) DO NOTHING;
