-- Enum for Pack Status
DO $$ BEGIN
    CREATE TYPE pack_status AS ENUM ('EN_SITIO', 'PRESTADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- The Events Table (Packs are loaned here)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  folio TEXT NOT NULL,
  date DATE NOT NULL,
  school_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- The actual Packs Inventory
CREATE TABLE IF NOT EXISTS packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  nombre TEXT,
  status pack_status DEFAULT 'EN_SITIO',
  notes TEXT,
  
  -- Relations for when it's loaned out
  current_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  current_applicator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- A pack code must be unique within an organization
  UNIQUE(org_id, codigo)
);

-- Audit Log to track who scanned/loaned what
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for all 3 tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if running multiple times
DROP POLICY IF EXISTS "View belonging org events" ON events;
DROP POLICY IF EXISTS "View belonging org packs" ON packs;
DROP POLICY IF EXISTS "View belonging org audit logs" ON audit_log;

-- Security Policies so users only see their organization's inventory
CREATE POLICY "View belonging org events" ON events FOR ALL USING (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
);

CREATE POLICY "View belonging org packs" ON packs FOR ALL USING (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
);

CREATE POLICY "View belonging org audit logs" ON audit_log FOR ALL USING (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
);
