-- Add missing UNIQUE constraint on (org_id, folio_cenni) required for bulk upsert.
-- Safe to run even if the constraint already exists.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'cenni_cases_org_id_folio_cenni_key'
          AND conrelid = 'cenni_cases'::regclass
    ) THEN
        ALTER TABLE cenni_cases
            ADD CONSTRAINT cenni_cases_org_id_folio_cenni_key UNIQUE (org_id, folio_cenni);
    END IF;
END $$;
