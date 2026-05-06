-- Migration: 20260510_payroll_v2_projection_and_rates.sql
-- Description:
--   - Add configurable payroll rates by role/exam and per-applicator overrides
--   - Extend payroll_line_items for projected vs actual tracking
--   - Harden event_staff shape required by payroll calculations
--   - Replace fn_calculate_payroll_for_period with rate-priority resolution

-- 1) Rate catalogs
CREATE TABLE IF NOT EXISTS public.role_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('EVALUATOR', 'INVIGILATOR', 'SUPERVISOR', 'ADMIN', 'REMOTE')),
  exam_type text,
  rate_per_hour numeric(10, 2) NOT NULL CHECK (rate_per_hour >= 0),
  effective_from date NOT NULL DEFAULT current_date,
  effective_to date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT role_rates_effective_range_chk CHECK (effective_to IS NULL OR effective_to >= effective_from),
  CONSTRAINT role_rates_unique UNIQUE (org_id, role, exam_type, effective_from)
);

CREATE TABLE IF NOT EXISTS public.applicator_role_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  applicator_id uuid NOT NULL REFERENCES public.applicators(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('EVALUATOR', 'INVIGILATOR', 'SUPERVISOR', 'ADMIN', 'REMOTE')),
  exam_type text,
  rate_per_hour numeric(10, 2) NOT NULL CHECK (rate_per_hour >= 0),
  effective_from date NOT NULL DEFAULT current_date,
  effective_to date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT applicator_role_rates_effective_range_chk CHECK (effective_to IS NULL OR effective_to >= effective_from),
  CONSTRAINT applicator_role_rates_unique UNIQUE (applicator_id, role, exam_type, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_role_rates_org_role_exam ON public.role_rates(org_id, role, exam_type);
CREATE INDEX IF NOT EXISTS idx_applicator_role_rates_lookup ON public.applicator_role_rates(applicator_id, role, exam_type);

ALTER TABLE public.role_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applicator_role_rates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'role_rates'
      AND policyname = 'Members can read role_rates'
  ) THEN
    CREATE POLICY "Members can read role_rates"
      ON public.role_rates FOR SELECT TO authenticated
      USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'role_rates'
      AND policyname = 'Supervisors can manage role_rates'
  ) THEN
    CREATE POLICY "Supervisors can manage role_rates"
      ON public.role_rates FOR ALL TO authenticated
      USING (
        org_id IN (
          SELECT org_id FROM public.org_members
          WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
      )
      WITH CHECK (
        org_id IN (
          SELECT org_id FROM public.org_members
          WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'applicator_role_rates'
      AND policyname = 'Members can read applicator_role_rates'
  ) THEN
    CREATE POLICY "Members can read applicator_role_rates"
      ON public.applicator_role_rates FOR SELECT TO authenticated
      USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'applicator_role_rates'
      AND policyname = 'Supervisors can manage applicator_role_rates'
  ) THEN
    CREATE POLICY "Supervisors can manage applicator_role_rates"
      ON public.applicator_role_rates FOR ALL TO authenticated
      USING (
        org_id IN (
          SELECT org_id FROM public.org_members
          WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
      )
      WITH CHECK (
        org_id IN (
          SELECT org_id FROM public.org_members
          WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
      );
  END IF;
END $$;

-- 2) payroll_line_items v2 fields (projection vs real + line typing)
ALTER TABLE public.payroll_line_items
  ADD COLUMN IF NOT EXISTS line_type text NOT NULL DEFAULT 'work' CHECK (line_type IN ('work', 'viatico', 'bonus', 'deduction')),
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'auto_event_staff' CHECK (source IN ('auto_event_staff', 'manual')),
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.event_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS projected_hours numeric(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS projected_rate numeric(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS projected_amount numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_hours numeric(10, 2),
  ADD COLUMN IF NOT EXISTS actual_rate numeric(10, 2),
  ADD COLUMN IF NOT EXISTS actual_amount numeric(12, 2),
  ADD COLUMN IF NOT EXISTS is_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Keep legacy columns coherent with projected values.
UPDATE public.payroll_line_items
SET
  projected_hours = COALESCE(projected_hours, hours, 0),
  projected_rate = COALESCE(projected_rate, rate, 0),
  projected_amount = COALESCE(projected_amount, total_amount, 0),
  line_type = COALESCE(line_type, 'work'),
  source = COALESCE(source, 'auto_event_staff')
WHERE projected_hours = 0
  AND projected_rate = 0
  AND projected_amount = 0;

CREATE INDEX IF NOT EXISTS idx_payroll_line_items_entry ON public.payroll_line_items(entry_id);
CREATE INDEX IF NOT EXISTS idx_payroll_line_items_event ON public.payroll_line_items(event_id);
CREATE INDEX IF NOT EXISTS idx_payroll_line_items_session ON public.payroll_line_items(session_id);
CREATE INDEX IF NOT EXISTS idx_payroll_line_items_type ON public.payroll_line_items(line_type);

-- 3) Harden event_staff columns used by payroll calculations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'event_staff' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.event_staff ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'event_staff' AND column_name = 'session_id'
  ) THEN
    ALTER TABLE public.event_staff ADD COLUMN session_id uuid REFERENCES public.event_sessions(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'event_staff' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.event_staff ADD COLUMN status text NOT NULL DEFAULT 'confirmed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'event_staff' AND column_name = 'rate_per_hour'
  ) THEN
    ALTER TABLE public.event_staff ADD COLUMN rate_per_hour numeric(10, 2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'event_staff' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE public.event_staff ADD COLUMN start_time timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'event_staff' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE public.event_staff ADD COLUMN end_time timestamptz;
  END IF;
END $$;

-- Backfill org_id from parent event if missing.
UPDATE public.event_staff es
SET org_id = e.org_id
FROM public.events e
WHERE es.event_id = e.id
  AND es.org_id IS NULL;

-- Backfill rate_per_hour from hourly_rate if available.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'event_staff' AND column_name = 'hourly_rate'
  ) THEN
    UPDATE public.event_staff
    SET rate_per_hour = hourly_rate
    WHERE rate_per_hour IS NULL
      AND hourly_rate IS NOT NULL;
  END IF;
END $$;

-- Populate start/end from event_slots where possible.
UPDATE public.event_staff es
SET
  start_time = (date_trunc('day', e.date) + s.start_time)::timestamptz,
  end_time = (date_trunc('day', e.date) + s.end_time)::timestamptz
FROM public.event_slots s
JOIN public.events e ON e.id = s.event_id
WHERE es.applicator_id = s.applicator_id
  AND es.event_id = s.event_id
  AND (es.session_id IS NULL OR es.session_id = s.session_id)
  AND es.start_time IS NULL
  AND es.end_time IS NULL;

-- 4) Rate resolver helper with precedence:
--    applicator_role_rates > role_rates(role+exam) > role_rates(role generic) > fallback/base rate.
CREATE OR REPLACE FUNCTION public.fn_resolve_payroll_rate(
  p_org_id uuid,
  p_applicator_id uuid,
  p_role text,
  p_exam_type text,
  p_work_date date,
  p_fallback_rate numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate numeric;
BEGIN
  SELECT arr.rate_per_hour
  INTO v_rate
  FROM public.applicator_role_rates arr
  WHERE arr.org_id = p_org_id
    AND arr.applicator_id = p_applicator_id
    AND arr.role = p_role
    AND (arr.exam_type = p_exam_type OR arr.exam_type IS NULL)
    AND arr.effective_from <= COALESCE(p_work_date, current_date)
    AND (arr.effective_to IS NULL OR arr.effective_to >= COALESCE(p_work_date, current_date))
  ORDER BY
    CASE WHEN arr.exam_type = p_exam_type THEN 0 ELSE 1 END,
    arr.effective_from DESC
  LIMIT 1;

  IF v_rate IS NOT NULL THEN
    RETURN v_rate;
  END IF;

  SELECT rr.rate_per_hour
  INTO v_rate
  FROM public.role_rates rr
  WHERE rr.org_id = p_org_id
    AND rr.role = p_role
    AND (rr.exam_type = p_exam_type OR rr.exam_type IS NULL)
    AND rr.effective_from <= COALESCE(p_work_date, current_date)
    AND (rr.effective_to IS NULL OR rr.effective_to >= COALESCE(p_work_date, current_date))
  ORDER BY
    CASE WHEN rr.exam_type = p_exam_type THEN 0 ELSE 1 END,
    rr.effective_from DESC
  LIMIT 1;

  RETURN COALESCE(v_rate, p_fallback_rate, 0);
END;
$$;

-- 5) Replace payroll calculator (projection-first model)
CREATE OR REPLACE FUNCTION public.fn_calculate_payroll_for_period(p_period_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date date;
  v_end_date date;
  v_org_id uuid;
  v_items_count integer := 0;
BEGIN
  SELECT start_date, end_date, org_id
  INTO v_start_date, v_end_date, v_org_id
  FROM public.payroll_periods
  WHERE id = p_period_id;

  IF v_org_id IS NULL THEN
    RETURN json_build_object('error', 'Period not found', 'period_id', p_period_id);
  END IF;

  DELETE FROM public.payroll_line_items
  WHERE entry_id IN (SELECT id FROM public.payroll_entries WHERE period_id = p_period_id);

  DELETE FROM public.payroll_entries
  WHERE period_id = p_period_id;

  -- Create parent entries by applicator from confirmed slots in date range.
  INSERT INTO public.payroll_entries (
    period_id,
    org_id,
    applicator_id,
    applicator_name,
    hours_worked,
    rate_per_hour,
    slots_count,
    events_count,
    subtotal,
    total,
    status,
    type
  )
  SELECT
    p_period_id,
    v_org_id,
    s.applicator_id,
    COALESCE(MAX(a.name), 'Unknown'),
    COALESCE(SUM(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600), 0),
    0,
    COUNT(s.id),
    COUNT(DISTINCT s.event_id),
    0,
    0,
    'pending',
    'operational'
  FROM public.event_slots s
  JOIN public.events e ON e.id = s.event_id
  JOIN public.applicators a ON a.id = s.applicator_id
  WHERE e.org_id = v_org_id
    AND e.date::date BETWEEN v_start_date AND v_end_date
    AND LOWER(COALESCE(s.status, '')) = 'confirmed'
    AND s.applicator_id IS NOT NULL
  GROUP BY s.applicator_id;

  -- Create projected work lines by event/session for each confirmed slot.
  INSERT INTO public.payroll_line_items (
    entry_id,
    event_id,
    session_id,
    org_id,
    event_name,
    role,
    line_type,
    source,
    hours,
    rate,
    fixed_payment,
    total_amount,
    projected_hours,
    projected_rate,
    projected_amount,
    category
  )
  SELECT
    pe.id,
    s.event_id,
    s.session_id,
    v_org_id,
    e.title,
    COALESCE(es.role, 'INVIGILATOR'),
    'work',
    'auto_event_staff',
    COALESCE(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600, 0),
    public.fn_resolve_payroll_rate(
      v_org_id,
      s.applicator_id,
      COALESCE(es.role, 'INVIGILATOR'),
      COALESCE(sess.exam_type, e.exam_type),
      e.date::date,
      COALESCE(es.rate_per_hour, a.rate_per_hour, 0)
    ),
    COALESCE(es.fixed_payment, 0),
    (
      COALESCE(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600, 0)
      * public.fn_resolve_payroll_rate(
          v_org_id,
          s.applicator_id,
          COALESCE(es.role, 'INVIGILATOR'),
          COALESCE(sess.exam_type, e.exam_type),
          e.date::date,
          COALESCE(es.rate_per_hour, a.rate_per_hour, 0)
        )
    ) + COALESCE(es.fixed_payment, 0),
    COALESCE(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600, 0),
    public.fn_resolve_payroll_rate(
      v_org_id,
      s.applicator_id,
      COALESCE(es.role, 'INVIGILATOR'),
      COALESCE(sess.exam_type, e.exam_type),
      e.date::date,
      COALESCE(es.rate_per_hour, a.rate_per_hour, 0)
    ),
    (
      COALESCE(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600, 0)
      * public.fn_resolve_payroll_rate(
          v_org_id,
          s.applicator_id,
          COALESCE(es.role, 'INVIGILATOR'),
          COALESCE(sess.exam_type, e.exam_type),
          e.date::date,
          COALESCE(es.rate_per_hour, a.rate_per_hour, 0)
        )
    ) + COALESCE(es.fixed_payment, 0),
    'event_session'
  FROM public.event_slots s
  JOIN public.events e ON e.id = s.event_id
  JOIN public.applicators a ON a.id = s.applicator_id
  JOIN public.payroll_entries pe
    ON pe.period_id = p_period_id
   AND pe.applicator_id = s.applicator_id
  LEFT JOIN public.event_sessions sess ON sess.id = s.session_id
  LEFT JOIN public.event_staff es
    ON es.event_id = s.event_id
   AND es.applicator_id = s.applicator_id
   AND (es.session_id IS NULL OR es.session_id = s.session_id)
  WHERE e.org_id = v_org_id
    AND e.date::date BETWEEN v_start_date AND v_end_date
    AND LOWER(COALESCE(s.status, '')) = 'confirmed'
    AND s.applicator_id IS NOT NULL;

  GET DIAGNOSTICS v_items_count = ROW_COUNT;

  -- Update parent totals from projected items.
  UPDATE public.payroll_entries pe
  SET
    hours_worked = COALESCE((
      SELECT SUM(li.projected_hours)
      FROM public.payroll_line_items li
      WHERE li.entry_id = pe.id
        AND li.line_type = 'work'
    ), 0),
    subtotal = COALESCE((
      SELECT SUM(li.projected_amount)
      FROM public.payroll_line_items li
      WHERE li.entry_id = pe.id
        AND li.line_type IN ('work', 'bonus', 'viatico')
    ), 0),
    total = COALESCE((
      SELECT SUM(
        CASE
          WHEN li.line_type = 'deduction' THEN -1 * li.projected_amount
          ELSE li.projected_amount
        END
      )
      FROM public.payroll_line_items li
      WHERE li.entry_id = pe.id
    ), 0) + COALESCE(pe.adjustments, 0)
  WHERE pe.period_id = p_period_id;

  UPDATE public.payroll_periods
  SET
    total_amount = COALESCE((
      SELECT SUM(pe2.total)
      FROM public.payroll_entries pe2
      WHERE pe2.period_id = p_period_id
    ), 0),
    status = 'calculated',
    updated_at = now()
  WHERE id = p_period_id;

  RETURN json_build_object(
    'status', 'success',
    'items_calculated', v_items_count,
    'period_id', p_period_id
  );
END;
$$;
