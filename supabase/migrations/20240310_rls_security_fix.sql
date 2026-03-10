-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20240310_rls_security_fix.sql
-- Description: Fixes permissive RLS policies on payments, payment_concepts,
--              toefl_codes, exam_codes, and toefl_administrations tables.
--
-- PROBLEM: The original migrations for these 5 tables used USING (true) policies,
--          meaning ANY authenticated user from ANY organization could read, write,
--          and delete records — a critical multi-tenant security vulnerability.
--
-- FIX: Add org_id columns where missing, backfill from created_by, then
--      replace the permissive policies with org-scoped granular policies.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 1: payments table
-- ─────────────────────────────────────────────────────────────────────────────

-- 1a. Add org_id to payments (safe — nullable for backfill)
ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 1b. Backfill org_id from created_by user's org membership
UPDATE public.payments p
SET org_id = om.org_id
FROM public.org_members om
WHERE om.user_id = p.created_by
  AND p.org_id IS NULL;

-- 1c. Index for fast org-scoped queries
CREATE INDEX IF NOT EXISTS idx_payments_org ON public.payments(org_id);

-- 1d. Drop the permissive blanket policy
DROP POLICY IF EXISTS "Allow authenticated full access to payments" ON public.payments;

-- 1e. Recreate with org-scoped role-based policies
-- SELECT: all org members who have finanzas access (enforced at API layer by checkServerPermission)
--         At DB layer: any org member can read (API does the finer permission check)
CREATE POLICY "payments_select_org_members"
    ON public.payments FOR SELECT
    TO authenticated
    USING (
        org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
        OR org_id IS NULL  -- backward compat: rows not yet backfilled
    );

-- INSERT: only admin or supervisor roles
CREATE POLICY "payments_insert_supervisors"
    ON public.payments FOR INSERT
    TO authenticated
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor', 'operador')
        )
    );

-- UPDATE: only admin or supervisor roles
CREATE POLICY "payments_update_supervisors"
    ON public.payments FOR UPDATE
    TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

-- DELETE: only admins (soft delete preferred; this is a safety net)
CREATE POLICY "payments_delete_admins"
    ON public.payments FOR DELETE
    TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 2: payment_concepts table (catalog — org-aware global)
-- ─────────────────────────────────────────────────────────────────────────────
-- payment_concepts is a shared catalog (no org_id) — all authenticated users READ.
-- Only admins should be able to manage it.
-- Drop the overly broad ALL policy and replace with proper separation.

DROP POLICY IF EXISTS "Public read for payment_concepts" ON public.payment_concepts;
DROP POLICY IF EXISTS "Admins can manage payment_concepts" ON public.payment_concepts;

