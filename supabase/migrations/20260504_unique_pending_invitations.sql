-- Migration: 20260504_unique_pending_invitations.sql
-- Description: Prevents duplicate pending invitations to the same email within the same organization.
-- This ensures that an admin doesn't accidentally send multiple active invites to the same person.

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_invitations_pending_email_org
  ON public.org_invitations(org_id, lower(email))
  WHERE status = 'pending';

COMMENT ON INDEX idx_org_invitations_pending_email_org IS 'Ensures only one pending invitation per email and organization.';
