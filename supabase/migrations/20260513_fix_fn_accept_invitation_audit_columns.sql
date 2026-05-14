-- Migration: 20260513_fix_fn_accept_invitation_audit_columns.sql
--
-- Bug: fn_accept_invitation inserts into audit_log using columns that don't
-- exist: `org_id` and `performed_by`. The actual audit_log schema has
-- `changed_by` (not `performed_by`) and no `org_id` column.
--
-- PostgreSQL PL/pgSQL does not validate SQL inside function bodies at creation
-- time, so the function was created successfully but failed at runtime with a
-- "column does not exist" error, causing every invitation acceptance to fail.
--
-- Fix: correct the audit_log INSERT to match the real schema.

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
    v_member_id  uuid;
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

    -- Already a member of this org?
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

    -- Expiry check
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

    -- Insert member with job_title + location from invitation
    INSERT INTO public.org_members (org_id, user_id, role, job_title, location)
    VALUES (
        v_invitation.org_id,
        p_user_id,
        v_invitation.role::text::public.user_role,
        pg_catalog.nullif(pg_catalog.btrim(COALESCE(v_invitation.job_title, '')), ''),
        pg_catalog.nullif(pg_catalog.btrim(COALESCE(v_invitation.location, '')),  '')
    )
    RETURNING id INTO v_member_id;

    UPDATE public.org_invitations
    SET status = 'accepted', accepted_at = pg_catalog.now()
    WHERE id = v_invitation.id;

    -- Audit log — use real column names: `changed_by`, no `org_id`
    INSERT INTO public.audit_log (table_name, record_id, operation, changed_by, new_data)
    VALUES (
        'org_members',
        v_member_id,
        'INSERT',
        p_user_id,
        pg_catalog.jsonb_build_object(
            'user_id',    p_user_id,
            'org_id',     v_invitation.org_id,
            'role',       v_invitation.role,
            'job_title',  v_invitation.job_title,
            'location',   v_invitation.location,
            'origin',     'invitation_token'
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
