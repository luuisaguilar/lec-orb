-- LEC Platform — Events / ExamFlow Migration
-- Tables: events, event_exams, slots

-- ============================================================
-- 1. EVENTS
-- ============================================================

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  event_date date NOT NULL,
  school_id uuid REFERENCES schools(id) ON DELETE SET NULL,
  school_name text,
  venue_notes text,
  status text NOT NULL DEFAULT 'draft', -- draft, confirmed, in_progress, completed, cancelled
  notes text,
  deleted_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_org ON events(org_id);
CREATE INDEX idx_events_date ON events(org_id, event_date);
CREATE INDEX idx_events_school ON events(school_id);

-- ============================================================
-- 2. EVENT_EXAMS (which exams are part of an event)
-- ============================================================

CREATE TABLE event_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  exam_catalog_id uuid REFERENCES exam_catalog(id) ON DELETE SET NULL,
  exam_name text NOT NULL,
  exam_code text,
  duration_minutes integer NOT NULL,
  students_per_session integer NOT NULL DEFAULT 1,
  total_students integer NOT NULL DEFAULT 0,
  start_time time,
  end_time time,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_exams_event ON event_exams(event_id);
CREATE INDEX idx_event_exams_org ON event_exams(org_id);

-- ============================================================
-- 3. SLOTS (individual exam sessions within an event_exam)
-- ============================================================

CREATE TABLE slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_exam_id uuid NOT NULL REFERENCES event_exams(id) ON DELETE CASCADE,
  slot_number integer NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  applicator_id uuid REFERENCES applicators(id) ON DELETE SET NULL,
  applicator_name text,
  room_name text,
  pack_id uuid REFERENCES packs(id) ON DELETE SET NULL,
  student_names text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'open', -- open, assigned, in_progress, completed
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_slots_event_exam ON slots(event_exam_id);
CREATE INDEX idx_slots_applicator ON slots(applicator_id);
CREATE INDEX idx_slots_org ON slots(org_id);

-- ============================================================
-- 4. RLS
-- ============================================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;

-- Events
CREATE POLICY "Members can read events" ON events FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()) AND deleted_at IS NULL);

CREATE POLICY "Supervisors can manage events" ON events FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')));

-- Event Exams
CREATE POLICY "Members can read event_exams" ON event_exams FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "Supervisors can manage event_exams" ON event_exams FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')));

-- Slots
CREATE POLICY "Members can read slots" ON slots FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "Supervisors can manage slots" ON slots FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')));

-- ============================================================
-- 5. RPC: generate_slots_for_event_exam
-- ============================================================

CREATE OR REPLACE FUNCTION generate_slots_for_event_exam(
  p_event_exam_id uuid,
  p_start_time time,
  p_duration_minutes integer,
  p_total_students integer,
  p_students_per_session integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_exam RECORD;
  v_slot_count integer;
  v_current_time time;
  v_i integer;
BEGIN
  SELECT * INTO v_event_exam FROM event_exams WHERE id = p_event_exam_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event exam not found'; END IF;

  -- Calculate number of slots needed
  v_slot_count := CEIL(p_total_students::float / p_students_per_session);
  v_current_time := p_start_time;

  -- Delete existing slots for this event_exam
  DELETE FROM slots WHERE event_exam_id = p_event_exam_id;

  -- Generate slots
  FOR v_i IN 1..v_slot_count LOOP
    INSERT INTO slots (
      org_id, event_exam_id, slot_number,
      start_time, end_time, status
    ) VALUES (
      v_event_exam.org_id, p_event_exam_id, v_i,
      v_current_time,
      v_current_time + (p_duration_minutes || ' minutes')::interval,
      'open'
    );
    v_current_time := v_current_time + (p_duration_minutes || ' minutes')::interval;
  END LOOP;

  -- Update event_exam times
  UPDATE event_exams SET
    start_time = p_start_time,
    end_time = v_current_time,
    total_students = p_total_students,
    updated_at = now()
  WHERE id = p_event_exam_id;

  RETURN v_slot_count;
END;
$$;
