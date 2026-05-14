-- Migration: 20260613_org_invitations_applicator_id.sql
--
-- Adds explicit applicator binding to org_invitations so an invitation can
-- target a specific applicators row at creation time, independent of email.
-- Backward compatible: the column is nullable. Invitations without
-- applicator_id continue to use the existing email-match fallback in
-- fn_accept_invitation.

ALTER TABLE public.org_invitations
    ADD COLUMN IF NOT EXISTS applicator_id uuid
        REFERENCES public.applicators(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_org_invitations_applicator_id
    ON public.org_invitations (applicator_id)
    WHERE applicator_id IS NOT NULL;

COMMENT ON COLUMN public.org_invitations.applicator_id IS
    'Optional explicit binding to an applicators row. When set, fn_accept_invitation links by id instead of email match.';
