-- ================================================================
-- Phase 12 Fix: Auto-create org on signup + Schools/Applicators
-- Run this entire script in the Supabase SQL Editor
-- ================================================================

-- ---------------------------------------------------------------
-- 1. Trigger: When a new user signs up, automatically create an 
--    organization and link them to it as admin.
--    This runs server-side with elevated privileges, bypassing RLS.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  user_name TEXT;
BEGIN
  -- Get the full name from auth metadata, fallback to email prefix
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- Create a profile record
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, user_name)
  ON CONFLICT (id) DO NOTHING;

  -- Create an organization
  INSERT INTO public.organizations (name)
  VALUES (user_name || '''s Organization')
  RETURNING id INTO new_org_id;

  -- Link user to the org as admin
  INSERT INTO public.org_members (user_id, org_id, role)
  VALUES (NEW.id, new_org_id, 'admin')
  ON CONFLICT (user_id, org_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Attach the trigger to new user signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ---------------------------------------------------------------
-- 2. Schools table
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can manage schools" ON schools;
CREATE POLICY "Org members can manage schools" ON schools
FOR ALL USING (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
);


-- ---------------------------------------------------------------
-- 3. Applicators table
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  rate_per_hour NUMERIC,
  roles TEXT[] DEFAULT '{}',
  certified_levels TEXT[] DEFAULT '{}',
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE applicators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can manage applicators" ON applicators;
CREATE POLICY "Org members can manage applicators" ON applicators
FOR ALL USING (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
);


-- ---------------------------------------------------------------
-- 4. Add school_id and applicator_id references to packs
--    (if they don't exist yet)
-- ---------------------------------------------------------------
ALTER TABLE packs 
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE SET NULL;

-- Rename current_applicator_id to applicator_id for clarity (only if needed)
-- If this errors, it means the column was already renamed, which is fine.
ALTER TABLE packs
  ADD COLUMN IF NOT EXISTS applicator_id UUID REFERENCES applicators(id) ON DELETE SET NULL;
