-- Migration: 20260511_sgc_audit_cars.sql
-- Description: Adds corrective actions register (CAR) for SGC audit findings.

CREATE TABLE IF NOT EXISTS public.sgc_audit_cars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    audit_check_id UUID NOT NULL REFERENCES public.sgc_audit_checks(id) ON DELETE CASCADE,
    car_code VARCHAR(30) NOT NULL,
    finding_clause_id VARCHAR(20) NOT NULL,
    finding_title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'in_progress', 'closed')),
    root_cause TEXT,
    action_plan TEXT,
    owner_name VARCHAR(200),
    due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, audit_check_id),
    UNIQUE (org_id, car_code)
);

CREATE INDEX IF NOT EXISTS idx_sgc_audit_cars_org_status
    ON public.sgc_audit_cars(org_id, status, created_at DESC);

ALTER TABLE public.sgc_audit_cars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sgc_audit_cars_select" ON public.sgc_audit_cars;
CREATE POLICY "sgc_audit_cars_select"
ON public.sgc_audit_cars FOR SELECT TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "sgc_audit_cars_insert" ON public.sgc_audit_cars;
CREATE POLICY "sgc_audit_cars_insert"
ON public.sgc_audit_cars FOR INSERT TO authenticated
WITH CHECK (
    org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
    )
);

DROP POLICY IF EXISTS "sgc_audit_cars_update" ON public.sgc_audit_cars;
CREATE POLICY "sgc_audit_cars_update"
ON public.sgc_audit_cars FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS "sgc_audit_cars_delete" ON public.sgc_audit_cars;
CREATE POLICY "sgc_audit_cars_delete"
ON public.sgc_audit_cars FOR DELETE TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
    )
);

DROP TRIGGER IF EXISTS handle_updated_at_sgc_audit_cars ON public.sgc_audit_cars;
CREATE TRIGGER handle_updated_at_sgc_audit_cars
    BEFORE UPDATE ON public.sgc_audit_cars
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS sgc_audit_cars_audit ON public.sgc_audit_cars;
CREATE TRIGGER sgc_audit_cars_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.sgc_audit_cars
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
