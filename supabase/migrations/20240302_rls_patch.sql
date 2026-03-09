-- RLS Policies Patch — Phase 12
-- Run this in the Supabase SQL Editor to allow newly registered users
-- to create their own organization and link themselves to it.

-- ============================================================
-- organizations: allow any authenticated user to INSERT
-- (They can only SELECT orgs they belong to, per the existing policy)
-- ============================================================
DROP POLICY IF EXISTS "Allow authenticated insert orgs" ON organizations;
CREATE POLICY "Allow authenticated insert orgs" ON organizations
FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- org_members: allow authenticated users to see and insert their own records
-- ============================================================
DROP POLICY IF EXISTS "View own org memberships" ON org_members;
CREATE POLICY "View own org memberships" ON org_members
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow self insert org membership" ON org_members;
CREATE POLICY "Allow self insert org membership" ON org_members
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ============================================================
-- profiles: allow users to manage their own profile
-- ============================================================
DROP POLICY IF EXISTS "View own profile" ON profiles;
CREATE POLICY "View own profile" ON profiles
FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Insert own profile" ON profiles;
CREATE POLICY "Insert own profile" ON profiles
FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Update own profile" ON profiles;
CREATE POLICY "Update own profile" ON profiles
FOR UPDATE USING (id = auth.uid());
