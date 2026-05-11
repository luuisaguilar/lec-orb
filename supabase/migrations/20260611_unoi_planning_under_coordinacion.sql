-- Move native module "Planeación UNOi" from Logística to Coordinación de Exámenes (sidebar grouping).

UPDATE public.module_registry
SET
    category = 'Coordinación de Exámenes',
    sort_order = 11
WHERE slug = 'unoi-planning';
