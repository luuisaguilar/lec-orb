-- Migration: 20260505_hr_profiles_rls_guard.sql
-- Description: Re-enables RLS on hr_profiles and guarantees required policies exist.

ALTER TABLE public.hr_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'hr_profiles'
          AND policyname = 'hr_profiles_select'
    ) THEN
        CREATE POLICY "hr_profiles_select"
        ON public.hr_profiles FOR SELECT TO authenticated
        USING (
            org_id IN (
                SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'hr_profiles'
          AND policyname = 'hr_profiles_insert'
    ) THEN
        CREATE POLICY "hr_profiles_insert"
        ON public.hr_profiles FOR INSERT TO authenticated
        WITH CHECK (
            org_id IN (
                SELECT org_id
                FROM public.org_members
                WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'hr_profiles'
          AND policyname = 'hr_profiles_update'
    ) THEN
        CREATE POLICY "hr_profiles_update"
        ON public.hr_profiles FOR UPDATE TO authenticated
        USING (
            org_id IN (
                SELECT org_id
                FROM public.org_members
                WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'hr_profiles'
          AND policyname = 'hr_profiles_delete'
    ) THEN
        CREATE POLICY "hr_profiles_delete"
        ON public.hr_profiles FOR DELETE TO authenticated
        USING (
            org_id IN (
                SELECT org_id
                FROM public.org_members
                WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
            )
        );
    END IF;
END
$$;
