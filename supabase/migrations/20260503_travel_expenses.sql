-- Migration: 20260503_travel_expenses.sql
-- Description: Adds Viaticos (travel expenses) reports and receipts with tenant RLS and module registry entry.

CREATE TABLE IF NOT EXISTS public.travel_expense_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    payroll_period_id UUID REFERENCES public.payroll_periods(id) ON DELETE SET NULL,
    employee_name VARCHAR(200) NOT NULL,
    destination VARCHAR(200) NOT NULL,
    trip_purpose TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    amount_requested NUMERIC(12,2) NOT NULL CHECK (amount_requested > 0),
    amount_approved NUMERIC(12,2),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'reimbursed')),
    approval_notes TEXT,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    updated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_travel_expense_reports_org_status
    ON public.travel_expense_reports(org_id, status, start_date DESC);

CREATE INDEX IF NOT EXISTS idx_travel_expense_reports_org_payroll
    ON public.travel_expense_reports(org_id, payroll_period_id);

CREATE TABLE IF NOT EXISTS public.travel_expense_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    report_id UUID NOT NULL REFERENCES public.travel_expense_reports(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(20) NOT NULL DEFAULT 'other'
        CHECK (file_type IN ('pdf', 'xlsx', 'xls', 'csv', 'other')),
    file_url TEXT NOT NULL,
    amount NUMERIC(12,2),
    notes TEXT,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_travel_expense_receipts_org_report
    ON public.travel_expense_receipts(org_id, report_id, created_at DESC);

ALTER TABLE public.travel_expense_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_expense_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "travel_expense_reports_select"
ON public.travel_expense_reports FOR SELECT TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "travel_expense_reports_insert"
ON public.travel_expense_reports FOR INSERT TO authenticated
WITH CHECK (
    org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor', 'operador')
    )
);

CREATE POLICY "travel_expense_reports_update"
ON public.travel_expense_reports FOR UPDATE TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor', 'operador')
    )
);

CREATE POLICY "travel_expense_receipts_select"
ON public.travel_expense_receipts FOR SELECT TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "travel_expense_receipts_insert"
ON public.travel_expense_receipts FOR INSERT TO authenticated
WITH CHECK (
    org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor', 'operador')
    )
);

CREATE POLICY "travel_expense_receipts_update"
ON public.travel_expense_receipts FOR UPDATE TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor', 'operador')
    )
);

INSERT INTO public.module_registry (slug, name, icon, category, is_native, sort_order, description)
VALUES ('travel-expenses', 'Viaticos', 'Map', 'Finanzas', true, 54, 'Solicitudes, aprobaciones y comprobantes de viaticos vinculados a nomina')
ON CONFLICT (org_id, slug) DO NOTHING;

