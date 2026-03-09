-- Migration: Update TOEFL Administrations table
-- Description: Updates the table to manage TOEFL sessions/administrations with new fields

-- The table `toefl_administrations` already exists from Phase 26 with these fields:
-- id, school_id, test_date, test_type, expected_students, status, notes, created_by, ...

-- We need to add `name` and `end_date` as requested by the user, and rename `test_date`
-- to `start_date` if we want to match the exact request, OR just add the new ones.
-- To keep it non-breaking for existing data, let's just ADD the new columns.

ALTER TABLE public.toefl_administrations 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Update existing rows to have a fallback name if null
UPDATE public.toefl_administrations 
SET name = 'Administración ' || test_date::text
WHERE name IS NULL;

-- Now that data is seeded, make name NOT NULL
ALTER TABLE public.toefl_administrations 
ALTER COLUMN name SET NOT NULL;

-- Default end_date to test_date for existing rows
UPDATE public.toefl_administrations 
SET end_date = test_date
WHERE end_date IS NULL;

-- Note we are keeping `test_date` as the "start_date" for backward compatibility
-- with any existing frontend code that rely on it, but we can treat it as `start_date`
-- in the UI.
