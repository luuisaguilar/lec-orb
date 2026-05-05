-- Migration: 007_cenni_storage.sql
-- Goal: Add storage tracking columns to cenni_cases for certificate mapping.

ALTER TABLE cenni_cases
  ADD COLUMN IF NOT EXISTS certificate_storage_path  TEXT,
  ADD COLUMN IF NOT EXISTS certificate_uploaded_at   TIMESTAMPTZ;

-- Add index for performance if needed
CREATE INDEX IF NOT EXISTS idx_cenni_certificate_path 
  ON cenni_cases (certificate_storage_path) 
  WHERE certificate_storage_path IS NOT NULL;
