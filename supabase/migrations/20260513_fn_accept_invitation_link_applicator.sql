-- Migration: 20260513_fn_accept_invitation_link_applicator.sql
--
-- Adds applicator auto-link logic to fn_accept_invitation.
-- When an applicator role invitation is accepted:
--   1. If an applicators row exists with the same email and no auth_user_id → link it.
--   2. If no applicators row exists → create one.
-- This ensures that applicators pre-loaded in the directory get linked automatically
-- when they accept their org invitation.

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
    v_invitation  record;
    v_member_id   uuid;
    v_hr_pid      uuid;
    v_job_display text;
    v_seeded_count int;
BEGIN
    SELECT * INTO v_invitation
    FROM public.org_invitations
    WHERE token = p_token
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false, 'code', 'INVALID_TOKEN',
            'message', 'Invitación inválida o no encontrada.'
        );
    END IF;

    IF pg_catalog.lower(pg_catalog.btrim(v_invitation.email))
       != pg_catalog.lower(pg_catalog.btrim(p_user_email)) THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false, 'code', 'EMAIL_MISMATCH',
            'message', 'El correo de tu sesión no coincide con el correo invitado.'
        );
    END IF;

    SELECT id INTO v_member_id
    FROM public.org_members
    WHERE org_id = v_invitation.org_id AND user_id = p_user_id;

    IF FOUND THEN
        IF v_invitation.status = 'pending' THEN
            UPDATE public.org_invitations
            SET status = 'accepted', accepted_at = pg_catalog.now()
            WHERE id = v_invitation.id;
        END IF;
        RETURN pg_catalog.jsonb_build_object(
            'success', true, 'code', 'ALREADY_MEMBER',
            'organization_id', v_invitation.org_id,
            'role', v_invitation.role,
            'message', 'Ya eres miembro de la organización.'
        );
    END IF;

    IF v_invitation.status = 'pending' AND v_invitation.expires_at < pg_catalog.now() THEN
        UPDATE public.org_invitations SET status = 'expired' WHERE id = v_invitation.id;
        RETURN pg_catalog.jsonb_build_object(
            'success', false, 'code', 'EXPIRED',
            'message', 'Esta invitación expiró. Pide al administrador que te envíe una nueva.'
        );
    END IF;

    IF v_invitation.status != 'pending' THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false, 'code', 'EXPIRED_OR_PROCESSED',
            'message', 'Esta invitación ya fue procesada o está expirada.'
        );
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
        pg_catalog.nullif(pg_catalog.btrim(pg_catalog.coalesce(v_job_display, '')), ''),
        pg_catalog.nullif(pg_catalog.btrim(pg_catalog.coalesce(v_invitation.location, '')), ''),
        v_hr_pid
    )
    RETURNING id INTO v_member_id;

    -- Option A: link or create applicators row when role = applicator
    IF v_invitation.role = 'applicator' THEN
        UPDATE public.applicators
        SET auth_user_id = p_user_id
        WHERE pg_catalog.lower(pg_catalog.btrim(email))
              = pg_catalog.lower(pg_catalog.btrim(p_user_email))
          AND auth_user_id IS NULL
          AND org_id = v_invitation.org_id;

        IF NOT FOUND THEN
            INSERT INTO public.applicators (org_id, auth_user_id, name, email)
            VALUES (
                v_invitation.org_id,
                p_user_id,
                pg_catalog.split_part(p_user_email, '@', 1),
                pg_catalog.lower(pg_catalog.btrim(p_user_email))
            );
        END IF;
    END IF;

    IF v_invitation.role != 'applicator' THEN
        INSERT INTO public.member_module_access (org_id, member_id, module, can_view, can_edit, can_delete)
        SELECT
            v_invitation.org_id,
            v_member_id,
            mr.slug,
            true,
            CASE WHEN v_invitation.role IN ('admin', 'supervisor') THEN true ELSE false END,
            CASE WHEN v_invitation.role = 'admin' THEN true ELSE false END
        FROM public.module_registry mr
        WHERE mr.is_native = true
          AND (mr.org_id IS NULL OR mr.org_id = v_invitation.org_id)
          AND mr.slug NOT IN ('dashboard')
        ON CONFLICT (member_id, module) DO NOTHING;

        GET DIAGNOSTICS v_seeded_count = ROW_COUNT;
    ELSE
        v_seeded_count := 0;
    END IF;

    UPDATE public.org_invitations
    SET status = 'accepted', accepted_at = pg_catalog.now()
    WHERE id = v_invitation.id;

    INSERT INTO public.audit_log (org_id, table_name, record_id, operation, performed_by, new_data)
    VALUES (
        v_invitation.org_id,
        'org_members',
        v_member_id,
        'INSERT',
        p_user_id,
        pg_catalog.jsonb_build_object(
            'user_id',        p_user_id,
            'role',           v_invitation.role,
            'job_title',      v_job_display,
            'hr_profile_id',  v_hr_pid,
            'location',       v_invitation.location,
            'modules_seeded', v_seeded_count,
            'origin',         'invitation_token'
        )
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', true, 'code', 'ACCEPTED',
        'organization_id', v_invitation.org_id,
        'role', v_invitation.role,
        'message', 'Te has unido exitosamente.'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_accept_invitation(text, uuid, text)
    FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_accept_invitation(text, uuid, text)
    TO service_role;
