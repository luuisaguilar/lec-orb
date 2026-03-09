-- =============================================================================
-- Audit Log Expansion
-- =============================================================================
-- This migration ensures that the existing `fn_audit_log()` trigger is attached
-- to all recently created tables so their SELECT/UPDATE/DELETE events are logged.

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'quotes',
        'purchase_orders',
        'payment_concepts',
        'payments',
        'toefl_codes',
        'toefl_administrations',
        'org_members',
        'role_permissions'
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
