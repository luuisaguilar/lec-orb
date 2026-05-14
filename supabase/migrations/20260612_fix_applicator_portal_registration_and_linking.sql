-- Migration: 20260612_fix_applicator_portal_registration_and_linking.sql
-- Fixes the handle_new_user trigger and applicator portal invitation RPC 
-- to be compatible with production schema and avoid accidental organization creation.

-- 1. Fix handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  new_org_id uuid;
  user_name text;
  has_pending_staff_invite boolean;
  has_pending_applicator_invite boolean;
BEGIN
  user_name := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, ''), '@', 1))), '');
  IF user_name IS NULL THEN user_name := 'New User'; END IF;

  -- Create profile (no email column to avoid production schema mismatches)
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, user_name)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  -- Check for pending invitations
  SELECT EXISTS (
    SELECT 1 FROM public.org_invitations
    WHERE lower(btrim(email)) = lower(btrim(COALESCE(NEW.email, ''))) AND status = 'pending'
  ) INTO has_pending_staff_invite;

  SELECT EXISTS (
    SELECT 1 FROM public.applicator_portal_invitations
    WHERE lower(btrim(email)) = lower(btrim(COALESCE(NEW.email, ''))) AND status = 'pending'
  ) INTO has_pending_applicator_invite;

  -- Skip personal org creation if invited
  IF has_pending_staff_invite OR has_pending_applicator_invite THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.organizations (name)
  VALUES (user_name || '''s Organization')
  RETURNING id INTO new_org_id;

  INSERT INTO public.org_members (user_id, org_id, role)
  VALUES (NEW.id, new_org_id, 'admin')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 2. Fix applicator portal invitation acceptance RPC
CREATE OR REPLACE FUNCTION public.fn_accept_applicator_portal_invitation(
  p_token text,
  p_user_id uuid,
  p_user_email text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_inv public.applicator_portal_invitations%ROWTYPE;
BEGIN
  SELECT * INTO v_inv
  FROM public.applicator_portal_invitations
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'code', 'NOT_FOUND', 'message', 'Invitación no encontrada.');
  END IF;

  IF v_inv.status <> 'pending' THEN
    RETURN json_build_object('success', false, 'code', 'ALREADY_USED', 'message', 'Esta invitación ya fue usada.');
  END IF;

  IF lower(trim(v_inv.email)) IS DISTINCT FROM lower(trim(coalesce(p_user_email, ''))) THEN
    RETURN json_build_object('success', false, 'code', 'EMAIL_MISMATCH', 'message', 'El correo no coincide.');
  END IF;

  -- Link applicator (without updated_at for production compatibility)
  UPDATE public.applicators
  SET auth_user_id = p_user_id
  WHERE id = v_inv.applicator_id;

  UPDATE public.applicator_portal_invitations
  SET status = 'accepted', 
      accepted_at = now()
  WHERE id = v_inv.id;

  RETURN json_build_object('success', true, 'message', 'Portal vinculado correctamente.');
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'code', 'DB_ERROR', 'message', SQLERRM);
END;
$$;
