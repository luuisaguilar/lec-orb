-- ================================================================
-- Fix event_staff UNIQUE constraint to allow same applicator
-- across multiple sessions of the same event.
-- Also add speaking_date to event_sessions.
-- ================================================================

-- 1. Drop the old unique constraint that prevents one applicator
--    being in multiple sessions of the same event
ALTER TABLE event_staff
    DROP CONSTRAINT IF EXISTS event_staff_event_id_applicator_id_key;

-- 2. Add a better constraint: one applicator per role per session
ALTER TABLE event_staff
    ADD CONSTRAINT event_staff_session_applicator_role_unique
    UNIQUE (session_id, applicator_id, role);

-- 3. Add speaking_date to event_sessions (nullable — defaults to exam date)
ALTER TABLE event_sessions
    ADD COLUMN IF NOT EXISTS speaking_date DATE;

-- Backfill: set speaking_date = date for existing sessions
UPDATE event_sessions SET speaking_date = date WHERE speaking_date IS NULL;
