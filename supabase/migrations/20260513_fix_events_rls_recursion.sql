-- Fix: "infinite recursion detected in policy for relation events"
--
-- Cause: policy "Applicator can read events for assigned slots" used
--   id IN (SELECT event_id FROM event_slots ...)
-- while policy "Users can access event_slots for their org events" uses
--   event_id IN (SELECT id FROM events ...)
-- Evaluating events → event_slots → events → …
--
-- Fix: resolve applicator-visible event ids in a SECURITY DEFINER function
-- (bypasses RLS only inside the function body; still scoped by applicator link).

CREATE OR REPLACE FUNCTION public.fn_event_ids_visible_to_applicator(p_uid uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT s.event_id
  FROM public.event_slots s
  JOIN public.applicators a ON a.id = s.applicator_id
  WHERE a.auth_user_id IS NOT DISTINCT FROM p_uid
    AND a.deleted_at IS NULL
  UNION
  SELECT DISTINCT es.event_id
  FROM public.event_staff es
  JOIN public.applicators a ON a.id = es.applicator_id
  WHERE a.auth_user_id IS NOT DISTINCT FROM p_uid
    AND a.deleted_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.fn_event_ids_visible_to_applicator(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_event_ids_visible_to_applicator(uuid) TO authenticated;

DROP POLICY IF EXISTS "Applicator can read events for assigned slots" ON public.events;

CREATE POLICY "Applicator can read events for assigned slots"
  ON public.events FOR SELECT TO authenticated
  USING (id IN (SELECT public.fn_event_ids_visible_to_applicator(auth.uid())));

DROP POLICY IF EXISTS "Applicator can read sessions for assigned slots" ON public.event_sessions;

CREATE POLICY "Applicator can read sessions for assigned slots"
  ON public.event_sessions FOR SELECT TO authenticated
  USING (event_id IN (SELECT public.fn_event_ids_visible_to_applicator(auth.uid())));
