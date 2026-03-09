-- Migration: 20240308_payments_expansion.sql
-- Description: Expands the payments table to capture detailed user and financial data, 
-- supporting both predefined catalog items (Exams) and arbitrary charges (Other).

-- Expand payments table
ALTER TABLE public.payments
ADD COLUMN first_name VARCHAR(100),
ADD COLUMN last_name VARCHAR(100),
ADD COLUMN institution VARCHAR(200),
ADD COLUMN quantity INTEGER DEFAULT 1,
ADD COLUMN discount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN currency VARCHAR(10) DEFAULT 'MXN',
ADD COLUMN payment_method VARCHAR(50),
ADD COLUMN custom_concept VARCHAR(200);

-- Make concept_id nullable to support 'Other' payments where no concept_id exists
ALTER TABLE public.payments ALTER COLUMN concept_id DROP NOT NULL;

-- Backfill data for old records if desired (optional)
UPDATE public.payments 
SET 
  first_name = SPLIT_PART(person_name, ' ', 1),
  last_name = SUBSTRING(person_name FROM LENGTH(SPLIT_PART(person_name, ' ', 1)) + 2),
  payment_method = 'N/A'
WHERE first_name IS NULL;

-- Make critical columns NOT NULL for future entries, ignoring the old ones because we don't want to break existing data if they are missing.
-- Since we already have data, we won't strictly enforce NOT NULL at the DB level for old rows to avoid deployment crashes, 
-- but our backend API will enforce it strictly for all new inserts.
