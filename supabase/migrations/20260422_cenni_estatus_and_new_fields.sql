-- =============================================================
-- Migration: 20260422_cenni_estatus_and_new_fields.sql
-- Goal:
--   1. Consolidate cenni_status enum to 5 canonical values
--   2. Add fecha_recepcion, fecha_revision, motivo_rechazo
-- =============================================================

-- ── Step 1: Rebuild the enum ──────────────────────────────────
-- PostgreSQL doesn't allow DROP VALUE, so we rename→recreate→cast.

-- Drop default that references the old enum
ALTER TABLE cenni_cases ALTER COLUMN estatus DROP DEFAULT;

-- Rename old enum
ALTER TYPE cenni_status RENAME TO cenni_status_old;

-- Create the new canonical enum
CREATE TYPE cenni_status AS ENUM (
  'EN OFICINA',
  'SOLICITADO',
  'EN TRAMITE/REVISION',
  'APROBADO',
  'RECHAZADO'
);

-- Cast existing rows
ALTER TABLE cenni_cases
  ALTER COLUMN estatus TYPE cenni_status USING (
    CASE estatus::text
      WHEN 'EN OFICINA'          THEN 'EN OFICINA'::cenni_status
      WHEN 'SOLICITADO'          THEN 'SOLICITADO'::cenni_status
      WHEN 'EN TRAMITE'          THEN 'EN TRAMITE/REVISION'::cenni_status
      WHEN 'REVISION'            THEN 'EN TRAMITE/REVISION'::cenni_status
      WHEN 'EN OFICINA/POR ENVIAR' THEN 'EN OFICINA'::cenni_status
      WHEN 'APROBADO'            THEN 'APROBADO'::cenni_status
      WHEN 'RECHAZADO'           THEN 'RECHAZADO'::cenni_status
      ELSE                            'EN OFICINA'::cenni_status
    END
  );

-- Restore default
ALTER TABLE cenni_cases ALTER COLUMN estatus SET DEFAULT 'EN OFICINA'::cenni_status;

-- Drop old enum
DROP TYPE cenni_status_old;

-- ── Step 2: Add new fields ────────────────────────────────────
ALTER TABLE cenni_cases
  ADD COLUMN IF NOT EXISTS fecha_recepcion date,
  ADD COLUMN IF NOT EXISTS fecha_revision  date,
  ADD COLUMN IF NOT EXISTS motivo_rechazo  text;

-- Index for quick filtering by recepcion date
CREATE INDEX IF NOT EXISTS idx_cenni_fecha_recepcion ON cenni_cases (org_id, fecha_recepcion);
