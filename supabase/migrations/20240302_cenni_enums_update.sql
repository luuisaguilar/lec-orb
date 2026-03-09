-- ================================================================
-- Phase 13.1: Update CENNI Enum Types
-- Updates the allowed statuses for CENNI cases and certificates
-- ================================================================

-- PostgreSQL doesn't easily let us DROP/RECREATE enums that are in use or remove values,
-- so the safest way is to rename the old types, create new ones, and update the table.

-- 1. Rename old types
ALTER TYPE cenni_status RENAME TO cenni_status_old;
ALTER TYPE cenni_cert_status RENAME TO cenni_cert_status_old;

-- 2. Create new types with the exact values requested
CREATE TYPE cenni_status AS ENUM (
  'EN OFICINA', 
  'EN TRAMITE', 
  'REVISION', 
  'APROBADO', 
  'RECHAZADO'
);

CREATE TYPE cenni_cert_status AS ENUM (
  'APROBADO', 
  'RECHAZADO', 
  'EN PROCESO DE DICTAMINACION'
);

-- 3. Update the table to use the new types
-- We need to cast the old values to TEXT and then to the new ENUM type.
-- Since the old default was 'PENDIENTE' which is no longer in the new enum, 
-- we map 'PENDIENTE' to 'EN OFICINA'.

ALTER TABLE cenni_cases 
  ALTER COLUMN estatus DROP DEFAULT,
  ALTER COLUMN estatus TYPE cenni_status USING 
    CASE 
      WHEN estatus::text = 'PENDIENTE' THEN 'EN OFICINA'::cenni_status
      WHEN estatus::text = 'REVISION' THEN 'REVISION'::cenni_status
      WHEN estatus::text = 'APROBADO' THEN 'APROBADO'::cenni_status
      WHEN estatus::text = 'RECHAZADO' THEN 'RECHAZADO'::cenni_status
      ELSE 'EN OFICINA'::cenni_status 
    END,
  ALTER COLUMN estatus SET DEFAULT 'EN OFICINA'::cenni_status;

ALTER TABLE cenni_cases 
  ALTER COLUMN estatus_certificado TYPE cenni_cert_status USING 
    CASE 
      WHEN estatus_certificado::text = 'PENDIENTE' THEN 'EN PROCESO DE DICTAMINACION'::cenni_cert_status
      ELSE NULL 
    END;

-- 4. Clean up the old types
DROP TYPE cenni_status_old;
DROP TYPE cenni_cert_status_old;
