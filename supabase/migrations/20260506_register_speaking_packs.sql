-- Migration: Register Speaking Packs module
-- Description: Adds the speaking-packs module to the registry under Exámenes category.

INSERT INTO public.module_registry (slug, name, icon, category, is_native, sort_order, description)
VALUES (
    'speaking-packs', 
    'Speaking Packs', 
    'Package', 
    'Exámenes', 
    true, 
    34, 
    'Inventario de speaking packs para evaluación'
)
ON CONFLICT (org_id, slug) 
DO UPDATE SET 
    name = 'Speaking Packs',
    category = 'Exámenes',
    sort_order = 34,
    is_active = true;
