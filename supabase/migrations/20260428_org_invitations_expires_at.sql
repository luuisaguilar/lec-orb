-- Migration: 20260428_org_invitations_expires_at.sql
-- Goal: Add automatic expiration to org_invitations.
--   1. New column `expires_at TIMESTAMPTZ NOT NULL` with default `now() + 7 days`.
--   2. Backfill existing pending invitations to expire 7 days from migration apply time.
--   3. Update fn_accept_invitation to:
--        a) reject expired invitations with code='EXPIRED'
--        b) auto-flip status to 'expired' on the row when caught (so the dashboard shows it correctly)
--   4. New helper RPC `fn_expire_old_invitations()` to bulk-expire pending invitations whose
--      expires_at < now() (callable from a future cron / cleanup endpoint).

-- ============================================================
-- 1. Schema change
-- ============================================================

ALTER TABLE public.org_invitations
    ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL
        DEFAULT (pg_catalog.now() + interval '7 days');

-- Backfill: pending invitations created before this migration get a fresh 7-day window
UPDATE public.org_invitations
SET expires_at = pg_catalog.now() + interval '7 days'
WHERE status = 'pending'
  AND expires_at < pg_catalog.now();

-- ============================================================
-- 2. fn_accept_invitation — now checks expires_at
-- ============================================================

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

    -- NEW: explicit expiration check before status check, so the user gets a clearer message
    IF v_invitation.status = 'pending' AND v_invitation.expires_at < pg_catalog.now() THEN
        UPDATE public.org_invitations SET status = 'expired' WHERE id = v_invitation.id;
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'EXPIRED', 'message', 'Esta invitación expiró. Pide al administrador que te envíe una nueva.');
    END IF;

    IF v_invitation.status != 'pending' THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'EXPIRED_OR_PROCESSED', 'message', 'Esta invitación ya fue procesada o está expirada.');
    END IF;

    INSERT INTO public.org_members (org_id, user_id, role)
    VALUES (v_invitation.org_id, p_user_id, v_invitation.role::text::public.user_role)
    RETURNING id INTO v_member_id;

    UPDATE public.org_invitations SET status = 'accepted', accepted_at = pg_catalog.now() WHERE id = v_invitation.id;

    INSERT INTO public.audit_log (org_id, table_name, record_id, operation, performed_by, new_data)
    VALUES (v_invitation.org_id, 'org_members', v_member_id, 'INSERT', p_user_id,
        pg_catalog.jsonb_build_object('user_id', p_user_id, 'role', v_invitation.role, 'origin', 'invitation_token'));

    RETURN pg_catalog.jsonb_build_object('success', true, 'code', 'ACCEPTED', 'organization_id', v_invitation.org_id, 'role', v_invitation.role, 'message', 'Te has unido exitosamente.');
END;
$$;

REVOKE ALL ON FUNCTION public.fn_accept_invitation(text, uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_accept_invitation(text, uuid, text) TO service_role;

-- ============================================================
-- 3. fn_expire_old_invitations — sweep helper
-- ============================================================
-- Bulk-flips status to 'expired' for any pending invitation past its expires_at.
-- Returns the number of rows updated. Safe to call repeatedly.

CREATE OR REPLACE FUNCTION public.fn_expire_old_invitations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_count integer;
BEGIN
    UPDATE public.org_invitations
    SET status = 'expired'
    WHERE status = 'pending'
      AND expires_at < pg_catalog.now();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_expire_old_invitations() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_expire_old_invitations() TO service_role;
