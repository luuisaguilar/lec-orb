-- Migration: 20260514_sgc_security_hardening_delta.sql
-- Description: Hardens SGC RLS after stabilization migrations without rewriting history.

-- 1) Restore audit manager FK consistency with auth.users.
DO $$
BEGIN
    IF to_regclass('public.sgc_audits') IS NOT NULL THEN
        ALTER TABLE public.sgc_audits
            DROP CONSTRAINT IF EXISTS sgc_audits_audit_manager_id_fkey,
            ADD CONSTRAINT sgc_audits_audit_manager_id_fkey
            FOREIGN KEY (audit_manager_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2) Remove overly-broad ALL-access policies introduced in stabilization.
DO $$
DECLARE
    tbl TEXT;
    sgc_tables TEXT[] := ARRAY[
        'sgc_nc_stages',
        'sgc_action_stages',
        'sgc_nc_severities',
        'sgc_nc_origins',
        'sgc_nc_causes',
        'sgc_actions',
        'sgc_nonconformities',
        'sgc_nonconformity_actions',
        'sgc_nonconformity_origins',
        'sgc_nonconformity_causes',
        'sgc_audits',
        'sgc_audit_auditors',
        'sgc_audit_auditees',
        'sgc_audit_checks',
        'sgc_audit_nonconformities',
        'sgc_audit_improvement_actions',
        'sgc_audit_cars',
        'sgc_reviews',
        'sgc_review_participants',
        'sgc_review_items'
    ];
BEGIN
    FOREACH tbl IN ARRAY sgc_tables LOOP
        IF to_regclass('public.' || tbl) IS NULL THEN
            CONTINUE;
        END IF;

        EXECUTE format('DROP POLICY IF EXISTS "%s_access" ON public.%I', tbl, tbl);
    END LOOP;
END $$;

-- 3) Reassert strict SGC policies:
--    - SELECT: any org member
--    - INSERT/UPDATE/DELETE: admin or supervisor only
DO $$
DECLARE
    tbl TEXT;
    sgc_tables TEXT[] := ARRAY[
        'sgc_nc_stages',
        'sgc_action_stages',
        'sgc_nc_severities',
        'sgc_nc_origins',
        'sgc_nc_causes',
        'sgc_actions',
        'sgc_nonconformities',
        'sgc_nonconformity_actions',
        'sgc_nonconformity_origins',
        'sgc_nonconformity_causes',
        'sgc_audits',
        'sgc_audit_auditors',
        'sgc_audit_auditees',
        'sgc_audit_checks',
        'sgc_audit_nonconformities',
        'sgc_audit_improvement_actions',
        'sgc_audit_cars',
        'sgc_reviews',
        'sgc_review_participants',
        'sgc_review_items'
    ];
BEGIN
    FOREACH tbl IN ARRAY sgc_tables LOOP
        IF to_regclass('public.' || tbl) IS NULL THEN
            CONTINUE;
        END IF;

        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

        EXECUTE format('DROP POLICY IF EXISTS "%s: org members select" ON public.%I', tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "%s: org members select" ON public.%I FOR SELECT TO authenticated
             USING (
                org_id IN (
                    SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
                )
             )',
            tbl, tbl
        );

        EXECUTE format('DROP POLICY IF EXISTS "%s: admin-supervisor insert" ON public.%I', tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "%s: admin-supervisor insert" ON public.%I FOR INSERT TO authenticated
             WITH CHECK (
                org_id IN (
                    SELECT org_id FROM public.org_members
                    WHERE user_id = auth.uid() AND role::TEXT IN (''admin'', ''supervisor'')
                )
             )',
            tbl, tbl
        );

        EXECUTE format('DROP POLICY IF EXISTS "%s: admin-supervisor update" ON public.%I', tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "%s: admin-supervisor update" ON public.%I FOR UPDATE TO authenticated
             USING (
                org_id IN (
                    SELECT org_id FROM public.org_members
                    WHERE user_id = auth.uid() AND role::TEXT IN (''admin'', ''supervisor'')
                )
             )
             WITH CHECK (
                org_id IN (
                    SELECT org_id FROM public.org_members
                    WHERE user_id = auth.uid() AND role::TEXT IN (''admin'', ''supervisor'')
                )
             )',
            tbl, tbl
        );

        EXECUTE format('DROP POLICY IF EXISTS "%s: admin-supervisor delete" ON public.%I', tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "%s: admin-supervisor delete" ON public.%I FOR DELETE TO authenticated
             USING (
                org_id IN (
                    SELECT org_id FROM public.org_members
                    WHERE user_id = auth.uid() AND role::TEXT IN (''admin'', ''supervisor'')
                )
             )',
            tbl, tbl
        );
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
