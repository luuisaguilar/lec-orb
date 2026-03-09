-- Migration to add granular permissions to module access
-- Run this in Supabase SQL Editor

ALTER TABLE member_module_access 
ADD COLUMN IF NOT EXISTS can_view BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS can_edit BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_delete BOOLEAN NOT NULL DEFAULT false;

-- Add a comment to explain the structure
COMMENT ON TABLE member_module_access IS 'Granular module access for organization members';

-- Update RLS for org_members to allow admins to PATCH roles
CREATE POLICY "Admins can update member roles" 
ON org_members FOR UPDATE
USING (
  org_id IN (
    SELECT org_id FROM org_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  org_id IN (
    SELECT org_id FROM org_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
