-- Allow fund custodian to update/cancel movements in their open fund (not only finance_admin).

BEGIN;

DROP POLICY IF EXISTS "Movements: Custodian update" ON public.petty_cash_movements;

CREATE POLICY "Movements: Custodian update" ON public.petty_cash_movements
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.petty_cash_funds f
            WHERE f.id = petty_cash_movements.fund_id
              AND f.custodian_id = auth.uid()
              AND f.status = 'open'::public.petty_cash_fund_status
        )
        AND org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.petty_cash_funds f
            WHERE f.id = petty_cash_movements.fund_id
              AND f.custodian_id = auth.uid()
              AND f.status = 'open'::public.petty_cash_fund_status
        )
        AND org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
    );

COMMIT;
