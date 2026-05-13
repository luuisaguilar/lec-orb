-- Migration: 20260512_crm_add_action_fields.sql
-- Adds responsable + proxima_accion fields to crm-prospects module.
-- Run after 20260512_crm_prospects_module.sql.

INSERT INTO public.module_fields (
    module_id, name, label, field_type,
    is_required, options, sort_order, show_in_list, is_searchable
)
SELECT
    mr.id,
    f.name,
    f.label,
    f.field_type,
    f.is_required::boolean,
    f.options::jsonb,
    f.sort_order::int,
    f.show_in_list::boolean,
    f.is_searchable::boolean
FROM public.module_registry mr
CROSS JOIN (VALUES
    ('responsable',    'Responsable',     'text',     'false', '{"max_length":100}', 85,  'true',  'false'),
    ('proxima_accion', 'Próxima acción',  'textarea', 'false', '{}',                 95,  'false', 'false')
) AS f(name, label, field_type, is_required, options, sort_order, show_in_list, is_searchable)
WHERE mr.slug = 'crm-prospects'
  AND mr.org_id IS NULL
ON CONFLICT (module_id, name) DO NOTHING;
