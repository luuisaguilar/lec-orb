-- =============================================================================
-- Audit Log: Full-Platform Change History
-- =============================================================================

-- 1. Create the audit_log table (drop first if partial from a previous attempt)
DROP TABLE IF EXISTS public.audit_log CASCADE;
CREATE TABLE public.audit_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name  TEXT NOT NULL,
    record_id   UUID,
    operation   TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    changed_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    old_data    JSONB,
    new_data    JSONB
);

-- Index for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name  ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id   ON public.audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by  ON public.audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at  ON public.audit_log(changed_at DESC);

-- RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read audit log"
    ON public.audit_log FOR SELECT
    USING (auth.role() = 'authenticated');

-- 2. Generic trigger function
CREATE OR REPLACE FUNCTION public.fn_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    _record_id UUID;
    _old_data  JSONB;
    _new_data  JSONB;
BEGIN
    IF TG_OP = 'DELETE' THEN
        _record_id := (OLD.id)::UUID;
        _old_data  := row_to_json(OLD)::JSONB;
        _new_data  := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        _record_id := (NEW.id)::UUID;
        _old_data  := NULL;
        _new_data  := row_to_json(NEW)::JSONB;
    ELSE -- UPDATE
        _record_id := (NEW.id)::UUID;
        _old_data  := row_to_json(OLD)::JSONB;
        _new_data  := row_to_json(NEW)::JSONB;
    END IF;

    INSERT INTO public.audit_log (table_name, record_id, operation, changed_by, old_data, new_data)
    VALUES (
        TG_TABLE_NAME,
        _record_id,
        TG_OP,
        auth.uid(),
        _old_data,
        _new_data
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach trigger to all main tables
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'events',
        'event_sessions',
        'event_staff',
        'event_slots',
        'schools',
        'applicators',
        'cenni_registros',
        'speaking_packs',
        'payroll_periods'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        -- Only process tables that actually exist (skip missing ones safely)
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = tbl
        ) THEN
            EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', tbl, tbl);
            EXECUTE format(
                'CREATE TRIGGER trg_audit_%I
                 AFTER INSERT OR UPDATE OR DELETE ON public.%I
                 FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log()',
                tbl, tbl
            );
        END IF;
    END LOOP;
END;
$$;
