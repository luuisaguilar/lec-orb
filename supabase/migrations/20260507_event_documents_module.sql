-- Native module for event documents tracker under Institucional
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.module_registry
    WHERE slug = 'event-documents'
      AND org_id IS NULL
  ) THEN
    UPDATE public.module_registry
    SET
      name = 'Documentos de Eventos',
      icon = 'FileText',
      category = 'Institucional',
      is_native = true,
      sort_order = 26,
      description = 'Seguimiento documental por evento con áreas separadas: logística, certificados y resultados.',
      is_active = true
    WHERE slug = 'event-documents'
      AND org_id IS NULL;
  ELSE
    INSERT INTO public.module_registry (
      slug,
      name,
      icon,
      category,
      is_native,
      sort_order,
      description
    )
    VALUES (
      'event-documents',
      'Documentos de Eventos',
      'FileText',
      'Institucional',
      true,
      26,
      'Seguimiento documental por evento con áreas separadas: logística, certificados y resultados.'
    );
  END IF;
END $$;

