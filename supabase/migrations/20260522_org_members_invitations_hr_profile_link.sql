-- Link org_members and org_invitations to hr_profiles (job position from org chart).

ALTER TABLE public.org_members
    ADD COLUMN IF NOT EXISTS hr_profile_id uuid REFERENCES public.hr_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.org_invitations
    ADD COLUMN IF NOT EXISTS hr_profile_id uuid REFERENCES public.hr_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_org_members_hr_profile
    ON public.org_members(hr_profile_id) WHERE hr_profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_org_invitations_hr_profile
    ON public.org_invitations(hr_profile_id) WHERE hr_profile_id IS NOT NULL;

-- Backfill: match legacy job_title text to hr_profiles.role_title within same org.
UPDATE public.org_members m
SET hr_profile_id = p.id
FROM (
    SELECT DISTINCT ON (org_id, lower(pg_catalog.btrim(role_title)))
        id,
        org_id,
        role_title
    FROM public.hr_profiles
    ORDER BY org_id, lower(pg_catalog.btrim(role_title)), created_at ASC
) p
WHERE m.hr_profile_id IS NULL
  AND m.job_title IS NOT NULL
  AND pg_catalog.btrim(m.job_title) <> ''
  AND m.org_id = p.org_id
  AND lower(pg_catalog.btrim(m.job_title)) = lower(pg_catalog.btrim(p.role_title));

UPDATE public.org_invitations i
SET hr_profile_id = p.id
FROM (
    SELECT DISTINCT ON (org_id, lower(pg_catalog.btrim(role_title)))
        id,
        org_id,
        role_title
    FROM public.hr_profiles
    ORDER BY org_id, lower(pg_catalog.btrim(role_title)), created_at ASC
) p
WHERE i.hr_profile_id IS NULL
  AND i.job_title IS NOT NULL
  AND pg_catalog.btrim(i.job_title) <> ''
  AND i.org_id = p.org_id
  AND lower(pg_catalog.btrim(i.job_title)) = lower(pg_catalog.btrim(p.role_title));

CREATE OR REPLACE FUNCTION public.fn_accept_invitation(
    p_token text,
    p_user_id uuid,
    p_user_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_invitation record;
    v_member_id uuid;
    v_hr_pid uuid;
    v_job_display text;
BEGIN
    SELECT * INTO v_invitation
    FROM public.org_invitations
    WHERE token = p_token
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'INVALID_TOKEN', 'message', 'Invitación inválida o no encontrada.');
    END IF;

    IF pg_catalog.lower(pg_catalog.btrim(v_invitation.email)) != pg_catalog.lower(pg_catalog.btrim(p_user_email)) THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'EMAIL_MISMATCH', 'message', 'El correo de tu sesión no coincide con el correo invitado.');
    END IF;

    SELECT id INTO v_member_id
    FROM public.org_members
    WHERE org_id = v_invitation.org_id AND user_id = p_user_id;

    IF FOUND THEN
        IF v_invitation.status = 'pending' THEN
            UPDATE public.org_invitations SET status = 'accepted', accepted_at = pg_catalog.now() WHERE id = v_invitation.id;
        END IF;
        RETURN pg_catalog.jsonb_build_object('success', true, 'code', 'ALREADY_MEMBER', 'organization_id', v_invitation.org_id, 'role', v_invitation.role, 'message', 'Ya eres miembro de la organización.');
    END IF;

    IF v_invitation.status = 'pending' AND v_invitation.expires_at < pg_catalog.now() THEN
        UPDATE public.org_invitations SET status = 'expired' WHERE id = v_invitation.id;
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'EXPIRED', 'message', 'Esta invitación expiró. Pide al administrador que te envíe una nueva.');
    END IF;

    IF v_invitation.status != 'pending' THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'EXPIRED_OR_PROCESSED', 'message', 'Esta invitación ya fue procesada o está expirada.');
    END IF;

    v_hr_pid := v_invitation.hr_profile_id;

    IF v_hr_pid IS NOT NULL THEN
        SELECT hp.role_title INTO v_job_display
        FROM public.hr_profiles hp
        WHERE hp.id = v_hr_pid AND hp.org_id = v_invitation.org_id;

        IF NOT FOUND THEN
            v_job_display := v_invitation.job_title;
            v_hr_pid := NULL;
        END IF;
    ELSE
        v_job_display := v_invitation.job_title;
    END IF;

    INSERT INTO public.org_members (org_id, user_id, role, job_title, location, hr_profile_id)
    VALUES (
        v_invitation.org_id,
        p_user_id,
        v_invitation.role::text::public.user_role,
        pg_catalog.nullif(pg_catalog.btrim(v_job_display), ''),
        pg_catalog.nullif(pg_catalog.btrim(v_invitation.location), ''),
        v_hr_pid
    )
    RETURNING id INTO v_member_id;

    UPDATE public.org_invitations SET status = 'accepted', accepted_at = pg_catalog.now() WHERE id = v_invitation.id;

    INSERT INTO public.audit_log (org_id, table_name, record_id, operation, performed_by, new_data)
    VALUES (
        v_invitation.org_id,
        'org_members',
        v_member_id,
        'INSERT',
        p_user_id,
        pg_catalog.jsonb_build_object(
            'user_id', p_user_id,
            'role', v_invitation.role,
            'job_title', v_job_display,
            'hr_profile_id', v_hr_pid,
            'location', v_invitation.location,
            'origin', 'invitation_token'
        )
    );

    RETURN pg_catalog.jsonb_build_object('success', true, 'code', 'ACCEPTED', 'organization_id', v_invitation.org_id, 'role', v_invitation.role, 'message', 'Te has unido exitosamente.');
END;
$$;

REVOKE ALL ON FUNCTION public.fn_accept_invitation(text, uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_accept_invitation(text, uuid, text) TO service_role;
