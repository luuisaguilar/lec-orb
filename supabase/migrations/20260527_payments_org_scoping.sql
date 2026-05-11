-- Migration: 20260527_payments_org_scoping.sql
-- Description: Scope payments to org_id and tighten RLS policies.

ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.payments p
SET org_id = om.org_id
FROM public.org_members om
WHERE om.user_id = p.created_by
  AND p.org_id IS NULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.payments WHERE org_id IS NULL) THEN
        RAISE EXCEPTION 'payments.org_id backfill incomplete: there are rows with org_id IS NULL. Fix data before applying NOT NULL.';
    END IF;
END $$;

ALTER TABLE public.payments
    ALTER COLUMN org_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_org ON public.payments(org_id);

DROP POLICY IF EXISTS "Allow authenticated full access to payments" ON public.payments;

CREATE POLICY "payments_select_org_members"
    ON public.payments FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "payments_insert_org_members"
    ON public.payments FOR INSERT TO authenticated
    WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "payments_update_org_members"
    ON public.payments FOR UPDATE TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "payments_delete_org_members"
    ON public.payments FOR DELETE TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

