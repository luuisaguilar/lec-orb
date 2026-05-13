-- Migration: 20260512_crm_prospects_module.sql
-- Description: Seeds the CRM Prospectos module (global, is_native=false) and its
--              standard fields. Uses the DynamicModule renderer — no dedicated
--              React component needed.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Ensure module exists in registry
--    org_id = NULL → global, available to all orgs
--    is_native = false → rendered by DynamicModule + module_fields
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.module_registry (
    slug, name, icon, category, is_native, sort_order, description, org_id, config
) VALUES (
    'crm-prospects',
    'Prospectos',
    'UserPlus',
    'CRM',
    false,
    70,
    'Pipeline de ventas y seguimiento a prospectos',
    NULL,
    '{"default_view": "table", "color": "#b91c1c"}'
)
ON CONFLICT (org_id, slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Seed standard CRM fields
--    Uses a CROSS JOIN VALUES so we only need to look up the module id once.
-- ─────────────────────────────────────────────────────────────────────────────
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
    ('nombre',           'Nombre',            'text',     'true',  '{"max_length":100}',                                                                                    10,  'true',  'true' ),
    ('email',            'Correo',            'email',    'false', '{}',                                                                                                     20,  'true',  'true' ),
    ('telefono',         'Teléfono',          'phone',    'false', '{}',                                                                                                     30,  'true',  'false'),
    ('colegio',          'Colegio / Empresa', 'text',     'false', '{"max_length":150}',                                                                                     40,  'true',  'true' ),
    ('ciudad',           'Ciudad',            'text',     'false', '{"max_length":80}',                                                                                      50,  'false', 'false'),
    ('interes',          'Interés',           'select',   'false', '{"choices":["TOEFL","CENNI","Cambridge","Inglés general","Otro"]}',                                      60,  'true',  'false'),
    ('fuente',           'Fuente',            'select',   'false', '{"choices":["WhatsApp","Web","Referido","Llamada","Correo","Expo / Evento","Otro"]}',                     70,  'false', 'false'),
    ('estado',           'Etapa',             'status',   'false', '{"stages":["Nuevo","Contactado","En negociación","Propuesta enviada","Ganado","Perdido"]}',               80,  'true',  'false'),
    ('valor_potencial',  'Valor potencial',   'currency', 'false', '{"currency":"MXN"}',                                                                                     90,  'false', 'false'),
    ('fecha_contacto',   'Fecha de contacto', 'date',     'false', '{}',                                                                                                    100,  'false', 'false'),
    ('notas',            'Notas',             'textarea', 'false', '{}',                                                                                                    110,  'false', 'false')
) AS f(name, label, field_type, is_required, options, sort_order, show_in_list, is_searchable)
WHERE mr.slug = 'crm-prospects'
  AND mr.org_id IS NULL
ON CONFLICT (module_id, name) DO NOTHING;
