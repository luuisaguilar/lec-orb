-- ================================================================
-- Phase 12: Movements table + RPC function for scan operations
-- Run this in Supabase SQL Editor
-- ================================================================

-- ---------------------------------------------------------------
-- 1. Movements table (tracks every SALIDA/ENTRADA/AJUSTE)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('SALIDA', 'ENTRADA', 'AJUSTE')),
  previous_status TEXT,
  new_status TEXT NOT NULL,
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  school_name TEXT,
  applicator_id UUID REFERENCES applicators(id) ON DELETE SET NULL,
  applicator_name TEXT,
  notes TEXT,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can manage movements" ON movements;
CREATE POLICY "Org members can manage movements" ON movements
FOR ALL USING (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
);

-- ---------------------------------------------------------------
-- 2. Add hora_salida and hora_entrada to packs
--    (tracks the time of last checkout/checkin for display)
-- ---------------------------------------------------------------
ALTER TABLE packs 
  ADD COLUMN IF NOT EXISTS hora_salida TEXT,
  ADD COLUMN IF NOT EXISTS hora_entrada TEXT,
  ADD COLUMN IF NOT EXISTS fecha DATE;

-- ---------------------------------------------------------------
-- 3. RPC function used by the scan API
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_movement_and_update_pack(
  p_org_id UUID,
  p_pack_id UUID,
  p_type TEXT,
  p_school_id UUID DEFAULT NULL,
  p_school_name TEXT DEFAULT NULL,
  p_applicator_id UUID DEFAULT NULL,
  p_applicator_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pack RECORD;
  v_new_status TEXT;
  v_movement_id UUID;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
  v_time TEXT := TO_CHAR(v_now AT TIME ZONE 'America/Mexico_City', 'DD/MM/YYYY HH24:MI');
BEGIN
  -- Get current pack state
  SELECT id, status INTO v_pack
  FROM packs
  WHERE id = p_pack_id AND org_id = p_org_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pack not found';
  END IF;

  -- Validate transitions
  IF p_type = 'SALIDA' AND v_pack.status != 'EN_SITIO' THEN
    RAISE EXCEPTION 'Pack is not EN_SITIO (current: %)', v_pack.status;
  END IF;

  IF p_type = 'ENTRADA' AND v_pack.status != 'PRESTADO' THEN
    RAISE EXCEPTION 'Pack is not PRESTADO (current: %)', v_pack.status;
  END IF;

  -- Determine new status
  IF p_type = 'SALIDA' THEN
    v_new_status := 'PRESTADO';
  ELSIF p_type = 'ENTRADA' THEN
    v_new_status := 'EN_SITIO';
  ELSE
    v_new_status := CASE WHEN v_pack.status = 'EN_SITIO' THEN 'PRESTADO' ELSE 'EN_SITIO' END;
  END IF;

  -- Insert movement record
  INSERT INTO movements (org_id, pack_id, type, previous_status, new_status, school_id, school_name, applicator_id, applicator_name, notes)
  VALUES (p_org_id, p_pack_id, p_type, v_pack.status, v_new_status, p_school_id, p_school_name, p_applicator_id, p_applicator_name, p_notes)
  RETURNING id INTO v_movement_id;

  -- Update pack status and timing fields
  UPDATE packs
  SET 
    status = v_new_status::pack_status,
    school_id = CASE WHEN p_type = 'SALIDA' THEN p_school_id ELSE CASE WHEN p_type = 'ENTRADA' THEN NULL ELSE school_id END END,
    applicator_id = CASE WHEN p_type = 'SALIDA' THEN p_applicator_id ELSE CASE WHEN p_type = 'ENTRADA' THEN NULL ELSE applicator_id END END,
    hora_salida = CASE WHEN p_type = 'SALIDA' THEN v_time ELSE CASE WHEN p_type = 'ENTRADA' THEN NULL ELSE hora_salida END END,
    hora_entrada = CASE WHEN p_type = 'ENTRADA' THEN v_time ELSE hora_entrada END,
    fecha = CASE WHEN p_type = 'SALIDA' THEN CURRENT_DATE ELSE fecha END,
    updated_at = v_now
  WHERE id = p_pack_id;

  RETURN jsonb_build_object(
    'success', true,
    'movement_id', v_movement_id,
    'previous_status', v_pack.status,
    'new_status', v_new_status
  );
END;
$$;
