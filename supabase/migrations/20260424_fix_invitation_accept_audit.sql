-- Migration: 20260424_fix_invitation_accept_audit.sql
-- Fixes fn_accept_invitation:
--   1. pg_catalog.trim doesn't exist → use pg_catalog.btrim
--   2. audit_log column is `operation` NOT NULL, not `action`
--   3. org_members.role is enum `member_role`, invitation.role is `user_role` → cast

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

    IF v_invitation.status != 'pending' THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'EXPIRED_OR_PROCESSED', 'message', 'Esta invitación ya fue procesada o está expirada.');
    END IF;

    -- Cast invitation role (user_role) into member_role for org_members insert
    INSERT INTO public.org_members (org_id, user_id, role)
    VALUES (v_invitation.org_id, p_user_id, v_invitation.role::text::public.member_role)
    RETURNING id INTO v_member_id;

    UPDATE public.org_invitations SET status = 'accepted', accepted_at = pg_catalog.now() WHERE id = v_invitation.id;

    -- audit_log uses `operation` (NOT NULL), not `action`
    INSERT INTO public.audit_log (org_id, table_name, record_id, operation, performed_by, new_data)
    VALUES (v_invitation.org_id, 'org_members', v_member_id, 'INSERT', p_user_id,
        pg_catalog.jsonb_build_object('user_id', p_user_id, 'role', v_invitation.role, 'origin', 'invitation_token'));

    RETURN pg_catalog.jsonb_build_object('success', true, 'code', 'ACCEPTED', 'organization_id', v_invitation.org_id, 'role', v_invitation.role, 'message', 'Te has unido exitosamente.');
END;
$$;

REVOKE ALL ON FUNCTION public.fn_accept_invitation(text, uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_accept_invitation(text, uuid, text) TO service_role;
