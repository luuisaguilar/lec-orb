-- Align audit_log to the canonical multi-tenant contract used by the app:
--   org_id, table_name, record_id, action, performed_by, created_at, old_data, new_data
-- This migration is intentionally non-destructive and leaves legacy columns in place
-- for temporary compatibility during rollout.

CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    record_id UUID,
    action TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log
    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS action TEXT,
    ADD COLUMN IF NOT EXISTS performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE OR REPLACE FUNCTION public.audit_log_uuid_or_null(p_value TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF p_value IS NULL OR btrim(p_value) = '' THEN
        RETURN NULL;
    END IF;

    IF p_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
        RETURN p_value::UUID;
    END IF;

    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_log_resolve_org_id(
    p_table_name TEXT,
    p_old_data JSONB DEFAULT NULL,
    p_new_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_row JSONB := COALESCE(p_new_data, p_old_data);
    v_org_id UUID;
    v_event_id UUID;
    v_school_id UUID;
BEGIN
    IF v_row IS NULL THEN
        RETURN NULL;
    END IF;

    v_org_id := public.audit_log_uuid_or_null(v_row ->> 'org_id');
    IF v_org_id IS NOT NULL THEN
        RETURN v_org_id;
    END IF;

    CASE p_table_name
        WHEN 'event_sessions', 'event_staff', 'event_slots' THEN
            v_event_id := public.audit_log_uuid_or_null(v_row ->> 'event_id');
            IF v_event_id IS NOT NULL THEN
                SELECT e.org_id
                INTO v_org_id
                FROM public.events e
                WHERE e.id = v_event_id;
                RETURN v_org_id;
            END IF;
        WHEN 'toefl_administrations' THEN
            v_school_id := public.audit_log_uuid_or_null(v_row ->> 'school_id');
            IF v_school_id IS NOT NULL THEN
                SELECT s.org_id
                INTO v_org_id
                FROM public.schools s
                WHERE s.id = v_school_id;
                RETURN v_org_id;
            END IF;
        WHEN 'rooms' THEN
            v_school_id := public.audit_log_uuid_or_null(v_row ->> 'school_id');
            IF v_school_id IS NOT NULL THEN
                SELECT s.org_id
                INTO v_org_id
                FROM public.schools s
                WHERE s.id = v_school_id;
                RETURN v_org_id;
            END IF;
        ELSE
            RETURN NULL;
    END CASE;

    RETURN NULL;
END;
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'audit_log'
          AND column_name = 'operation'
    ) THEN
        EXECUTE '
            UPDATE public.audit_log
            SET action = COALESCE(action, operation)
            WHERE action IS NULL
        ';
    END IF;
END
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'audit_log'
          AND column_name = 'changed_by'
    ) THEN
        EXECUTE '
            UPDATE public.audit_log
            SET performed_by = COALESCE(performed_by, changed_by)
            WHERE performed_by IS NULL
        ';
    END IF;
END
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'audit_log'
          AND column_name = 'changed_at'
    ) THEN
        EXECUTE '
            UPDATE public.audit_log
            SET created_at = COALESCE(created_at, changed_at)
            WHERE created_at IS NULL
        ';
    END IF;
END
$$;

UPDATE public.audit_log
SET org_id = public.audit_log_resolve_org_id(table_name, old_data, new_data)
WHERE org_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_org ON public.audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON public.audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by ON public.audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON public.audit_log(table_name);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read audit log" ON public.audit_log;
DROP POLICY IF EXISTS "Members can read audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "Members can insert audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "View belonging org audit logs" ON public.audit_log;

CREATE POLICY "Members can read audit_log"
    ON public.audit_log FOR SELECT
    TO authenticated
    USING (
        org_id IN (
            SELECT org_id
            FROM public.org_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Members can insert audit_log"
    ON public.audit_log FOR INSERT
    TO authenticated
    WITH CHECK (
        org_id IN (
            SELECT org_id
            FROM public.org_members
            WHERE user_id = auth.uid()
        )
    );

CREATE OR REPLACE FUNCTION public.fn_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_record_id UUID;
    v_old_data JSONB;
    v_new_data JSONB;
    v_org_id UUID;
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

    INSERT INTO public.audit_log (
        org_id,
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        performed_by,
        created_at
    )
    VALUES (
        v_org_id,
        TG_TABLE_NAME,
        v_record_id,
        TG_OP,
        v_old_data,
        v_new_data,
        auth.uid(),
        now()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;
