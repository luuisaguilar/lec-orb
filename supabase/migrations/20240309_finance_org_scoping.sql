-- Migration: 20240309_finance_org_scoping.sql
-- Description: Adds org_id to quotes and purchase_orders tables and tightens
--              RLS policies from "all authenticated users" to "org members only".
--
-- This is a SAFE additive migration:
-- 1. The new org_id column is NULLABLE so existing rows are not affected.
-- 2. Existing rows get org_id populated from created_by user's org_member row.
-- 3. New RLS policies ADD restrictions without removing previous access for migrated rows.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add org_id column to quotes
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.quotes
    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Back-fill org_id for existing quotes based on created_by user
UPDATE public.quotes q
SET org_id = om.org_id
FROM public.org_members om
WHERE om.user_id = q.created_by
  AND q.org_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_org ON public.quotes(org_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Add org_id column to purchase_orders
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.purchase_orders
    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Back-fill org_id for existing purchase_orders based on created_by user
UPDATE public.purchase_orders po
SET org_id = om.org_id
FROM public.org_members om
WHERE om.user_id = po.created_by
  AND po.org_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_org ON public.purchase_orders(org_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Tighten RLS policies on quotes
-- ─────────────────────────────────────────────────────────────────────────────
-- Drop the permissive catch-all policies
DROP POLICY IF EXISTS "Allow authenticated full access to quotes" ON public.quotes;

-- Recreate with org-scoped policies
CREATE POLICY "quotes_select_org_members"
    ON public.quotes FOR SELECT
    TO authenticated
    USING (
        org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
        OR org_id IS NULL  -- Fallback: allow rows that haven't been migrated yet
    );

CREATE POLICY "quotes_insert_org_members"
    ON public.quotes FOR INSERT
    TO authenticated
    WITH CHECK (
        org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
    );

CREATE POLICY "quotes_update_org_members"
    ON public.quotes FOR UPDATE
    TO authenticated
    USING (
        org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
    );

CREATE POLICY "quotes_delete_org_members"
    ON public.quotes FOR DELETE
    TO authenticated
    USING (
        org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Tighten RLS policies on purchase_orders
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow authenticated full access to purchase_orders" ON public.purchase_orders;

CREATE POLICY "purchase_orders_select_org_members"
    ON public.purchase_orders FOR SELECT
    TO authenticated
    USING (
        org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
        OR org_id IS NULL  -- Fallback: allow rows that haven't been migrated yet
    );

CREATE POLICY "purchase_orders_insert_org_members"
    ON public.purchase_orders FOR INSERT
    TO authenticated
    WITH CHECK (
        org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
    );

CREATE POLICY "purchase_orders_update_org_members"
    ON public.purchase_orders FOR UPDATE
    TO authenticated
    USING (
        org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
    );

CREATE POLICY "purchase_orders_delete_org_members"
    ON public.purchase_orders FOR DELETE
    TO authenticated
    USING (
        org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
    );
