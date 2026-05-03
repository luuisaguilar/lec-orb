-- Migration: 20260506_event_logistics_v3.sql
-- Description: Phase 3 - Event Staffing, Roles, and Dynamic Payroll Foundations

-- 1. Create event_staff table to manage roles per event
-- We use DROP to ensure a clean state if a previous failed run left an incomplete table
DROP TABLE IF EXISTS public.event_staff CASCADE;

CREATE TABLE public.event_staff (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    applicator_id uuid NOT NULL REFERENCES public.applicators(id) ON DELETE CASCADE,
    role text NOT NULL, -- SE (Speaking Examiner), ADMIN (Administrator), INVIGILATOR, SUPER (Supervisor)
    hourly_rate numeric(10, 2), -- If null, use applicator's default rate
    fixed_payment numeric(10, 2), -- For special cases or fixed roles
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(event_id, applicator_id)
);

-- Indexing for performance
CREATE INDEX idx_event_staff_event ON public.event_staff(event_id);
CREATE INDEX idx_event_staff_applicator ON public.event_staff(applicator_id);
CREATE INDEX idx_event_staff_org ON public.event_staff(org_id);

-- RLS for event_staff
ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;

-- Select policy
CREATE POLICY "Members can read event_staff" ON public.event_staff
FOR SELECT TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
    )
);

-- Manage policy (Insert/Update/Delete)
CREATE POLICY "Supervisors can manage event_staff" ON public.event_staff
FOR ALL TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
    )
);

-- 3. Add trigger for updated_at
-- Note: fn_update_timestamp should already exist from core schema
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_update_timestamp') THEN
        CREATE TRIGGER tr_event_staff_updated_at
            BEFORE UPDATE ON public.event_staff
            FOR EACH ROW EXECUTE PROCEDURE public.fn_update_timestamp();
    END IF;
END $$;
