-- LEC Platform — CENNI Migration (revised)
-- Matches real spreadsheet: folio, client, docs checkboxes, certificado, CURP, cliente type

DROP TABLE IF EXISTS cenni_cases;

CREATE TABLE cenni_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  folio_cenni text NOT NULL,
  cliente_estudiante text NOT NULL,
  celular text,
  correo text,
  -- Document checklist (booleans)
  solicitud_cenni boolean NOT NULL DEFAULT false,
  acta_o_curp boolean NOT NULL DEFAULT false,
  id_documento boolean NOT NULL DEFAULT false,
  -- Certificate & CURP
  certificado text,            -- e.g. "LINGUASKILL", "OXFORD OOPT", "COPIA OOPT+L"
  datos_curp text,             -- e.g. "LOFA851009MSRPLN07"
  cliente text,                -- e.g. "ENSO", "LEC", "BC", "EXTERNO", "SINALOA"
  estatus text NOT NULL DEFAULT 'PENDIENTE',  -- ENVIADO, SOLICITADO, PENDIENTE, BC
  estatus_certificado text,    -- date or status text
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, folio_cenni)
);

CREATE INDEX idx_cenni_org ON cenni_cases(org_id);
CREATE INDEX idx_cenni_estatus ON cenni_cases(org_id, estatus);
CREATE INDEX idx_cenni_cliente ON cenni_cases(org_id, cliente);

ALTER TABLE cenni_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read cenni_cases" ON cenni_cases FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()) AND deleted_at IS NULL);

CREATE POLICY "Admins can manage cenni_cases" ON cenni_cases FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')));
