-- SQL Migration: Add operating hours to schools and create event_sessions table

-- 1. Add operating_hours to schools if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='schools' AND column_name='operating_hours') THEN
        ALTER TABLE schools ADD COLUMN operating_hours JSONB DEFAULT '{"open": "07:00", "close": "15:00"}'::jsonb;
    END IF;
END $$;

-- 2. Create the event_sessions table to support Multi-Exam paradigm
CREATE TABLE IF NOT EXISTS event_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    exam_type TEXT NOT NULL,
    date DATE NOT NULL,
    parameters JSONB DEFAULT '{}'::jsonb,
    component_order JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS on the new table
ALTER TABLE event_sessions ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for event_sessions
-- We map access through the parent event's org_id
CREATE POLICY "Users can view sessions of their org's events" 
    ON event_sessions FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM events e
            JOIN org_members om ON e.org_id = om.org_id
            WHERE e.id = event_sessions.event_id
            AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert sessions to their org's events" 
    ON event_sessions FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM events e
            JOIN org_members om ON e.org_id = om.org_id
            WHERE e.id = event_sessions.event_id
            AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update sessions of their org's events" 
    ON event_sessions FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM events e
            JOIN org_members om ON e.org_id = om.org_id
            WHERE e.id = event_sessions.event_id
            AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete sessions of their org's events" 
    ON event_sessions FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM events e
            JOIN org_members om ON e.org_id = om.org_id
            WHERE e.id = event_sessions.event_id
            AND om.user_id = auth.uid()
        )
    );

-- 5. Data Migration (Optional but Recommended)
-- Migrate existing events data into event_sessions so we don't lose the currently planned events
INSERT INTO event_sessions (event_id, exam_type, date, parameters)
SELECT id, exam_type, date, parameters
FROM events
WHERE id NOT IN (SELECT event_id FROM event_sessions);
