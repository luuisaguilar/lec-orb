-- ================================================================
-- Phase 13: CENNI Module Schema
-- Schema for managing CENNI requests and certificates
-- ================================================================

-- 1. Create native ENUMs for CENNI statues
DO $$ BEGIN
    CREATE TYPE cenni_status AS ENUM ('PENDIENTE', 'REVISION', 'APROBADO', 'RECHAZADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE cenni_cert_status AS ENUM ('PENDIENTE', 'EMITIDO', 'ENTREGADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create the cenni_cases table
CREATE TABLE IF NOT EXISTS cenni_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Required fields
  folio_cenni TEXT NOT NULL,
  cliente_estudiante TEXT NOT NULL,
  
  -- Contact info
  celular TEXT,
  correo TEXT,
  
  -- Document checklist
  solicitud_cenni BOOLEAN DEFAULT FALSE,
  acta_o_curp BOOLEAN DEFAULT FALSE,
  id_documento BOOLEAN DEFAULT FALSE,
  
  -- Extra data
  certificado TEXT,
  datos_curp TEXT,
  cliente TEXT,
  
  -- Statuses
  estatus cenni_status DEFAULT 'PENDIENTE',
  estatus_certificado cenni_cert_status,
  notes TEXT,
  
  -- Audit and timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Index for fast lookup by folio
CREATE INDEX IF NOT EXISTS idx_cenni_cases_folio ON cenni_cases(folio_cenni);
CREATE INDEX IF NOT EXISTS idx_cenni_cases_org ON cenni_cases(org_id);

-- 3. Row Level Security
ALTER TABLE cenni_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view their cenni cases" ON cenni_cases;
CREATE POLICY "Org members can view their cenni cases" ON cenni_cases
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Org members can insert cenni cases" ON cenni_cases;
CREATE POLICY "Org members can insert cenni cases" ON cenni_cases
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Org members can update their cenni cases" ON cenni_cases;
CREATE POLICY "Org members can update their cenni cases" ON cenni_cases
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

-- Only admins and supervisors can soft-delete
DROP POLICY IF EXISTS "Admins can delete cenni cases" ON cenni_cases;
CREATE POLICY "Admins can delete cenni cases" ON cenni_cases
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM org_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

-- Trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_cenni_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_cenni_updated_at ON cenni_cases;
CREATE TRIGGER set_cenni_updated_at
BEFORE UPDATE ON cenni_cases
FOR EACH ROW
EXECUTE FUNCTION update_cenni_updated_at();
