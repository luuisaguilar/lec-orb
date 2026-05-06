-- Fix payroll calculation RPC alignment with real schema:
-- - payroll_line_items uses column "rate" (not rate_per_hour) and needs total_amount set on insert
-- - payroll_entries.subtotal/total must not be GENERATED if the RPC updates them from line items
-- - event_staff.applicator_id references applicators, not profiles
--
-- Prerequisites (same as 20260508 payroll path): event_staff rows used for payroll must have
-- start_time, end_time, rate_per_hour (or rely on COALESCE with applicators.rate_per_hour below),
-- and status comparable to 'confirmed'.

-- 1) Drop generation from subtotal/total when they are stored generated columns (PostgreSQL 15+).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'payroll_entries'
      AND a.attname = 'subtotal'
      AND NOT a.attisdropped
      AND a.attgenerated = 's'
  ) THEN
    ALTER TABLE public.payroll_entries ALTER COLUMN subtotal DROP EXPRESSION;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'payroll_entries'
      AND a.attname = 'total'
      AND NOT a.attisdropped
      AND a.attgenerated = 's'
  ) THEN
    ALTER TABLE public.payroll_entries ALTER COLUMN total DROP EXPRESSION;
  END IF;
END $$;

-- 2) Replace payroll calculation function
CREATE OR REPLACE FUNCTION public.fn_calculate_payroll_for_period(p_period_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_start_date date;
    v_end_date date;
    v_org_id uuid;
    v_items_count integer := 0;
BEGIN
    SELECT start_date, end_date, org_id
    INTO v_start_date, v_end_date, v_org_id
    FROM payroll_periods
    WHERE id = p_period_id;

    IF v_org_id IS NULL THEN
        RETURN json_build_object('error', 'Period not found', 'period_id', p_period_id);
    END IF;

    DELETE FROM payroll_line_items
    WHERE entry_id IN (SELECT id FROM payroll_entries WHERE period_id = p_period_id);

    DELETE FROM payroll_entries WHERE period_id = p_period_id;

    INSERT INTO payroll_entries (
        period_id,
        org_id,
        applicator_id,
        applicator_name,
        hours_worked,
        rate_per_hour,
        slots_count,
        events_count,
        subtotal,
        total,
        status,
        type
    )
    SELECT
        p_period_id,
        v_org_id,
        es.applicator_id,
        COALESCE(MAX(a.name), 'Unknown'),
        SUM(
            COALESCE(
                EXTRACT(EPOCH FROM (es.end_time - es.start_time)) / 3600,
                0
            )
        ),
        0,
        COUNT(es.id),
        COUNT(DISTINCT es.event_id),
        0,
        0,
        'pending',
        'operational'
    FROM event_staff es
    JOIN applicators a ON a.id = es.applicator_id
    WHERE es.org_id = v_org_id
      AND es.start_time::date >= v_start_date
      AND es.start_time::date <= v_end_date
      AND LOWER(COALESCE(es.status, '')) = 'confirmed'
    GROUP BY es.applicator_id;

    INSERT INTO payroll_line_items (
        entry_id,
        event_id,
        org_id,
        event_name,
        role,
        hours,
        rate,
        fixed_payment,
        total_amount,
        category
    )
    SELECT
        pe.id,
        es.event_id,
        v_org_id,
        ev.title,
        es.role,
        COALESCE(EXTRACT(EPOCH FROM (es.end_time - es.start_time)) / 3600, 0),
        COALESCE(es.rate_per_hour, a.rate_per_hour, 0),
        COALESCE(es.fixed_payment, 0),
        (
            COALESCE(EXTRACT(EPOCH FROM (es.end_time - es.start_time)) / 3600, 0)
            * COALESCE(es.rate_per_hour, a.rate_per_hour, 0)
        ) + COALESCE(es.fixed_payment, 0),
        'event_session'
    FROM event_staff es
    JOIN applicators a ON a.id = es.applicator_id
    JOIN payroll_entries pe
        ON pe.applicator_id = es.applicator_id
        AND pe.period_id = p_period_id
    LEFT JOIN events ev ON ev.id = es.event_id
    WHERE es.org_id = v_org_id
      AND es.start_time::date >= v_start_date
      AND es.start_time::date <= v_end_date
      AND LOWER(COALESCE(es.status, '')) = 'confirmed';

    GET DIAGNOSTICS v_items_count = ROW_COUNT;

    UPDATE payroll_entries pe
    SET
        subtotal = COALESCE((
            SELECT SUM(li.total_amount)
            FROM payroll_line_items li
            WHERE li.entry_id = pe.id
        ), 0),
        total = COALESCE((
            SELECT SUM(li.total_amount)
            FROM payroll_line_items li
            WHERE li.entry_id = pe.id
        ), 0) + COALESCE(pe.adjustments, 0)
    WHERE pe.period_id = p_period_id;

    UPDATE payroll_periods
    SET
        total_amount = COALESCE((
            SELECT SUM(pe2.total)
            FROM payroll_entries pe2
            WHERE pe2.period_id = p_period_id
        ), 0),
        status = 'calculated'
    WHERE id = p_period_id;

    RETURN json_build_object(
        'status', 'success',
        'items_calculated', v_items_count,
        'period_id', p_period_id
    );
END;
$$;