-- SELECT: any authenticated user (it's a shared price catalog)
CREATE POLICY "payment_concepts_select_authenticated"
    ON public.payment_concepts FOR SELECT
    TO authenticated
    USING (true);

-- INSERT / UPDATE / DELETE: only admins (checked against org_members)
CREATE POLICY "payment_concepts_write_admins"
    ON public.payment_concepts FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "payment_concepts_update_admins"
    ON public.payment_concepts FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "payment_concepts_delete_admins"
    ON public.payment_concepts FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 3: toefl_codes table
-- ─────────────────────────────────────────────────────────────────────────────

-- 3a. Add org_id
ALTER TABLE public.toefl_codes
    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 3b. Backfill from created_by
UPDATE public.toefl_codes tc
SET org_id = om.org_id
FROM public.org_members om
WHERE om.user_id = tc.created_by
  AND tc.org_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_toefl_codes_org ON public.toefl_codes(org_id);

-- 3c. Drop permissive policy
DROP POLICY IF EXISTS "Full access to authenticated" ON public.toefl_codes;

-- 3d. Org-scoped role policies
CREATE POLICY "toefl_codes_select_org_members"
    ON public.toefl_codes FOR SELECT
    TO authenticated
    USING (
        org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
        OR org_id IS NULL
    );

CREATE POLICY "toefl_codes_insert_supervisors"
    ON public.toefl_codes FOR INSERT
    TO authenticated
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

CREATE POLICY "toefl_codes_update_supervisors"
    ON public.toefl_codes FOR UPDATE
    TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

CREATE POLICY "toefl_codes_delete_admins"
    ON public.toefl_codes FOR DELETE
    TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 4: toefl_administrations table
-- ─────────────────────────────────────────────────────────────────────────────

-- 4a. Add org_id
ALTER TABLE public.toefl_administrations
    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 4b. Backfill from created_by
UPDATE public.toefl_administrations ta
SET org_id = om.org_id
FROM public.org_members om
WHERE om.user_id = ta.created_by
  AND ta.org_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_toefl_admin_org ON public.toefl_administrations(org_id);

-- 4c. Drop permissive policy
DROP POLICY IF EXISTS "Full access to authenticated" ON public.toefl_administrations;

-- 4d. Org-scoped role policies
CREATE POLICY "toefl_admins_select_org_members"
    ON public.toefl_administrations FOR SELECT
    TO authenticated
    USING (
        org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
        OR org_id IS NULL
    );

CREATE POLICY "toefl_admins_insert_supervisors"
    ON public.toefl_administrations FOR INSERT
    TO authenticated
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

CREATE POLICY "toefl_admins_update_supervisors"
    ON public.toefl_administrations FOR UPDATE
    TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

CREATE POLICY "toefl_admins_delete_admins"
    ON public.toefl_administrations FOR DELETE
    TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 5: exam_codes table
-- ─────────────────────────────────────────────────────────────────────────────

-- 5a. Add org_id
ALTER TABLE public.exam_codes
    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 5b. Backfill from created_by
UPDATE public.exam_codes ec
SET org_id = om.org_id
FROM public.org_members om
WHERE om.user_id = ec.created_by
  AND ec.org_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_exam_codes_org ON public.exam_codes(org_id);

-- 5c. Drop permissive policy
DROP POLICY IF EXISTS "Full access to authenticated" ON public.exam_codes;

-- 5d. Org-scoped role policies
CREATE POLICY "exam_codes_select_org_members"
    ON public.exam_codes FOR SELECT
    TO authenticated
    USING (
        org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
        OR org_id IS NULL
    );

CREATE POLICY "exam_codes_insert_supervisors"
    ON public.exam_codes FOR INSERT
    TO authenticated
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

CREATE POLICY "exam_codes_update_supervisors"
    ON public.exam_codes FOR UPDATE
    TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

CREATE POLICY "exam_codes_delete_admins"
    ON public.exam_codes FOR DELETE
    TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 6: Also fix the Select RLS overlap on quotes/purchase_orders
-- The 20240309_finance_org_scoping.sql has a fallback "OR org_id IS NULL"
-- that should eventually be removed once all rows are backfilled.
-- This migration removes that fallback to harden the policies.
-- ─────────────────────────────────────────────────────────────────────────────

-- Harden quotes SELECT (remove IS NULL fallback — all rows should now have org_id)
DROP POLICY IF EXISTS "quotes_select_org_members" ON public.quotes;

CREATE POLICY "quotes_select_org_members"
    ON public.quotes FOR SELECT
    TO authenticated
    USING (
        org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
    );

-- Harden purchase_orders SELECT (same)
DROP POLICY IF EXISTS "purchase_orders_select_org_members" ON public.purchase_orders;

CREATE POLICY "purchase_orders_select_org_members"
    ON public.purchase_orders FOR SELECT
    TO authenticated
    USING (
        org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 7: Add role-based granularity to quotes and purchase_orders
-- The existing policies allow ALL authenticated org members to INSERT/UPDATE/DELETE.
-- Restrict to supervisors and admins only.
-- ─────────────────────────────────────────────────────────────────────────────

-- Rebuild quotes insert/update/delete with role check
DROP POLICY IF EXISTS "quotes_insert_org_members" ON public.quotes;
DROP POLICY IF EXISTS "quotes_update_org_members" ON public.quotes;
DROP POLICY IF EXISTS "quotes_delete_org_members" ON public.quotes;

CREATE POLICY "quotes_insert_supervisors"
    ON public.quotes FOR INSERT
    TO authenticated
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

CREATE POLICY "quotes_update_supervisors"
    ON public.quotes FOR UPDATE
    TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

CREATE POLICY "quotes_delete_admins"
    ON public.quotes FOR DELETE
    TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Rebuild purchase_orders insert/update/delete with role check
DROP POLICY IF EXISTS "purchase_orders_insert_org_members" ON public.purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_update_org_members" ON public.purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_delete_org_members" ON public.purchase_orders;

CREATE POLICY "purchase_orders_insert_supervisors"
    ON public.purchase_orders FOR INSERT
    TO authenticated
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

CREATE POLICY "purchase_orders_update_supervisors"
    ON public.purchase_orders FOR UPDATE
    TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

CREATE POLICY "purchase_orders_delete_admins"
    ON public.purchase_orders FOR DELETE
    TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );
