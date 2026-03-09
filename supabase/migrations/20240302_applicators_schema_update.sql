-- ================================================================
-- Phase 14: Applicators Revamp Schema Update
-- Adds new demographic and authorization fields to Applicators
-- ================================================================

-- 1. Add new columns to the applicators table
ALTER TABLE applicators
    ADD COLUMN IF NOT EXISTS external_id TEXT, -- ID generado por tercero
    ADD COLUMN IF NOT EXISTS birth_date DATE,  -- FDN (FECHA DE NACIMIENTO)
    ADD COLUMN IF NOT EXISTS city TEXT,        -- CIUDAD DE ORIGEN
    -- We can use a JSONB or TEXT[] array for authorized exams
    ADD COLUMN IF NOT EXISTS authorized_exams TEXT[] DEFAULT '{}';

-- 2. Create an index on the new external_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_applicators_external_id ON applicators(external_id);
