-- Migration: Add missing component and date columns to event_slots

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='event_slots' AND column_name='component') THEN
        ALTER TABLE event_slots ADD COLUMN component TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='event_slots' AND column_name='date') THEN
        ALTER TABLE event_slots ADD COLUMN date DATE;
    END IF;
END $$;
