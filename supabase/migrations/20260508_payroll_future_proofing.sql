-- Add type to entries to distinguish between operational (events) and administrative (fixed salary)
ALTER TABLE public.payroll_entries 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'operational';

-- Add category to line items for finer grain reporting (session, bonus, base_salary, etc)
ALTER TABLE public.payroll_line_items 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'event_session';

-- Update the calculation RPC to include these defaults explicitly
CREATE OR REPLACE FUNCTION public.fn_calculate_payroll_for_period(p_period_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date date;
    v_end_date date;
    v_org_id uuid;
    v_items_count integer := 0;
BEGIN
    -- 1. Get period info
    SELECT start_date, end_date, org_id INTO v_start_date, v_end_date, v_org_id
    FROM payroll_periods WHERE id = p_period_id;

    -- 2. Clear existing items for this period to avoid duplicates on recalculation
    DELETE FROM payroll_line_items WHERE entry_id IN (
        SELECT id FROM payroll_entries WHERE period_id = p_period_id
    );
    DELETE FROM payroll_entries WHERE period_id = p_period_id;

    -- 3. Calculate and insert entries for each applicator with sessions in the period
    -- We use a CTE to aggregate session data per applicator
    INSERT INTO payroll_entries (period_id, org_id, applicator_id, applicator_name, hours_worked, slots_count, events_count, subtotal, total, status, type)
    SELECT 
        p_period_id,
        v_org_id,
        es.applicator_id,
        p.full_name,
        SUM(EXTRACT(EPOCH FROM (es.end_time - es.start_time)) / 3600), -- hours
        COUNT(es.id), -- slots/sessions
        COUNT(DISTINCT es.event_id), -- unique events
        0, -- subtotal (will be updated after line items)
        0, -- total (will be updated after line items)
        'pending',
        'operational' -- Future-proof type
    FROM event_staff es
    JOIN profiles p ON p.id = es.applicator_id
    WHERE es.org_id = v_org_id
      AND es.start_time::date >= v_start_date
      AND es.start_time::date <= v_end_date
      AND es.status = 'confirmed'
    GROUP BY es.applicator_id, p.full_name;

    -- 4. Insert detailed line items for each session
    INSERT INTO payroll_line_items (entry_id, event_id, org_id, role, hours, rate_per_hour, fixed_payment, category)
    SELECT 
        pe.id,
        es.event_id,
        v_org_id,
        es.role,
        EXTRACT(EPOCH FROM (es.end_time - es.start_time)) / 3600,
        COALESCE(es.rate_per_hour, 0),
        COALESCE(es.fixed_payment, 0),
        'event_session' -- Future-proof category
    FROM event_staff es
    JOIN payroll_entries pe ON pe.applicator_id = es.applicator_id AND pe.period_id = p_period_id
    WHERE es.org_id = v_org_id
      AND es.start_time::date >= v_start_date
      AND es.start_time::date <= v_end_date
      AND es.status = 'confirmed';

    GET DIAGNOSTICS v_items_count = ROW_COUNT;

    -- 5. Update parent entries with aggregated totals from line items
    UPDATE payroll_entries pe
    SET 
        subtotal = (SELECT SUM(total_amount) FROM payroll_line_items WHERE entry_id = pe.id),
        total = (SELECT SUM(total_amount) FROM payroll_line_items WHERE entry_id = pe.id)
    WHERE pe.period_id = p_period_id;

    -- 6. Update period total
    UPDATE payroll_periods
    SET total_amount = (SELECT SUM(total) FROM payroll_entries WHERE period_id = p_period_id),
        status = 'calculated'
    WHERE id = p_period_id;

    RETURN json_build_object(
        'status', 'success',
        'items_calculated', v_items_count,
        'period_id', p_period_id
    );
END;
$$;
