-- Migration: 20260511_portal_applicator_rls.sql
-- Description: RLS policies so users linked via applicators.auth_user_id can read
--              their own portal data (schedules, payroll) without org_membership.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'applicators'
      AND policyname = 'Applicator can read own profile'
  ) THEN
    CREATE POLICY "Applicator can read own profile"
      ON public.applicators FOR SELECT TO authenticated
      USING (auth_user_id = auth.uid() AND deleted_at IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'schools'
      AND policyname = 'Applicator can read schools in own org'
  ) THEN
    CREATE POLICY "Applicator can read schools in own org"
      ON public.schools FOR SELECT TO authenticated
      USING (
        deleted_at IS NULL
        AND org_id IN (
          SELECT org_id FROM public.applicators
          WHERE auth_user_id = auth.uid() AND deleted_at IS NULL
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'events'
      AND policyname = 'Applicator can read events for assigned slots'
  ) THEN
    CREATE POLICY "Applicator can read events for assigned slots"
      ON public.events FOR SELECT TO authenticated
      USING (
        id IN (
          SELECT s.event_id FROM public.event_slots s
          JOIN public.applicators a ON a.id = s.applicator_id
          WHERE a.auth_user_id = auth.uid() AND a.deleted_at IS NULL
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'event_sessions'
      AND policyname = 'Applicator can read sessions for assigned slots'
  ) THEN
    CREATE POLICY "Applicator can read sessions for assigned slots"
      ON public.event_sessions FOR SELECT TO authenticated
      USING (
        event_id IN (
          SELECT s.event_id FROM public.event_slots s
          JOIN public.applicators a ON a.id = s.applicator_id
          WHERE a.auth_user_id = auth.uid() AND a.deleted_at IS NULL
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'event_slots'
      AND policyname = 'Applicator can read own event_slots'
  ) THEN
    CREATE POLICY "Applicator can read own event_slots"
      ON public.event_slots FOR SELECT TO authenticated
      USING (
        applicator_id IN (
          SELECT id FROM public.applicators
          WHERE auth_user_id = auth.uid() AND deleted_at IS NULL
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payroll_entries'
      AND policyname = 'Applicator can read own payroll_entries'
  ) THEN
    CREATE POLICY "Applicator can read own payroll_entries"
      ON public.payroll_entries FOR SELECT TO authenticated
      USING (
        applicator_id IN (
          SELECT id FROM public.applicators
          WHERE auth_user_id = auth.uid() AND deleted_at IS NULL
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payroll_line_items'
      AND policyname = 'Members can read payroll_line_items in org'
  ) THEN
    CREATE POLICY "Members can read payroll_line_items in org"
      ON public.payroll_line_items FOR SELECT TO authenticated
      USING (
        org_id IN (
          SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payroll_line_items'
      AND policyname = 'Applicator can read own payroll_line_items'
  ) THEN
    CREATE POLICY "Applicator can read own payroll_line_items"
      ON public.payroll_line_items FOR SELECT TO authenticated
      USING (
        entry_id IN (
          SELECT pe.id FROM public.payroll_entries pe
          JOIN public.applicators a ON a.id = pe.applicator_id
          WHERE a.auth_user_id = auth.uid() AND a.deleted_at IS NULL
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payroll_periods'
      AND policyname = 'Applicator can read payroll_periods for own entries'
  ) THEN
    CREATE POLICY "Applicator can read payroll_periods for own entries"
      ON public.payroll_periods FOR SELECT TO authenticated
      USING (
        id IN (
          SELECT pe.period_id FROM public.payroll_entries pe
          JOIN public.applicators a ON a.id = pe.applicator_id
          WHERE a.auth_user_id = auth.uid() AND a.deleted_at IS NULL
        )
      );
  END IF;
END $$;
