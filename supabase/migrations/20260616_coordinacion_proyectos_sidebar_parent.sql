-- Tras `20260615`: asegura padre «Coordinación de proyectos» si el registry quedó en Institucional o en Coordinación de Exámenes.

UPDATE public.module_registry
SET
    category = 'Coordinación de proyectos',
    name = 'Coordinación de proyectos (LEC)'
WHERE slug = 'coordinacion-proyectos-lec'
  AND org_id IS NULL
  AND category IN ('Institucional', 'Coordinación de Exámenes');
