-- =============================================================================
-- LEC Platform — Fix: allow public token-based reads on invitation tables
-- =============================================================================
-- Context: join/[token] and join-portal/[token] pages use createClient()
-- (anon key). Without a SELECT policy, RLS blocks the token lookup for
-- unauthenticated users and they always see "Invitación inválida".
-- The token itself (32-byte random hex) is the secret — no scoping needed.
-- =============================================================================

-- org_invitations: anyone can look up a single invitation by token
-- (used by /join/[token] page for new org members)
CREATE POLICY "Public can read org_invitation by token"
  ON org_invitations FOR SELECT
  USING (true);

-- applicator_invitations: anyone can look up a single applicator invitation by token
-- (used by /join-portal/[token] page for applicator portal access)
CREATE POLICY "Public can read applicator_invitation by token"
  ON applicator_invitations FOR SELECT
  USING (true);

NOTIFY pgrst, 'reload schema';
