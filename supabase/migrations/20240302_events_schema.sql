-- Events Module Schema (Logistics & Timetable)

-- 0. Ensure updated_at trigger function exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';
-- 1. Create events table
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    exam_type TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED')),
    parameters JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create event_staff table
CREATE TABLE IF NOT EXISTS public.event_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    applicator_id UUID NOT NULL REFERENCES public.applicators(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('EVALUATOR', 'INVIGILATOR', 'SUPERVISOR', 'ADMIN', 'REMOTE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(event_id, applicator_id)
);

-- 3. Create event_slots table (The Timetable)
CREATE TABLE IF NOT EXISTS public.event_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    slot_number INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    candidates TEXT[] DEFAULT '{}',
    applicator_id UUID REFERENCES public.applicators(id) ON DELETE SET NULL,
    is_break BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(event_id, slot_number)
);

-- Add RLS Policies
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_slots ENABLE ROW LEVEL SECURITY;

-- Set up auto-updating updated_at trigger for events and slots
DROP TRIGGER IF EXISTS set_events_updated_at ON public.events;
CREATE TRIGGER set_events_updated_at 
BEFORE UPDATE ON public.events 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_event_slots_updated_at ON public.event_slots;
CREATE TRIGGER set_event_slots_updated_at 
BEFORE UPDATE ON public.event_slots 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add RLS policies for members of the organization
CREATE POLICY "Users can view events in their org" ON public.events
    FOR SELECT USING (auth.uid() IN (SELECT user_id FROM org_members WHERE org_id = events.org_id));

CREATE POLICY "Users can insert events in their org" ON public.events
    FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM org_members WHERE org_id = events.org_id));

CREATE POLICY "Users can update events in their org" ON public.events
    FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM org_members WHERE org_id = events.org_id));

CREATE POLICY "Users can delete events in their org" ON public.events
    FOR DELETE USING (auth.uid() IN (SELECT user_id FROM org_members WHERE org_id = events.org_id));

-- Event Staff inherits access from Event
CREATE POLICY "Users can access event_staff for their org events" ON public.event_staff
    FOR ALL USING (
        event_id IN (
            SELECT id FROM events WHERE org_id IN (
                SELECT org_id FROM org_members WHERE user_id = auth.uid()
            )
        )
    );

-- Event Slots inherits access from Event
CREATE POLICY "Users can access event_slots for their org events" ON public.event_slots
    FOR ALL USING (
        event_id IN (
            SELECT id FROM events WHERE org_id IN (
                SELECT org_id FROM org_members WHERE user_id = auth.uid()
            )
        )
    );

-- Ensure postgrest cache reloads immediately for the application
NOTIFY pgrst, 'reload schema';
