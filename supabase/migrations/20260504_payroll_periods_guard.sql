-- Migration: 20260504_payroll_periods_guard.sql
-- Description: Ensures payroll_periods exists in environments where legacy payroll migration was not applied.

CREATE TABLE IF NOT EXISTS public.payroll_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    total_amount NUMERIC(12,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_periods_org
    ON public.payroll_periods(org_id);

ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'payroll_periods'
          AND policyname = 'payroll_periods_select'
    ) THEN
        CREATE POLICY "payroll_periods_select"
        ON public.payroll_periods FOR SELECT TO authenticated
        USING (
            org_id IN (
                SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'payroll_periods'
          AND policyname = 'payroll_periods_manage'
    ) THEN
        CREATE POLICY "payroll_periods_manage"
        ON public.payroll_periods FOR ALL TO authenticated
        USING (
            org_id IN (
                SELECT org_id
                FROM public.org_members
                WHERE user_id = auth.uid() AND role = 'admin'
            )
        )
        WITH CHECK (
            org_id IN (
                SELECT org_id
                FROM public.org_members
                WHERE user_id = auth.uid() AND role = 'admin'
            )
        );
    END IF;
END
$$;
