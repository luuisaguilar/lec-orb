-- One-time backfill: events strictly before 2026-05-10 are treated as closed ("hechos")
-- and operational rows are aligned to "confirmed" for payroll / planner consistency.
--
-- Rules:
-- - events: set status = 'COMPLETED' where date < 2026-05-10 and event is not cancelled (schema CHECK uses uppercase).
-- - event_slots: non-break rows with applicator_id → status = 'CONFIRMED' (CHECK allows only PENDING | CONFIRMED).
-- - event_staff: rows tied to those events → status = 'confirmed' (payroll column default is lowercase; no slot CHECK).
--
-- Apply on staging first; take a backup before running on production.

-- 1) Slots (payroll matches via LOWER(status) = 'confirmed'; DB stores CONFIRMED)
UPDATE public.event_slots s
SET
  status = 'CONFIRMED',
  updated_at = now()
FROM public.events e
WHERE e.id = s.event_id
  AND e.date::date < DATE '2026-05-10'
  AND COALESCE(s.is_break, false) = false
  AND s.applicator_id IS NOT NULL
  AND UPPER(COALESCE(e.status, '')) <> 'CANCELLED'
  AND UPPER(COALESCE(s.status, '')) <> 'CANCELLED';

-- 2) Staff assignments on the same events
UPDATE public.event_staff es
SET
  status = 'confirmed',
  updated_at = now()
FROM public.events e
WHERE e.id = es.event_id
  AND e.date::date < DATE '2026-05-10'
  AND UPPER(COALESCE(e.status, '')) <> 'CANCELLED'
  AND UPPER(COALESCE(es.status, '')) <> 'CANCELLED';

-- 3) Event header: mark as completed (past / cerrado)
UPDATE public.events e
SET
  status = 'COMPLETED',
  updated_at = now()
WHERE e.date::date < DATE '2026-05-10'
  AND UPPER(COALESCE(e.status, '')) <> 'CANCELLED'
  AND UPPER(COALESCE(e.status, '')) <> 'COMPLETED';
