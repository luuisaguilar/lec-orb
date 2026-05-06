-- Migration: 20260510_unoi_planning_module.sql
-- Description: Adds UNOi planning table + native module registration

CREATE TABLE IF NOT EXISTS public.unoi_planning_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  city text,
  project text NOT NULL DEFAULT 'UNOi',
  school_name text NOT NULL,
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  nivel text,
  exam_type text NOT NULL,
  students_planned integer,
  proposed_date date NOT NULL,
  date_raw text,
  propuesta text,
  external_status text,
  resultados text,
  planning_status text NOT NULL DEFAULT 'proposed', -- proposed, linked, confirmed, rescheduled, cancelled
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  event_session_id uuid REFERENCES public.event_sessions(id) ON DELETE SET NULL,
  source_file text,
  source_row integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unoi_planning_org_date
  ON public.unoi_planning_rows(org_id, proposed_date);

CREATE INDEX IF NOT EXISTS idx_unoi_planning_org_school
  ON public.unoi_planning_rows(org_id, school_name);

CREATE INDEX IF NOT EXISTS idx_unoi_planning_org_status
  ON public.unoi_planning_rows(org_id, planning_status);

ALTER TABLE public.unoi_planning_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read unoi_planning_rows" ON public.unoi_planning_rows;
CREATE POLICY "Members can read unoi_planning_rows"
ON public.unoi_planning_rows
FOR SELECT TO authenticated
USING (
  org_id IN (
    SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Supervisors can manage unoi_planning_rows" ON public.unoi_planning_rows;
CREATE POLICY "Supervisors can manage unoi_planning_rows"
ON public.unoi_planning_rows
FOR ALL TO authenticated
USING (
  org_id IN (
    SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
  )
)
WITH CHECK (
  org_id IN (
    SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
  )
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_update_timestamp') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = 'tr_unoi_planning_rows_updated_at'
    ) THEN
      CREATE TRIGGER tr_unoi_planning_rows_updated_at
      BEFORE UPDATE ON public.unoi_planning_rows
      FOR EACH ROW EXECUTE PROCEDURE public.fn_update_timestamp();
    END IF;
  END IF;
END $$;

-- Register native module globally (org_id null)
INSERT INTO public.module_registry (
  org_id, slug, name, icon, description, category, is_native, is_active, sort_order, config
) VALUES (
  NULL,
  'unoi-planning',
  'Planeación UNOi',
  'CalendarDays',
  'Planeación de proyectos Sistema Uno (UNOi) con vinculación a eventos Cambridge.',
  'Logística',
  true,
  true,
  43,
  '{}'::jsonb
)
ON CONFLICT (org_id, slug) DO NOTHING;

