-- Migration: 20260421_invitation_accept_rpc.sql
-- Goal: Atomic Postgres RPC for invitation acceptance

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
    -- 1. Lock the invitation row for update to prevent concurrent race conditions
    SELECT * INTO v_invitation
    FROM public.org_invitations
    WHERE token = p_token
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'INVALID_TOKEN',
            'message', 'Invitación inválida o no encontrada.'
        );
    END IF;

    -- 2. Validate email
    IF pg_catalog.lower(pg_catalog.trim(v_invitation.email)) != pg_catalog.lower(pg_catalog.trim(p_user_email)) THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'EMAIL_MISMATCH',
            'message', 'El correo de tu sesión no coincide con el correo invitado.'
        );
    END IF;

    -- 3. Check for existing membership
    SELECT id INTO v_member_id
    FROM public.org_members
    WHERE org_id = v_invitation.org_id AND user_id = p_user_id;

    IF FOUND THEN
        -- If already a member, check if invitation was still pending and close it
        IF v_invitation.status = 'pending' THEN
            UPDATE public.org_invitations
            SET status = 'accepted', accepted_at = pg_catalog.now()
            WHERE id = v_invitation.id;
        END IF;

        RETURN pg_catalog.jsonb_build_object(
            'success', true,
            'code', 'ALREADY_MEMBER',
            'organization_id', v_invitation.org_id,
            'role', v_invitation.role,
            'message', 'Ya eres miembro de la organización.'
        );
    END IF;

    -- 4. Check if invitation is still pending
    IF v_invitation.status != 'pending' THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'EXPIRED_OR_PROCESSED',
            'message', 'Esta invitación ya fue procesada o está expirada.'
        );
    END IF;

    -- 5. Insert into org_members
    -- Note: `org_id, user_id` must be unique. The schema has `UNIQUE(org_id, user_id)`.
    INSERT INTO public.org_members (org_id, user_id, role)
    VALUES (v_invitation.org_id, p_user_id, v_invitation.role)
    RETURNING id INTO v_member_id;

    -- 6. Update invitation status
    UPDATE public.org_invitations
    SET status = 'accepted', accepted_at = pg_catalog.now()
    WHERE id = v_invitation.id;

    -- 7. Audit log
    -- Explicitly write the audit log entry.
    INSERT INTO public.audit_log (table_name, record_id, operation, changed_by, new_data)
    VALUES (
        'org_members', 
        v_member_id, 
        'INSERT', 
        p_user_id, 
        pg_catalog.jsonb_build_object('user_id', p_user_id, 'role', v_invitation.role, 'origin', 'invitation_token')
    );

    -- 8. Return success
    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'code', 'ACCEPTED',
        'organization_id', v_invitation.org_id,
        'role', v_invitation.role,
        'message', 'Te has unido exitosamente.'
    );
END;
$$;

-- Restrict execution
REVOKE ALL ON FUNCTION public.fn_accept_invitation(text, uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_accept_invitation(text, uuid, text) TO service_role;
