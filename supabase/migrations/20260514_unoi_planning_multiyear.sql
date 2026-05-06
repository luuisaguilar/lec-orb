-- Migration: 20260514_unoi_planning_multiyear.sql
-- Description: Adds explicit year/cycle segmentation for UNOi planning.

ALTER TABLE public.unoi_planning_rows
ADD COLUMN IF NOT EXISTS planning_year integer,
ADD COLUMN IF NOT EXISTS planning_cycle text;

UPDATE public.unoi_planning_rows
SET
  planning_year = COALESCE(planning_year, EXTRACT(YEAR FROM proposed_date)::integer),
  planning_cycle = COALESCE(NULLIF(planning_cycle, ''), 'annual')
WHERE planning_year IS NULL
   OR planning_cycle IS NULL
   OR planning_cycle = '';

ALTER TABLE public.unoi_planning_rows
ALTER COLUMN planning_year SET NOT NULL,
ALTER COLUMN planning_cycle SET NOT NULL,
ALTER COLUMN planning_cycle SET DEFAULT 'annual';

CREATE INDEX IF NOT EXISTS idx_unoi_planning_org_year_date
  ON public.unoi_planning_rows(org_id, planning_year, proposed_date);

CREATE INDEX IF NOT EXISTS idx_unoi_planning_org_year_school
  ON public.unoi_planning_rows(org_id, planning_year, school_name);
