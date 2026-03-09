-- SQL Migration: Link existing slots and staff to sessions

-- 1. Add session_id to event_slots
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='event_slots' AND column_name='session_id') THEN
        ALTER TABLE event_slots ADD COLUMN session_id UUID REFERENCES event_sessions(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Add session_id to event_staff
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='event_staff' AND column_name='session_id') THEN
        ALTER TABLE event_staff ADD COLUMN session_id UUID REFERENCES event_sessions(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Backfill session_id for existing records
-- Assuming one session per event for legacy data
UPDATE event_slots 
SET session_id = (SELECT id FROM event_sessions WHERE event_id = event_slots.event_id LIMIT 1)
WHERE session_id IS NULL;

UPDATE event_staff 
SET session_id = (SELECT id FROM event_sessions WHERE event_id = event_staff.event_id LIMIT 1)
WHERE session_id IS NULL;
