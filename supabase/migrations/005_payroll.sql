-- LEC Platform — Payroll Migration
-- Tables: payroll_periods, payroll_entries

-- ============================================================
-- 1. PAYROLL PERIODS
-- ============================================================

CREATE TABLE payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'open', -- open, calculated, paid, closed
  total_amount numeric(12, 2) DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payroll_periods_org ON payroll_periods(org_id);

-- ============================================================
-- 2. PAYROLL ENTRIES (one per applicator per period)
-- ============================================================

CREATE TABLE payroll_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  applicator_id uuid NOT NULL REFERENCES applicators(id) ON DELETE CASCADE,
  applicator_name text NOT NULL,
  hours_worked numeric(6, 2) NOT NULL DEFAULT 0,
  rate_per_hour numeric(10, 2) NOT NULL,
  events_count integer NOT NULL DEFAULT 0,
  slots_count integer NOT NULL DEFAULT 0,
  subtotal numeric(12, 2) GENERATED ALWAYS AS (hours_worked * rate_per_hour) STORED,
  adjustments numeric(12, 2) NOT NULL DEFAULT 0,
  total numeric(12, 2) GENERATED ALWAYS AS ((hours_worked * rate_per_hour) + adjustments) STORED,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, paid
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(period_id, applicator_id)
);

CREATE INDEX idx_payroll_entries_period ON payroll_entries(period_id);
CREATE INDEX idx_payroll_entries_applicator ON payroll_entries(applicator_id);
CREATE INDEX idx_payroll_entries_org ON payroll_entries(org_id);

-- ============================================================
-- 3. RLS
-- ============================================================

ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read payroll_periods" ON payroll_periods FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage payroll_periods" ON payroll_periods FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('admin')));

CREATE POLICY "Members can read own payroll_entries" ON payroll_entries FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage payroll_entries" ON payroll_entries FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('admin')));
