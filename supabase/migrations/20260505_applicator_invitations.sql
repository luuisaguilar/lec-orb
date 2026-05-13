-- =============================================================================
-- LEC Platform — Applicator Portal Invitations
-- =============================================================================
-- Allows admins/coordinators to invite applicators to access their personal
-- portal (/portal/*). The invitation creates a magic-link URL or password setup
-- flow that, when accepted, populates applicators.auth_user_id linking the
-- applicator record to a Supabase auth.users entry.
-- =============================================================================

CREATE TABLE public.applicator_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  applicator_id uuid NOT NULL REFERENCES applicators(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  -- Method: 'magic_link' (one-click email link) or 'password' (set password flow)
  method text NOT NULL DEFAULT 'magic_link' CHECK (method IN ('magic_link','password')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','revoked')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  invited_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(applicator_id, status) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_applicator_invitations_applicator ON public.applicator_invitations(applicator_id);
CREATE INDEX idx_applicator_invitations_token ON public.applicator_invitations(token);
CREATE INDEX idx_applicator_invitations_status ON public.applicator_invitations(org_id, status);

CREATE TRIGGER set_applicator_invitations_updated_at
  BEFORE UPDATE ON applicator_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- RLS — only admins can read/manage; anyone can read by token (for redemption)
-- =============================================================================

ALTER TABLE applicator_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_applicator_invitations" ON applicator_invitations FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('admin','supervisor')));

-- Token-based redemption is handled by the API route using the service role,
-- so no public-facing read policy is needed here.

NOTIFY pgrst, 'reload schema';
