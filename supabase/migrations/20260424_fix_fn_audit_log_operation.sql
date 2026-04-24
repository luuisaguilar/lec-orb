-- Migration: 20260424_fix_fn_audit_log_operation.sql
-- Fixes fn_audit_log trigger: audit_log has `operation NOT NULL` but trigger
-- was only populating legacy `action` column, causing all mutations on
-- org_members (and other audited tables) to fail with:
--   "null value in column 'operation' of relation 'audit_log' violates not-null constraint"
--
-- Fix: populate both `operation` (required) and `action` (legacy mirror),
-- plus both `changed_by`/`performed_by` and `changed_at`/`created_at`.

CREATE OR REPLACE FUNCTION public.fn_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_record_id UUID;
    v_old_data JSONB;
    v_new_data JSONB;
    v_org_id UUID;
    v_actor UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_record_id := public.audit_log_uuid_or_null(to_jsonb(OLD) ->> 'id');
        v_old_data := to_jsonb(OLD);
        v_new_data := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        v_record_id := public.audit_log_uuid_or_null(to_jsonb(NEW) ->> 'id');
        v_old_data := NULL;
        v_new_data := to_jsonb(NEW);
    ELSE
        v_record_id := public.audit_log_uuid_or_null(to_jsonb(NEW) ->> 'id');
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
    END IF;

    v_org_id := public.audit_log_resolve_org_id(TG_TABLE_NAME, v_old_data, v_new_data);

    -- Tenant-facing audit feed only includes events whose org_id can be derived safely.
    IF v_org_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- auth.uid() is null when called from SECURITY DEFINER RPCs (e.g. fn_accept_invitation);
    -- fall back to the new_data.user_id / performed_by if available.
    v_actor := auth.uid();
    IF v_actor IS NULL THEN
        v_actor := public.audit_log_uuid_or_null(
            COALESCE(v_new_data ->> 'user_id', v_new_data ->> 'performed_by')
        );
    END IF;

    INSERT INTO public.audit_log (
        org_id,
        table_name,
        record_id,
        operation,
        action,
        old_data,
        new_data,
        changed_by,
        performed_by,
        changed_at,
        created_at
    )
    VALUES (
        v_org_id,
        TG_TABLE_NAME,
        v_record_id,
        TG_OP,
        TG_OP,
        v_old_data,
        v_new_data,
        v_actor,
        v_actor,
        now(),
        now()
    );

    RETURN COALESCE(NEW, OLD);
END;
$function$;
