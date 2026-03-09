-- LEC Platform — Inventory Module Migration
-- Tables: packs, movements, audit_log
-- RPC: create_movement_and_update_pack

-- ============================================================
-- 1. ENUMS
-- ============================================================

CREATE TYPE pack_status AS ENUM ('EN_SITIO', 'PRESTADO');
CREATE TYPE movement_type AS ENUM ('SALIDA', 'ENTRADA', 'AJUSTE');

-- ============================================================
-- 2. PACKS
-- ============================================================

CREATE TABLE packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  nombre text NOT NULL DEFAULT '',
  status pack_status NOT NULL DEFAULT 'EN_SITIO',
  current_school_id uuid,
  current_applicator_id uuid,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, codigo)
);

CREATE INDEX idx_packs_org ON packs(org_id);
CREATE INDEX idx_packs_status ON packs(org_id, status);
CREATE INDEX idx_packs_codigo ON packs(org_id, codigo);
CREATE INDEX idx_packs_deleted ON packs(org_id, deleted_at);

-- ============================================================
-- 3. MOVEMENTS (append-only, immutable)
-- ============================================================

CREATE TABLE movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pack_id uuid NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  type movement_type NOT NULL,
  -- Snapshot fields at time of movement
  school_id uuid,
  school_name text,
  applicator_id uuid,
  applicator_name text,
  -- Metadata
  previous_status pack_status,
  new_status pack_status NOT NULL,
  notes text,
  performed_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- No UPDATE or DELETE allowed (enforced via RLS + no policies for those ops)
CREATE INDEX idx_movements_pack ON movements(pack_id);
CREATE INDEX idx_movements_org ON movements(org_id);
CREATE INDEX idx_movements_created ON movements(org_id, created_at DESC);

-- ============================================================
-- 4. AUDIT LOG (append-only, immutable)
-- ============================================================

CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL,  -- 'INSERT', 'UPDATE', 'SOFT_DELETE', 'RESTORE'
  old_data jsonb,
  new_data jsonb,
  performed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- No UPDATE or DELETE allowed
CREATE INDEX idx_audit_log_org ON audit_log(org_id);
CREATE INDEX idx_audit_log_record ON audit_log(record_id);
CREATE INDEX idx_audit_log_created ON audit_log(org_id, created_at DESC);

-- ============================================================
-- 5. RLS POLICIES
-- ============================================================

ALTER TABLE packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Packs: org members can read, supervisors/admins can manage
CREATE POLICY "Members can read packs"
  ON packs FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
    AND deleted_at IS NULL
  );

CREATE POLICY "Supervisors can insert packs"
  ON packs FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "Supervisors can update packs"
  ON packs FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM org_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

-- Movements: org members can read, all org members can insert (via RPC)
CREATE POLICY "Members can read movements"
  ON movements FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can insert movements"
  ON movements FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

-- No UPDATE or DELETE policies for movements (append-only)

-- Audit log: org members can read, system can insert
CREATE POLICY "Members can read audit_log"
  ON audit_log FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can insert audit_log"
  ON audit_log FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

-- No UPDATE or DELETE policies for audit_log (append-only)

-- ============================================================
-- 6. RPC: create_movement_and_update_pack
-- ============================================================

CREATE OR REPLACE FUNCTION create_movement_and_update_pack(
  p_org_id uuid,
  p_pack_id uuid,
  p_type movement_type,
  p_school_id uuid DEFAULT NULL,
  p_school_name text DEFAULT NULL,
  p_applicator_id uuid DEFAULT NULL,
  p_applicator_name text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pack RECORD;
  v_new_status pack_status;
  v_movement_id uuid;
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user belongs to org
  IF NOT EXISTS (
    SELECT 1 FROM org_members WHERE user_id = v_user_id AND org_id = p_org_id
  ) THEN
    RAISE EXCEPTION 'Access denied: user does not belong to organization';
  END IF;

  -- Lock the pack row for update
  SELECT * INTO v_pack
  FROM packs
  WHERE id = p_pack_id AND org_id = p_org_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pack not found or deleted';
  END IF;

  -- Validate state transitions
  IF p_type = 'SALIDA' THEN
    IF v_pack.status != 'EN_SITIO' THEN
      RAISE EXCEPTION 'Cannot checkout: pack is not EN_SITIO (current: %)', v_pack.status;
    END IF;
    IF p_school_id IS NULL AND p_school_name IS NULL THEN
      RAISE EXCEPTION 'SALIDA requires a school';
    END IF;
    IF p_applicator_id IS NULL AND p_applicator_name IS NULL THEN
      RAISE EXCEPTION 'SALIDA requires an applicator';
    END IF;
    v_new_status := 'PRESTADO';

  ELSIF p_type = 'ENTRADA' THEN
    IF v_pack.status != 'PRESTADO' THEN
      RAISE EXCEPTION 'Cannot checkin: pack is not PRESTADO (current: %)', v_pack.status;
    END IF;
    v_new_status := 'EN_SITIO';

  ELSIF p_type = 'AJUSTE' THEN
    -- Adjustment: toggle or set based on current status
    IF v_pack.status = 'EN_SITIO' THEN
      v_new_status := 'PRESTADO';
    ELSE
      v_new_status := 'EN_SITIO';
    END IF;

  ELSE
    RAISE EXCEPTION 'Invalid movement type: %', p_type;
  END IF;

  -- Dedup check: prevent duplicate movement within 5 seconds
  IF EXISTS (
    SELECT 1 FROM movements
    WHERE pack_id = p_pack_id
      AND type = p_type
      AND org_id = p_org_id
      AND created_at > now() - interval '5 seconds'
  ) THEN
    RAISE EXCEPTION 'Duplicate movement detected (within 5s window)';
  END IF;

  -- Create the movement
  INSERT INTO movements (
    org_id, pack_id, type,
    school_id, school_name,
    applicator_id, applicator_name,
    previous_status, new_status,
    notes, performed_by
  ) VALUES (
    p_org_id, p_pack_id, p_type,
    p_school_id, p_school_name,
    p_applicator_id, p_applicator_name,
    v_pack.status, v_new_status,
    p_notes, v_user_id
  )
  RETURNING id INTO v_movement_id;

  -- Update the pack
  UPDATE packs SET
    status = v_new_status,
    current_school_id = CASE
      WHEN p_type = 'SALIDA' THEN p_school_id
      WHEN p_type = 'ENTRADA' THEN NULL
      ELSE current_school_id
    END,
    current_applicator_id = CASE
      WHEN p_type = 'SALIDA' THEN p_applicator_id
      WHEN p_type = 'ENTRADA' THEN NULL
      ELSE current_applicator_id
    END,
    updated_at = now()
  WHERE id = p_pack_id;

  -- Audit log
  INSERT INTO audit_log (
    org_id, table_name, record_id, action,
    old_data, new_data, performed_by
  ) VALUES (
    p_org_id, 'packs', p_pack_id, 'MOVEMENT',
    jsonb_build_object('status', v_pack.status::text),
    jsonb_build_object(
      'status', v_new_status::text,
      'movement_id', v_movement_id::text,
      'movement_type', p_type::text
    ),
    v_user_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'movement_id', v_movement_id,
    'previous_status', v_pack.status::text,
    'new_status', v_new_status::text
  );
END;
$$;
