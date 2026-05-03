-- Migration: 20260507_payroll_dynamic_calculation.sql
-- Description: Phase 3 - Payroll Calculation Logic (Compatible with Event Slots Schema)

-- 0. Ensure payroll_entries exists (Guard)
CREATE TABLE IF NOT EXISTS public.payroll_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  applicator_id uuid NOT NULL REFERENCES public.applicators(id) ON DELETE CASCADE,
  applicator_name text NOT NULL,
  hours_worked numeric(10, 2) NOT NULL DEFAULT 0,
  rate_per_hour numeric(10, 2) NOT NULL,
  events_count integer NOT NULL DEFAULT 0,
  slots_count integer NOT NULL DEFAULT 0,
  subtotal numeric(12, 2) GENERATED ALWAYS AS (hours_worked * rate_per_hour) STORED,
  adjustments numeric(12, 2) NOT NULL DEFAULT 0,
  total numeric(12, 2) GENERATED ALWAYS AS ((hours_worked * rate_per_hour) + adjustments) STORED,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, paid
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(period_id, applicator_id)
);

-- 1. Create payroll_line_items for detailed breakdown
CREATE TABLE IF NOT EXISTS public.payroll_line_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    entry_id uuid NOT NULL REFERENCES public.payroll_entries(id) ON DELETE CASCADE,
    event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
    event_name text,
    role text, -- SE, ADMIN, INVIGILATOR, SUPER
    hours numeric(10, 2) NOT NULL DEFAULT 0,
    rate numeric(10, 2) NOT NULL DEFAULT 0,
    fixed_payment numeric(10, 2) NOT NULL DEFAULT 0,
    total_amount numeric(12, 2) NOT NULL DEFAULT 0,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_line_items ENABLE ROW LEVEL SECURITY;

-- 2. RPC: fn_calculate_payroll_for_period (Compatible Version)
CREATE OR REPLACE FUNCTION public.fn_calculate_payroll_for_period(p_period_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_period RECORD;
    v_entry_id uuid;
    v_item_count integer := 0;
    v_applicator RECORD;
    v_event RECORD;
    v_hours numeric;
    v_rate numeric;
    v_fixed numeric;
    v_total numeric;
BEGIN
    -- 1. Get period details
    SELECT * INTO v_period FROM public.payroll_periods WHERE id = p_period_id;
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Period not found');
    END IF;

    -- 2. Clear existing entries and items
    DELETE FROM public.payroll_line_items WHERE entry_id IN (
        SELECT id FROM public.payroll_entries WHERE period_id = p_period_id
    );
    DELETE FROM public.payroll_entries WHERE period_id = p_period_id;

    -- 3. Find all applicators who worked in the period's date range
    -- We look into event_slots assigned and confirmed
    FOR v_applicator IN 
        SELECT DISTINCT a.id, a.name, a.rate_per_hour
        FROM public.applicators a
        JOIN public.event_slots s ON s.applicator_id = a.id
        JOIN public.events e ON s.event_id = e.id
        WHERE e.date::date BETWEEN v_period.start_date AND v_period.end_date
          AND e.org_id = v_period.org_id
          AND s.status = 'CONFIRMED'
    LOOP
        -- Create the main payroll entry
        INSERT INTO public.payroll_entries (
            org_id, period_id, applicator_id, applicator_name,
            hours_worked, rate_per_hour, status
        ) VALUES (
            v_period.org_id, p_period_id, v_applicator.id, v_applicator.name,
            0, COALESCE(v_applicator.rate_per_hour, 0), 'pending'
        ) RETURNING id INTO v_entry_id;

        -- 4. Calculate items per event
        FOR v_event IN
            SELECT 
                e.id, 
                e.title as name,
                es.role,
                COALESCE(es.hourly_rate, v_applicator.rate_per_hour, 0) as event_rate,
                COALESCE(es.fixed_payment, 0) as fixed_payment,
                SUM(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600.0) as total_hours
            FROM public.events e
            JOIN public.event_slots s ON s.event_id = e.id
            LEFT JOIN public.event_staff es ON es.event_id = e.id AND es.applicator_id = v_applicator.id
            WHERE e.date::date BETWEEN v_period.start_date AND v_period.end_date
              AND s.applicator_id = v_applicator.id
              AND s.status = 'CONFIRMED'
            GROUP BY e.id, e.title, es.role, es.hourly_rate, es.fixed_payment
        LOOP
            v_hours := v_event.total_hours;
            v_rate := v_event.event_rate;
            v_fixed := v_event.fixed_payment;
            v_total := (v_hours * v_rate) + v_fixed;

            INSERT INTO public.payroll_line_items (
                org_id, entry_id, event_id, event_name,
                role, hours, rate, fixed_payment, total_amount
            ) VALUES (
                v_period.org_id, v_entry_id, v_event.id, v_event.name,
                v_event.role, v_hours, v_rate, v_fixed, v_total
            );

            v_item_count := v_item_count + 1;
        END LOOP;

        -- 5. Update main entry totals
        UPDATE public.payroll_entries SET
            hours_worked = COALESCE((SELECT SUM(hours) FROM public.payroll_line_items WHERE entry_id = v_entry_id), 0),
            events_count = COALESCE((SELECT COUNT(DISTINCT event_id) FROM public.payroll_line_items WHERE entry_id = v_entry_id), 0),
            slots_count = (
                SELECT COUNT(*) FROM public.event_slots s
                JOIN public.events e ON s.event_id = e.id
                WHERE e.date::date BETWEEN v_period.start_date AND v_period.end_date
                  AND s.applicator_id = v_applicator.id
                  AND s.status = 'CONFIRMED'
            )
        WHERE id = v_entry_id;
    END LOOP;

    -- Update period total amount
    UPDATE public.payroll_periods SET
        total_amount = COALESCE((SELECT SUM(total) FROM public.payroll_entries WHERE period_id = p_period_id), 0),
        status = 'calculated',
        updated_at = now()
    WHERE id = p_period_id;

    RETURN json_build_object(
        'status', 'success',
        'items_calculated', v_item_count,
        'period_id', p_period_id
    );
END;
$$;
