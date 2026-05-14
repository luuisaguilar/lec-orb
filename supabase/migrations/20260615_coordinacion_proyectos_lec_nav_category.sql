-- Coordinación proyectos LEC: padre de sidebar propio («Coordinación de proyectos»), hermano de «Coordinación de Exámenes».

UPDATE public.module_registry
SET
    category = 'Coordinación de proyectos',
    name = 'Coordinación de proyectos (LEC)'
WHERE slug = 'coordinacion-proyectos-lec'
  AND org_id IS NULL;
