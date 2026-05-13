-- =============================================================================
-- LEC Platform — Payroll v2: per-event, per-role, with viáticos
-- =============================================================================
-- This migration replaces the simple hours×rate payroll model with a granular
-- breakdown that captures:
--   • Hours worked per role on each event session
--   • Rate determined by (role, exam_type) at the org level
--   • Optional per-applicator overrides (negotiated rates)
--   • Manual viáticos as separate line items
--   • Projected vs actual tracking (coordinator confirms after the event)
--
-- Demo/dev environment: drops legacy tables and recreates clean.
-- Replaces: 005_payroll.sql
-- =============================================================================

-- Drop legacy payroll tables (demo data only — no backfill needed)
DROP TABLE IF EXISTS public.payroll_entries CASCADE;
DROP TABLE IF EXISTS public.payroll_periods CASCADE;

-- =============================================================================
-- 1. ROLE RATES — global rate matrix per organization (role × exam_type)
-- =============================================================================

CREATE TABLE public.role_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('EVALUATOR','INVIGILATOR','SUPERVISOR','ADMIN','REMOTE')),
  exam_type text,                                  -- NULL = applies to any exam type
  rate_per_hour numeric(10,2) NOT NULL CHECK (rate_per_hour >= 0),
  effective_from date NOT NULL DEFAULT current_date,
  effective_to date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, role, exam_type, effective_from)
);

CREATE INDEX idx_role_rates_org_role ON public.role_rates(org_id, role);
CREATE INDEX idx_role_rates_lookup
  ON public.role_rates(org_id, role, exam_type, effective_from DESC);

-- =============================================================================
-- 2. APPLICATOR ROLE RATES — per-applicator overrides (exceptions)
-- =============================================================================

CREATE TABLE public.applicator_role_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  applicator_id uuid NOT NULL REFERENCES applicators(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('EVALUATOR','INVIGILATOR','SUPERVISOR','ADMIN','REMOTE')),
  exam_type text,                                  -- NULL = applies to any exam type
  rate_per_hour numeric(10,2) NOT NULL CHECK (rate_per_hour >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(applicator_id, role, exam_type)
);

CREATE INDEX idx_app_role_rates_applicator ON public.applicator_role_rates(applicator_id);

-- =============================================================================
-- 3. PAYROLL PERIODS — fortnight / month buckets
-- =============================================================================

CREATE TABLE public.payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','projected','calculated','confirmed','paid','closed')),
  projected_total numeric(12,2) NOT NULL DEFAULT 0,
  actual_total numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE INDEX idx_payroll_periods_org ON public.payroll_periods(org_id);
CREATE INDEX idx_payroll_periods_status ON public.payroll_periods(org_id, status);

-- =============================================================================
-- 4. PAYROLL ENTRIES — one per applicator per period (summary row)
-- =============================================================================

CREATE TABLE public.payroll_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  applicator_id uuid NOT NULL REFERENCES applicators(id) ON DELETE CASCADE,
  applicator_name text NOT NULL,
  -- Aggregated from lines (recalculated by trigger)
  projected_hours numeric(8,2) NOT NULL DEFAULT 0,
  actual_hours numeric(8,2) NOT NULL DEFAULT 0,
  projected_gross numeric(12,2) NOT NULL DEFAULT 0,
  actual_gross numeric(12,2) NOT NULL DEFAULT 0,
  viaticos numeric(12,2) NOT NULL DEFAULT 0,
  bonuses numeric(12,2) NOT NULL DEFAULT 0,
  deductions numeric(12,2) NOT NULL DEFAULT 0,
  projected_total numeric(12,2) NOT NULL DEFAULT 0,
  actual_total numeric(12,2) NOT NULL DEFAULT 0,
  variance numeric(12,2) NOT NULL DEFAULT 0,        -- actual_total - projected_total
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','projected','confirmed','approved','paid')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(period_id, applicator_id)
);

CREATE INDEX idx_payroll_entries_period ON public.payroll_entries(period_id);
CREATE INDEX idx_payroll_entries_applicator ON public.payroll_entries(applicator_id);
CREATE INDEX idx_payroll_entries_org ON public.payroll_entries(org_id);

-- =============================================================================
-- 5. PAYROLL ENTRY LINES — granular breakdown (per event/session/role)
-- =============================================================================

