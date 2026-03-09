-- SQL Migration: Add classroom tracking to events

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS classrooms_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS classroom_distribution TEXT DEFAULT '';

ALTER TABLE event_slots
ADD COLUMN IF NOT EXISTS date DATE;
