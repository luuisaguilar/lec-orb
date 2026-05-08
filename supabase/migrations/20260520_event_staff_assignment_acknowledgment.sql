-- Migration: 20260520_event_staff_assignment_acknowledgment.sql
-- Applicator acceptance flow for event_staff assignments (portal + publish gate).

-- 1) Columns on event_staff (separate from payroll-oriented "status" column if present)
ALTER TABLE public.event_staff
  ADD COLUMN IF NOT EXISTS acknowledgment_status text;

ALTER TABLE public.event_staff
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz;

-- Legacy rows: treat as already committed operationally
UPDATE public.event_staff
SET
  acknowledgment_status = 'accepted',
  acknowledged_at = COALESCE(acknowledged_at, updated_at, created_at, now())
WHERE acknowledgment_status IS NULL;

ALTER TABLE public.event_staff
  ALTER COLUMN acknowledgment_status SET DEFAULT 'pending';

ALTER TABLE public.event_staff
  ALTER COLUMN acknowledgment_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'event_staff_acknowledgment_status_chk'
  ) THEN
    ALTER TABLE public.event_staff
      ADD CONSTRAINT event_staff_acknowledgment_status_chk
      CHECK (acknowledgment_status IN ('pending', 'accepted', 'declined'));
  END IF;
END $$;

-- 2) RLS: applicators read their own event_staff rows (portal assignments list)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'event_staff'
      AND policyname = 'Applicator can read own event_staff'
  ) THEN
    CREATE POLICY "Applicator can read own event_staff"
      ON public.event_staff FOR SELECT TO authenticated
      USING (
        applicator_id IN (
          SELECT id FROM public.applicators
          WHERE auth_user_id = auth.uid() AND deleted_at IS NULL
        )
      );
  END IF;
END $$;

-- 3) Read events/sessions tied to staffing (before timetable slots exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'events'
      AND policyname = 'Applicator can read events via event_staff'
  ) THEN
    CREATE POLICY "Applicator can read events via event_staff"
      ON public.events FOR SELECT TO authenticated
      USING (
        id IN (
          SELECT es.event_id FROM public.event_staff es
          JOIN public.applicators a ON a.id = es.applicator_id
          WHERE a.auth_user_id = auth.uid() AND a.deleted_at IS NULL
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'event_sessions'
      AND policyname = 'Applicator can read sessions via event_staff'
  ) THEN
    CREATE POLICY "Applicator can read sessions via event_staff"
      ON public.event_sessions FOR SELECT TO authenticated
      USING (
        event_id IN (
          SELECT es.event_id FROM public.event_staff es
          JOIN public.applicators a ON a.id = es.applicator_id
          WHERE a.auth_user_id = auth.uid() AND a.deleted_at IS NULL
        )
      );
  END IF;
END $$;

-- 4) RPC: applicant accepts/declines only while pending (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.fn_ack_event_staff_assignment(
  p_staff_id uuid,
  p_action text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff public.event_staff%ROWTYPE;
  v_app_id uuid;
  v_action text;
BEGIN
  v_action := lower(trim(coalesce(p_action, '')));

  SELECT a.id INTO v_app_id
  FROM public.applicators a
  WHERE a.auth_user_id = auth.uid()
    AND a.deleted_at IS NULL
  LIMIT 1;

  IF v_app_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'code', 'NOT_APPLICATOR',
      'message', 'Usuario no vinculado a un aplicador.'
    );
  END IF;

  SELECT * INTO v_staff
  FROM public.event_staff
  WHERE id = p_staff_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'code', 'NOT_FOUND',
      'message', 'Asignación no encontrada.'
    );
  END IF;

  IF v_staff.applicator_id <> v_app_id THEN
    RETURN json_build_object(
      'success', false,
      'code', 'FORBIDDEN',
      'message', 'No tienes permiso para esta asignación.'
    );
  END IF;

  IF v_staff.acknowledgment_status <> 'pending' THEN
    RETURN json_build_object(
      'success', false,
      'code', 'NOT_PENDING',
      'message', 'Esta asignación ya fue respondida.',
      'current', v_staff.acknowledgment_status
    );
  END IF;

  IF v_action = 'accept' THEN
    UPDATE public.event_staff
    SET
      acknowledgment_status = 'accepted',
      acknowledged_at = now(),
      updated_at = now()
    WHERE id = p_staff_id;
    RETURN json_build_object('success', true, 'acknowledgment_status', 'accepted');
  ELSIF v_action = 'decline' THEN
    UPDATE public.event_staff
    SET
      acknowledgment_status = 'declined',
      acknowledged_at = now(),
      updated_at = now()
    WHERE id = p_staff_id;
    RETURN json_build_object('success', true, 'acknowledgment_status', 'declined');
  END IF;

  RETURN json_build_object(
    'success', false,
    'code', 'INVALID_ACTION',
    'message', 'Acción inválida. Usa accept o decline.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_ack_event_staff_assignment(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_ack_event_staff_assignment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_ack_event_staff_assignment(uuid, text) TO service_role;
