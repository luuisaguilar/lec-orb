-- Migration: 008_cenni_canonical_status.sql
-- Goal: Align cenni_status enum with the new canonical values: PENDIENTE, ENVIADO, SOLICITADO, BC.

-- 1. Rename old enum
ALTER TABLE cenni_cases ALTER COLUMN estatus DROP DEFAULT;
ALTER TYPE cenni_status RENAME TO cenni_status_old;

-- 2. Create the new canonical enum
CREATE TYPE cenni_status AS ENUM (
  'PENDIENTE',
  'ENVIADO',
  'SOLICITADO',
  'BC'
);

-- 3. Cast existing rows to new enum
-- Mapping:
-- EN OFICINA -> PENDIENTE
-- APROBADO -> ENVIADO
-- EN TRAMITE/REVISION -> SOLICITADO (or PENDIENTE depending on preference, we'll use SOLICITADO)
-- RECHAZADO -> BC
-- SOLICITADO -> SOLICITADO
ALTER TABLE cenni_cases
  ALTER COLUMN estatus TYPE cenni_status USING (
    CASE estatus::text
      WHEN 'EN OFICINA'          THEN 'PENDIENTE'::cenni_status
      WHEN 'APROBADO'            THEN 'ENVIADO'::cenni_status
      WHEN 'RECHAZADO'           THEN 'BC'::cenni_status
      WHEN 'EN TRAMITE/REVISION' THEN 'SOLICITADO'::cenni_status
      WHEN 'SOLICITADO'          THEN 'SOLICITADO'::cenni_status
      ELSE                            'PENDIENTE'::cenni_status
    END
  );

-- 4. Restore default
ALTER TABLE cenni_cases ALTER COLUMN estatus SET DEFAULT 'PENDIENTE'::cenni_status;

-- 5. Drop old enum
DROP TYPE cenni_status_old;
