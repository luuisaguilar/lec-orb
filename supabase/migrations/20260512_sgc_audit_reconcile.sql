-- Migration: 20260512_sgc_audit_reconcile.sql
-- Description: Reconciles the sgc_audit_checks table to support the existing code while enabling instance-based audits.

-- 1) Ensure sgc_audit_checks has all necessary columns for the current implementation
ALTER TABLE public.sgc_audit_checks 
    ADD COLUMN IF NOT EXISTS clause_id VARCHAR(20),
    ADD COLUMN IF NOT EXISTS title VARCHAR(200),
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'cumple', 'noconf', 'oport')),
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS next_audit_date DATE;

-- 2) Make audit_id nullable temporarily to avoid breaking existing logic until UI is fully migrated
ALTER TABLE public.sgc_audit_checks ALTER COLUMN audit_id DROP NOT NULL;

-- 3) Sync existing columns if possible (optional but good for consistency)
-- is_conformed -> status
-- procedure_reference -> clause_id
-- comments -> notes
-- seq -> sort_order

UPDATE public.sgc_audit_checks 
SET 
    status = CASE WHEN is_conformed THEN 'cumple' ELSE 'pending' END,
    clause_id = COALESCE(clause_id, procedure_reference),
    notes = COALESCE(notes, comments),
    sort_order = COALESCE(sort_order, seq)
WHERE status IS NULL OR clause_id IS NULL;

-- 4) Add missing columns to sgc_audit_cars if needed (already mostly correct from 20260511)
-- Ensure unique constraint is on (org_id, audit_check_id) but also (org_id, car_code)
