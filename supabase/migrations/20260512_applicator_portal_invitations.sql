-- Migration: 20260512_applicator_portal_invitations.sql
-- Invitations to link auth.users → applicators.auth_user_id (portal access).

CREATE TABLE IF NOT EXISTS public.applicator_portal_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  applicator_id uuid NOT NULL REFERENCES public.applicators(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_applicator_portal_inv_token
  ON public.applicator_portal_invitations(token);

CREATE INDEX IF NOT EXISTS idx_applicator_portal_inv_org
  ON public.applicator_portal_invitations(org_id);

-- At most one pending invite per applicator.
CREATE UNIQUE INDEX IF NOT EXISTS idx_applicator_portal_inv_one_pending
  ON public.applicator_portal_invitations(applicator_id)
  WHERE status = 'pending';

ALTER TABLE public.applicator_portal_invitations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'applicator_portal_invitations'
      AND policyname = 'Supervisors can manage applicator portal invitations'
  ) THEN
    CREATE POLICY "Supervisors can manage applicator portal invitations"
      ON public.applicator_portal_invitations FOR ALL TO authenticated
      USING (
        org_id IN (
          SELECT org_id FROM public.org_members
          WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
      )
      WITH CHECK (
        org_id IN (
          SELECT org_id FROM public.org_members
          WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
      );
  END IF;
END $$;

-- Atomic accept: verify token, email, link applicator, close invite.
CREATE OR REPLACE FUNCTION public.fn_accept_applicator_portal_invitation(
  p_token text,
  p_user_id uuid,
  p_user_email text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.applicator_portal_invitations%ROWTYPE;
  v_app public.applicators%ROWTYPE;
BEGIN
  SELECT * INTO v_inv
  FROM public.applicator_portal_invitations
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'code', 'NOT_FOUND',
      'message', 'Invitación no encontrada.'
    );
  END IF;

  IF v_inv.status <> 'pending' THEN
    RETURN json_build_object(
      'success', false,
      'code', 'ALREADY_USED',
      'message', 'Esta invitación ya fue usada o cancelada.'
    );
  END IF;

  IF v_inv.expires_at < now() THEN
    UPDATE public.applicator_portal_invitations
    SET status = 'expired'
    WHERE id = v_inv.id;

    RETURN json_build_object(
      'success', false,
      'code', 'EXPIRED',
      'message', 'La invitación expiró.'
    );
  END IF;

  IF lower(trim(v_inv.email)) IS DISTINCT FROM lower(trim(coalesce(p_user_email, ''))) THEN
    RETURN json_build_object(
      'success', false,
      'code', 'EMAIL_MISMATCH',
      'message', 'Debes iniciar sesión con el correo al que se envió la invitación.'
    );
  END IF;

  SELECT * INTO v_app
  FROM public.applicators
  WHERE id = v_inv.applicator_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'code', 'NOT_FOUND',
      'message', 'Aplicador no encontrado.'
    );
  END IF;

  IF v_app.auth_user_id IS NOT NULL AND v_app.auth_user_id <> p_user_id THEN
    RETURN json_build_object(
      'success', false,
      'code', 'ALREADY_LINKED',
      'message', 'Este aplicador ya está vinculado a otra cuenta.'
    );
  END IF;

  UPDATE public.applicators
  SET auth_user_id = p_user_id, updated_at = now()
  WHERE id = v_app.id;

  UPDATE public.applicator_portal_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = v_inv.id;

  RETURN json_build_object(
    'success', true,
    'message', 'Portal vinculado correctamente.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_accept_applicator_portal_invitation(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_accept_applicator_portal_invitation(text, uuid, text) TO service_role;
