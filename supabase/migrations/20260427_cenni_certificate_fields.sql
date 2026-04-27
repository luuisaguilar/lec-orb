-- =============================================================
-- Migration: 20260427_cenni_certificate_fields.sql
-- Goal:
--   Add certificate tracking columns to cenni_cases so that
--   the /api/v1/cenni/[id]/certificate-url route and the
--   Certificados view in the dashboard work correctly.
-- =============================================================

ALTER TABLE cenni_cases
  ADD COLUMN IF NOT EXISTS certificate_storage_path  TEXT,
  ADD COLUMN IF NOT EXISTS certificate_uploaded_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS certificate_sent_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS certificate_sent_to       TEXT;

-- Partial index — only rows that actually have a certificate
CREATE INDEX IF NOT EXISTS idx_cenni_certificate
  ON cenni_cases (org_id, certificate_uploaded_at)
  WHERE certificate_storage_path IS NOT NULL;
