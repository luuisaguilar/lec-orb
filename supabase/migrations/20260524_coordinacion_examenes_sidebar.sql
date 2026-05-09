-- Sidebar: merge exam modules under "Coordinación de Exámenes"
-- RRHH y SGC permanecen en Institucional.

UPDATE public.module_registry
SET category = 'Coordinación de Exámenes'
WHERE org_id IS NULL
  AND category = 'Exámenes';

UPDATE public.module_registry
SET category = 'Coordinación de Exámenes'
WHERE org_id IS NULL
  AND category = 'Institucional'
  AND slug IN (
    'schools',
    'applicators',
    'events',
    'event-documents',
    'project-management'
  );

-- Copia explícita por si event-documents quedó solo en upsert anterior
UPDATE public.module_registry
SET category = 'Coordinación de Exámenes'
WHERE org_id IS NULL
  AND slug = 'event-documents';
