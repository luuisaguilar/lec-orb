-- LEC Platform — Catalogs Migration
-- Tables: schools, rooms, applicators, exam_catalog

-- ============================================================
-- 1. SCHOOLS
-- ============================================================

CREATE TABLE schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  contact_name text,
  contact_phone text,
  contact_email text,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_schools_org ON schools(org_id);
CREATE INDEX idx_schools_deleted ON schools(org_id, deleted_at);

-- ============================================================
-- 2. ROOMS (belong to schools)
-- ============================================================

CREATE TABLE rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  capacity integer,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rooms_school ON rooms(school_id);
CREATE INDEX idx_rooms_org ON rooms(org_id);

-- ============================================================
-- 3. APPLICATORS
-- ============================================================

CREATE TABLE applicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  rate_per_hour numeric(10, 2),
  roles text[] NOT NULL DEFAULT '{}',
  certified_levels text[] NOT NULL DEFAULT '{}',
  auth_user_id uuid UNIQUE REFERENCES auth.users(id),
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_applicators_org ON applicators(org_id);
CREATE INDEX idx_applicators_deleted ON applicators(org_id, deleted_at);
CREATE INDEX idx_applicators_auth_user ON applicators(auth_user_id);

-- ============================================================
-- 4. EXAM CATALOG
-- ============================================================

CREATE TABLE exam_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  duration_minutes integer NOT NULL,
  students_per_session integer NOT NULL DEFAULT 1,
  level text,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, code)
);

CREATE INDEX idx_exam_catalog_org ON exam_catalog(org_id);

-- ============================================================
-- 5. ADD FOREIGN KEY TO PACKS (for school/applicator references)
-- ============================================================

ALTER TABLE packs
  ADD CONSTRAINT fk_packs_school FOREIGN KEY (current_school_id) REFERENCES schools(id) ON DELETE SET NULL;

ALTER TABLE packs
  ADD CONSTRAINT fk_packs_applicator FOREIGN KEY (current_applicator_id) REFERENCES applicators(id) ON DELETE SET NULL;

ALTER TABLE movements
  ADD CONSTRAINT fk_movements_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL;

ALTER TABLE movements
  ADD CONSTRAINT fk_movements_applicator FOREIGN KEY (applicator_id) REFERENCES applicators(id) ON DELETE SET NULL;

-- ============================================================
-- 6. RLS
-- ============================================================

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE applicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_catalog ENABLE ROW LEVEL SECURITY;

-- Schools
CREATE POLICY "Members can read schools" ON schools FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()) AND deleted_at IS NULL);

CREATE POLICY "Supervisors can manage schools" ON schools FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')));

-- Rooms
CREATE POLICY "Members can read rooms" ON rooms FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()) AND deleted_at IS NULL);

CREATE POLICY "Supervisors can manage rooms" ON rooms FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')));

-- Applicators
CREATE POLICY "Members can read applicators" ON applicators FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()) AND deleted_at IS NULL);

CREATE POLICY "Supervisors can manage applicators" ON applicators FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')));

-- Exam Catalog
CREATE POLICY "Members can read exam_catalog" ON exam_catalog FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()) AND deleted_at IS NULL);

CREATE POLICY "Admins can manage exam_catalog" ON exam_catalog FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'admin'));
