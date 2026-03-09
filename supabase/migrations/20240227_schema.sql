-- Create an Organizations table (for multitenancy support)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enum for User Roles matching our TS config
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'operador', 'applicator');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Organization Members (Links Supabase Auth User to an Org & Role)
CREATE TABLE IF NOT EXISTS org_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role user_role DEFAULT 'applicator',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, org_id)
);

-- Public user profiles for name and rate info (Applicators primarily)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  hourly_rate NUMERIC, 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enum for modules matching our TS config
DO $$ BEGIN
    CREATE TYPE module_type AS ENUM (
      'inventory', 'schools', 'applicators', 'events', 'venues', 
      'catalog', 'payroll', 'cenni', 'calculator', 'metrics', 'users'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Table to restrict specific modules for operators/supervisors
CREATE TABLE IF NOT EXISTS org_member_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES org_members(id) ON DELETE CASCADE,
  module module_type NOT NULL,
  UNIQUE(member_id, module)
);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow rerunning this script)
DROP POLICY IF EXISTS "View belonging orgs" ON organizations;

-- Policy: Users can only read orgs they belong to
CREATE POLICY "View belonging orgs" ON organizations 
FOR SELECT USING (
  id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
);
