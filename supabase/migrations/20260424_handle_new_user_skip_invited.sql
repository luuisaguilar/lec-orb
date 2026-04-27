-- Migration: 20260424_handle_new_user_skip_invited.sql
-- Fixes handle_new_user trigger to avoid creating a "personal" org + admin
-- membership when the user signed up via invitation.
--
-- Why: the previous trigger unconditionally created a personal org for every
-- new auth.users row. When a user accepted an invitation, they ended up with
-- TWO rows in org_members (personal admin + invited role), which broke
-- getAuthenticatedMember()'s .single() query → 403 on every API call.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  new_org_id uuid;
  user_name text;
  has_pending_invite boolean;
BEGIN
  user_name := NULLIF(
    btrim(
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        split_part(COALESCE(NEW.email, ''), '@', 1)
      )
    ),
    ''
  );
  IF user_name IS NULL THEN
    user_name := 'New User';
  END IF;

  -- Always create the profile row
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, user_name)
  ON CONFLICT DO NOTHING;

  -- Skip personal-org creation if this user was invited.
  -- fn_accept_invitation will create the correct membership later.
  SELECT EXISTS (
    SELECT 1
    FROM public.org_invitations
    WHERE lower(btrim(email)) = lower(btrim(COALESCE(NEW.email, '')))
      AND status = 'pending'
  ) INTO has_pending_invite;

  IF has_pending_invite THEN
    RETURN NEW;
  END IF;

  -- No invitation → behave as before (create personal org + admin membership)
  INSERT INTO public.organizations (name)
  VALUES (user_name || '''s Organization')
  RETURNING id INTO new_org_id;

  INSERT INTO public.org_members (user_id, org_id, role)
  VALUES (NEW.id, new_org_id, 'admin')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;
