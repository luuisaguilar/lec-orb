-- Migration: 20240308_toefl_codes_expansion.sql
-- Description: Expands the toefl_codes table to support advanced inventory logic.
-- Adds purchase_order_id, session_id, candidate_details JSONB, and removes NOT NULL from voucher_code.

-- 1. Modify existing table
ALTER TABLE public.toefl_codes
-- Remove the NOT NULL constraint from voucher_code since spaces are created empty
ALTER COLUMN voucher_code DROP NOT NULL,
-- Extend the test_type to accommodate the 7 new specific ETS formats
ALTER COLUMN test_type TYPE VARCHAR(100),
-- Add links to Finance and Events
ADD COLUMN IF NOT EXISTS purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.toefl_administrations(id) ON DELETE SET NULL,
-- Add a flexible JSONB column to store imported Excel metadata without cluttering the schema
ADD COLUMN IF NOT EXISTS candidate_details JSONB DEFAULT '{}'::jsonb;

-- 2. Update existing test types (optional cleanup if any existing rows clash)
-- For any existing rows, if you had 'ITP', 'Junior', 'Primary', they will remain as strings thanks to VARCHAR(100).

-- 3. Add necessary indexes for the new foreign keys to keep queries fast
CREATE INDEX IF NOT EXISTS idx_toefl_codes_po_id ON public.toefl_codes(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_toefl_codes_session_id ON public.toefl_codes(session_id);

-- Note: folios (#) are already unique. To map to UNIQ-ID from Excel, we can either store it inside
-- `candidate_details->>'uniq_id'` or if the system generates it, we use the `id` UUID itself.
-- Based on user feedback: The system generates both the internal sequence (# as Folio) and the UNIQ-ID natively.
-- Let's add an explicit system_uniq_id column to map directly to their nomenclature.

ALTER TABLE public.toefl_codes
ADD COLUMN IF NOT EXISTS system_uniq_id VARCHAR(50) UNIQUE;

-- Create an index for the new unique id to facilitate fast lookups during Excel imports
CREATE INDEX IF NOT EXISTS idx_toefl_codes_sys_uniq_id ON public.toefl_codes(system_uniq_id);
