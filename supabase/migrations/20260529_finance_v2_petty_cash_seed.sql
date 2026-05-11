-- Sprint A1: seed default petty cash funds + budget catalog from legacy global categories,
-- widen fund SELECT for org members (dropdown), and align balance RPC with V2.

BEGIN;

-- 1) Any org member can list funds in their org (custodian still required for non-admin inserts via existing policies).
DROP POLICY IF EXISTS "Funds: Select" ON public.petty_cash_funds;
CREATE POLICY "Funds: Select" ON public.petty_cash_funds
    FOR SELECT TO authenticated
    USING (
        org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
    );

-- 2) Balance = sum of current_balance for open funds in the fiscal year (V2).
CREATE OR REPLACE FUNCTION public.fn_petty_cash_balance(p_org_id UUID, p_year INT)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(SUM(f.current_balance), 0)::NUMERIC
    FROM public.petty_cash_funds f
    WHERE f.org_id = p_org_id
      AND f.fiscal_year = p_year
      AND f.status = 'open'::public.petty_cash_fund_status;
$$;

-- 3) Seed default fund + budget tree per org (idempotent).
DO $$
DECLARE
    r_org           RECORD;
    r_pc_cat        RECORD;
    v_admin         UUID;
    v_year          INT;
    v_initial       NUMERIC;
    v_fund_exists   BOOLEAN;
    v_cat_id        UUID;
    v_item_id       UUID;
    v_m             INT;
    v_years         INT[];
BEGIN
    FOR r_org IN SELECT id AS org_id FROM public.organizations
    LOOP
        SELECT om.user_id
        INTO v_admin
        FROM public.org_members om
        WHERE om.org_id = r_org.org_id
          AND om.role::text IN ('admin', 'supervisor')
        ORDER BY CASE om.role::text WHEN 'admin' THEN 0 WHEN 'supervisor' THEN 1 ELSE 2 END,
                 om.created_at ASC NULLS LAST
        LIMIT 1;

        IF v_admin IS NULL THEN
            SELECT om.user_id INTO v_admin
            FROM public.org_members om
            WHERE om.org_id = r_org.org_id
            ORDER BY om.created_at ASC
            LIMIT 1;
        END IF;

        IF v_admin IS NULL THEN
            CONTINUE;
        END IF;

        -- Budget categories + items (once per org) from global petty_cash_categories
        FOR r_pc_cat IN
            SELECT id, name, slug, sort_order
            FROM public.petty_cash_categories
            WHERE COALESCE(is_active, true)
            ORDER BY sort_order NULLS LAST, name
        LOOP
            INSERT INTO public.budget_categories (org_id, name, sort_order, is_active)
            VALUES (r_org.org_id, r_pc_cat.name, COALESCE(r_pc_cat.sort_order, 0), true)
            ON CONFLICT (org_id, name) DO NOTHING;

            SELECT bc.id INTO v_cat_id
            FROM public.budget_categories bc
            WHERE bc.org_id = r_org.org_id AND bc.name = r_pc_cat.name;

            IF v_cat_id IS NULL THEN
                CONTINUE;
            END IF;

            INSERT INTO public.budget_items (org_id, category_id, code, name, channel_scope, is_active)
            VALUES (
                r_org.org_id,
                v_cat_id,
                LEFT(r_pc_cat.slug, 50),
                r_pc_cat.name,
                'non_fiscal'::public.budget_item_channel_scope,
                true
            )
            ON CONFLICT (org_id, code) DO NOTHING;

            SELECT bi.id INTO v_item_id
            FROM public.budget_items bi
            WHERE bi.org_id = r_org.org_id AND bi.code = LEFT(r_pc_cat.slug, 50);

            IF v_item_id IS NULL THEN
                CONTINUE;
            END IF;
        END LOOP;

        -- Fiscal years: all years with petty_cash_settings plus current calendar year
        SELECT ARRAY(
            SELECT DISTINCT y FROM (
                SELECT pcs.year AS y FROM public.petty_cash_settings pcs WHERE pcs.org_id = r_org.org_id
                UNION
                SELECT EXTRACT(YEAR FROM CURRENT_DATE)::INT
            ) u
            ORDER BY 1
        ) INTO v_years;

        IF v_years IS NULL OR cardinality(v_years) = 0 THEN
            v_years := ARRAY[EXTRACT(YEAR FROM CURRENT_DATE)::INT];
        END IF;

        FOREACH v_year IN ARRAY v_years
        LOOP
            SELECT COALESCE(MAX(pcs.initial_balance), 0)
            INTO v_initial
            FROM public.petty_cash_settings pcs
            WHERE pcs.org_id = r_org.org_id AND pcs.year = v_year;

            SELECT EXISTS (
                SELECT 1
                FROM public.petty_cash_funds f
                WHERE f.org_id = r_org.org_id
                  AND f.fiscal_year = v_year
                  AND f.name = 'Caja Chica General'
            ) INTO v_fund_exists;

            IF NOT v_fund_exists THEN
                INSERT INTO public.petty_cash_funds (
                    org_id, fiscal_year, name, custodian_id,
                    initial_amount, current_balance, status
                )
                VALUES (
                    r_org.org_id,
                    v_year,
                    'Caja Chica General',
                    v_admin,
                    v_initial,
                    v_initial,
                    'open'::public.petty_cash_fund_status
                );
            END IF;

            -- Lines for every budget_item in org for this fiscal year (12 months, non_fiscal)
            FOR v_item_id IN
                SELECT bi.id FROM public.budget_items bi WHERE bi.org_id = r_org.org_id
            LOOP
                FOR v_m IN 1..12
                LOOP
                    INSERT INTO public.budget_lines (
                        org_id, item_id, fiscal_year, month, channel,
                        budgeted_amount, actual_amount
                    )
                    VALUES (
                        r_org.org_id,
                        v_item_id,
                        v_year,
                        v_m,
                        'non_fiscal'::public.budget_channel,
                        0,
                        0
                    )
                    ON CONFLICT (org_id, item_id, fiscal_year, month, channel) DO NOTHING;
                END LOOP;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

COMMIT;
