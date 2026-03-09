-- LEC Platform — Core Schema Migration
-- Multi-tenant foundation tables

-- ============================================================
-- 1. ENUMS
-- ============================================================

CREATE TYPE member_role AS ENUM ('admin', 'supervisor', 'operador', 'applicator');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- ============================================================
-- 2. ORGANIZATIONS
-- ============================================================

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. PROFILES (1:1 with auth.users)
-- ============================================================

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. ORG MEMBERS
-- ============================================================

CREATE TABLE org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role member_role NOT NULL DEFAULT 'operador',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- ============================================================
-- 5. MEMBER MODULE ACCESS
-- ============================================================

CREATE TABLE member_module_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES org_members(id) ON DELETE CASCADE,
  module text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(member_id, module)
);

-- ============================================================
-- 6. USER SETTINGS
-- ============================================================

CREATE TABLE user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  locale text NOT NULL DEFAULT 'es-MX' CHECK (locale IN ('es-MX', 'en-US')),
  theme text NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. ORG INVITATIONS
-- ============================================================

CREATE TABLE org_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role member_role NOT NULL DEFAULT 'operador',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status invitation_status NOT NULL DEFAULT 'pending',
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

-- ============================================================
-- 8. RLS POLICIES
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_module_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_invitations ENABLE ROW LEVEL SECURITY;

-- Organizations: members can read their org
CREATE POLICY "Members can read own org"
  ON organizations FOR SELECT
  USING (
    id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

-- Profiles: users can read and update their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Org Members: members can read org peers
CREATE POLICY "Members can read org peers"
  ON org_members FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

-- Org Members: admins can manage members
CREATE POLICY "Admins can insert members"
  ON org_members FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update members"
  ON org_members FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM org_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete members"
  ON org_members FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM org_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Member Module Access: user can read own, admins can manage
CREATE POLICY "Users can read own module access"
  ON member_module_access FOR SELECT
  USING (
    member_id IN (SELECT id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage module access"
  ON member_module_access FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM org_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- User Settings: user can read/update own settings only
CREATE POLICY "Users can read own settings"
  ON user_settings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can upsert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (user_id = auth.uid());

-- Org Invitations: admins can manage, invited user can read by token
CREATE POLICY "Admins can manage invitations"
  ON org_invitations FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM org_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- 9. INDEXES
-- ============================================================

CREATE INDEX idx_org_members_user ON org_members(user_id);
CREATE INDEX idx_org_members_org ON org_members(org_id);
CREATE INDEX idx_member_module_access_member ON member_module_access(member_id);
CREATE INDEX idx_org_invitations_token ON org_invitations(token);
CREATE INDEX idx_org_invitations_email ON org_invitations(email);

-- ============================================================
-- 10. TRIGGER: auto-create profile on auth.users insert
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