CREATE TABLE public.payroll_entry_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES payroll_entries(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  session_id uuid REFERENCES event_sessions(id) ON DELETE SET NULL,
  -- Work line metadata (filled when line_type='work')
  role text,
  exam_type text,
  -- Projected (auto-generated when event is published)
  projected_hours numeric(6,2) NOT NULL DEFAULT 0,
  projected_rate numeric(10,2),
  projected_amount numeric(12,2) NOT NULL DEFAULT 0,
  -- Actual (filled by coordinator after event completion)
  actual_hours numeric(6,2),
  actual_rate numeric(10,2),
  actual_amount numeric(12,2),
  -- Line classification
  line_type text NOT NULL CHECK (line_type IN ('work','viatico','bonus','deduction')),
  description text,
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual','auto_event_staff','auto_petty_cash')),
  -- Audit trail for confirmation
  confirmed_at timestamptz,
  confirmed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payroll_lines_entry ON public.payroll_entry_lines(entry_id);
CREATE INDEX idx_payroll_lines_event ON public.payroll_entry_lines(event_id);
CREATE INDEX idx_payroll_lines_session ON public.payroll_entry_lines(session_id);
CREATE INDEX idx_payroll_lines_type ON public.payroll_entry_lines(entry_id, line_type);

-- =============================================================================
-- 6. RATE LOOKUP HELPER — applies the priority cascade
-- =============================================================================
-- Priority:
--   1. applicator_role_rates (override per applicator)
--   2. role_rates (org-wide, role + exam_type)
--   3. role_rates (org-wide, role only — exam_type IS NULL)
--   4. applicators.rate_per_hour (fallback)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.lookup_payroll_rate(
  p_applicator_id uuid,
  p_role text,
  p_exam_type text,
  p_as_of date DEFAULT current_date
)
RETURNS numeric AS $$
DECLARE
  v_rate numeric;
  v_org_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM applicators WHERE id = p_applicator_id;

  -- 1. Override per applicator (most specific)
  SELECT rate_per_hour INTO v_rate
  FROM applicator_role_rates
  WHERE applicator_id = p_applicator_id
    AND role = p_role
    AND (exam_type = p_exam_type OR exam_type IS NULL)
  ORDER BY (exam_type IS NULL) ASC  -- prefer exact exam_type match
  LIMIT 1;
  IF v_rate IS NOT NULL THEN RETURN v_rate; END IF;

  -- 2 & 3. Org-wide rate (exact exam_type, then NULL exam_type)
  SELECT rate_per_hour INTO v_rate
  FROM role_rates
  WHERE org_id = v_org_id
    AND role = p_role
    AND (exam_type = p_exam_type OR exam_type IS NULL)
    AND effective_from <= p_as_of
    AND (effective_to IS NULL OR effective_to >= p_as_of)
  ORDER BY (exam_type IS NULL) ASC, effective_from DESC
  LIMIT 1;
  IF v_rate IS NOT NULL THEN RETURN v_rate; END IF;

  -- 4. Fallback to applicator's generic rate
  SELECT rate_per_hour INTO v_rate FROM applicators WHERE id = p_applicator_id;
  RETURN COALESCE(v_rate, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- 7. RECOMPUTE TRIGGER — keep payroll_entries summary in sync with lines
-- =============================================================================

CREATE OR REPLACE FUNCTION public.recompute_payroll_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id uuid := COALESCE(NEW.entry_id, OLD.entry_id);
BEGIN
  UPDATE payroll_entries SET
    projected_hours = COALESCE((
      SELECT SUM(projected_hours) FROM payroll_entry_lines
      WHERE entry_id = v_entry_id AND line_type = 'work'
    ), 0),
    actual_hours = COALESCE((
      SELECT SUM(COALESCE(actual_hours, projected_hours)) FROM payroll_entry_lines
      WHERE entry_id = v_entry_id AND line_type = 'work'
    ), 0),
    projected_gross = COALESCE((
      SELECT SUM(projected_amount) FROM payroll_entry_lines
      WHERE entry_id = v_entry_id AND line_type = 'work'
    ), 0),
    actual_gross = COALESCE((
      SELECT SUM(COALESCE(actual_amount, projected_amount)) FROM payroll_entry_lines
      WHERE entry_id = v_entry_id AND line_type = 'work'
    ), 0),
    viaticos = COALESCE((
      SELECT SUM(COALESCE(actual_amount, projected_amount)) FROM payroll_entry_lines
      WHERE entry_id = v_entry_id AND line_type = 'viatico'
    ), 0),
    bonuses = COALESCE((
      SELECT SUM(COALESCE(actual_amount, projected_amount)) FROM payroll_entry_lines
      WHERE entry_id = v_entry_id AND line_type = 'bonus'
    ), 0),
    deductions = COALESCE((
      SELECT SUM(COALESCE(actual_amount, projected_amount)) FROM payroll_entry_lines
      WHERE entry_id = v_entry_id AND line_type = 'deduction'
    ), 0),
    updated_at = now()
  WHERE id = v_entry_id;

  -- Compute totals from the freshly-updated columns
  UPDATE payroll_entries SET
    projected_total = projected_gross + viaticos + bonuses - deductions,
    actual_total = actual_gross + viaticos + bonuses - deductions
  WHERE id = v_entry_id;

  UPDATE payroll_entries SET
    variance = actual_total - projected_total
  WHERE id = v_entry_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recompute_payroll_entry
AFTER INSERT OR UPDATE OR DELETE ON payroll_entry_lines
FOR EACH ROW EXECUTE FUNCTION public.recompute_payroll_entry();

-- =============================================================================
-- 8. RECOMPUTE PERIOD TOTALS — when entries change, refresh period aggregate
-- =============================================================================

CREATE OR REPLACE FUNCTION public.recompute_payroll_period()
RETURNS TRIGGER AS $$
DECLARE
  v_period_id uuid := COALESCE(NEW.period_id, OLD.period_id);
BEGIN
  UPDATE payroll_periods SET
    projected_total = COALESCE((
      SELECT SUM(projected_total) FROM payroll_entries WHERE period_id = v_period_id
    ), 0),
    actual_total = COALESCE((
      SELECT SUM(actual_total) FROM payroll_entries WHERE period_id = v_period_id
    ), 0),
    updated_at = now()
  WHERE id = v_period_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recompute_payroll_period
AFTER INSERT OR UPDATE OR DELETE ON payroll_entries
FOR EACH ROW EXECUTE FUNCTION public.recompute_payroll_period();

-- =============================================================================
-- 9. UPDATED_AT TRIGGERS
-- =============================================================================

CREATE TRIGGER set_role_rates_updated_at
  BEFORE UPDATE ON role_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_app_role_rates_updated_at
  BEFORE UPDATE ON applicator_role_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_payroll_periods_updated_at
  BEFORE UPDATE ON payroll_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_payroll_entries_updated_at
  BEFORE UPDATE ON payroll_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_payroll_lines_updated_at
  BEFORE UPDATE ON payroll_entry_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 10. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE role_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE applicator_role_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_entry_lines ENABLE ROW LEVEL SECURITY;

-- Members: read access scoped to org
CREATE POLICY "members_read_role_rates" ON role_rates FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));
CREATE POLICY "members_read_applicator_role_rates" ON applicator_role_rates FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));
CREATE POLICY "members_read_payroll_periods" ON payroll_periods FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));
CREATE POLICY "members_read_payroll_entries" ON payroll_entries FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));
CREATE POLICY "members_read_payroll_lines" ON payroll_entry_lines FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- Admins: full management
CREATE POLICY "admins_manage_role_rates" ON role_rates FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('admin')));
CREATE POLICY "admins_manage_applicator_role_rates" ON applicator_role_rates FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('admin')));
CREATE POLICY "admins_manage_payroll_periods" ON payroll_periods FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('admin')));
CREATE POLICY "admins_manage_payroll_entries" ON payroll_entries FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('admin')));
CREATE POLICY "admins_manage_payroll_lines" ON payroll_entry_lines FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('admin')));

-- Applicators: read their own payroll (portal access)
CREATE POLICY "applicators_read_own_entries" ON payroll_entries FOR SELECT
  USING (applicator_id IN (SELECT id FROM applicators WHERE auth_user_id = auth.uid()));
CREATE POLICY "applicators_read_own_lines" ON payroll_entry_lines FOR SELECT
  USING (entry_id IN (
    SELECT id FROM payroll_entries WHERE applicator_id IN (
      SELECT id FROM applicators WHERE auth_user_id = auth.uid()
    )
  ));
CREATE POLICY "applicators_read_own_periods" ON payroll_periods FOR SELECT
  USING (id IN (
    SELECT period_id FROM payroll_entries WHERE applicator_id IN (
      SELECT id FROM applicators WHERE auth_user_id = auth.uid()
    )
  ));

NOTIFY pgrst, 'reload schema';
