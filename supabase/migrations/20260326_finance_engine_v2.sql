-- Migration: 20260326_finance_engine_v2.sql
-- Description: Core schema for POA 2026, Petty Cash V2, and Replenishment flow.
--              Following additive pattern: old tables are kept but new structure is implemented.

BEGIN;

-- 0. Preparation: Rename legacy tables to avoid conflicts but keep data
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'petty_cash_movements') THEN
        ALTER TABLE public.petty_cash_movements RENAME TO petty_cash_movements_legacy;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'budgets') THEN
        ALTER TABLE public.budgets RENAME TO budgets_legacy;
    END IF;
END $$;

-- 1. Enums
DO $$ BEGIN
    CREATE TYPE public.budget_channel AS ENUM ('fiscal', 'non_fiscal');
    CREATE TYPE public.budget_item_channel_scope AS ENUM ('fiscal', 'non_fiscal', 'both');
    CREATE TYPE public.petty_cash_fund_status AS ENUM ('open', 'closed');
    CREATE TYPE public.petty_cash_movement_status AS ENUM ('posted', 'cancelled');
    CREATE TYPE public.replenishment_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Budget Structure
CREATE TABLE IF NOT EXISTS public.budget_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    sort_order  INT DEFAULT 0,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, name)
);

CREATE TABLE IF NOT EXISTS public.budget_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    category_id     UUID NOT NULL REFERENCES public.budget_categories(id) ON DELETE CASCADE,
    code            VARCHAR(50) NOT NULL,
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    channel_scope   public.budget_item_channel_scope NOT NULL DEFAULT 'both',
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, code)
);

CREATE TABLE IF NOT EXISTS public.budget_lines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    item_id         UUID NOT NULL REFERENCES public.budget_items(id) ON DELETE CASCADE,
    fiscal_year     INT NOT NULL,
    month           INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    channel         public.budget_channel NOT NULL,
    budgeted_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (budgeted_amount >= 0),
    actual_amount   NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (actual_amount >= 0),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, item_id, fiscal_year, month, channel)
);

-- 3. Petty Cash Structure
CREATE TABLE IF NOT EXISTS public.petty_cash_funds (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    fiscal_year     INT NOT NULL,
    name            VARCHAR(100) NOT NULL,
    custodian_id    UUID NOT NULL 
                    REFERENCES auth.users(id), 
    initial_amount  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (initial_amount >= 0),
    current_balance NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
    status          public.petty_cash_fund_status DEFAULT 'open',
    opened_at       TIMESTAMPTZ DEFAULT NOW(),
    closed_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.replenishment_requests (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    fund_id             UUID NOT NULL REFERENCES public.petty_cash_funds(id) ON DELETE CASCADE,
    request_date        DATE NOT NULL DEFAULT CURRENT_DATE,
    requested_amount    NUMERIC(12,2) NOT NULL CHECK (requested_amount > 0),
    justification       TEXT NOT NULL,
    requested_by        UUID NOT NULL REFERENCES auth.users(id),
    approved_by         UUID REFERENCES auth.users(id),
    approved_at         TIMESTAMPTZ,
    status              public.replenishment_status DEFAULT 'pending',
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.petty_cash_movements (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    fund_id                  UUID NOT NULL REFERENCES public.petty_cash_funds(id) ON DELETE CASCADE,
    budget_line_id           UUID REFERENCES public.budget_lines(id) ON DELETE SET NULL,
    replenishment_request_id UUID REFERENCES public.replenishment_requests(id) ON DELETE SET NULL,
    movement_date            DATE NOT NULL DEFAULT CURRENT_DATE,
    concept                  VARCHAR(255) NOT NULL,
    amount_in                NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount_in >= 0),
    amount_out               NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount_out >= 0),
    balance_after            NUMERIC(12,2) NOT NULL,
    receipt_url              TEXT,
    registered_by            UUID NOT NULL REFERENCES auth.users(id),
    approved_by              UUID REFERENCES auth.users(id),
    status                   public.petty_cash_movement_status DEFAULT 'posted',
    metadata                 JSONB DEFAULT '{}'::jsonb,
    created_at               TIMESTAMPTZ DEFAULT NOW(),
    updated_at               TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT movement_amounts_check CHECK (
        (amount_in > 0 AND amount_out = 0) OR (amount_in = 0 AND amount_out > 0)
    ),
    CONSTRAINT budget_line_required_for_expense CHECK (
        (amount_out = 0) OR (amount_out > 0 AND budget_line_id IS NOT NULL)
    )
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_budget_lines_lookup ON public.budget_lines(org_id, fiscal_year, month, channel);
CREATE INDEX IF NOT EXISTS idx_budget_items_category ON public.budget_items(org_id, category_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_funds_org ON public.petty_cash_funds(org_id, fiscal_year, status);
CREATE INDEX IF NOT EXISTS idx_pc_movements_fund ON public.petty_cash_movements(fund_id, movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_pc_movements_budget ON public.petty_cash_movements(budget_line_id, movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_replenishment_fund ON public.replenishment_requests(fund_id, status, created_at DESC);

-- 5. Functions & Triggers

-- Recalculate balance function
CREATE OR REPLACE FUNCTION public.fn_recalculate_fund_balance(p_fund_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_initial NUMERIC;
    v_net_movements NUMERIC;
BEGIN
    SELECT initial_amount INTO v_initial FROM public.petty_cash_funds WHERE id = p_fund_id;
    
    SELECT COALESCE(SUM(amount_in), 0) - COALESCE(SUM(amount_out), 0)
    INTO v_net_movements
    FROM public.petty_cash_movements
    WHERE fund_id = p_fund_id AND status = 'posted';

    RETURN v_initial + v_net_movements;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Sync Ledger
CREATE OR REPLACE FUNCTION public.fn_sync_movement_to_ledger()
RETURNS TRIGGER AS $$
DECLARE
    v_diff_in NUMERIC := 0;
    v_diff_out NUMERIC := 0;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF NEW.status = 'posted' THEN
            v_diff_in := NEW.amount_in;
            v_diff_out := NEW.amount_out;
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.status = 'posted' THEN
            v_diff_in := v_diff_in - OLD.amount_in;
            v_diff_out := v_diff_out - OLD.amount_out;
        END IF;
        IF NEW.status = 'posted' THEN
            v_diff_in := v_diff_in + NEW.amount_in;
            v_diff_out := v_diff_out + NEW.amount_out;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.status = 'posted' THEN
            v_diff_in := -OLD.amount_in;
            v_diff_out := -OLD.amount_out;
        END IF;
    END IF;

    IF (v_diff_in != 0 OR v_diff_out != 0) THEN
        UPDATE public.petty_cash_funds
        SET current_balance = current_balance + (v_diff_in - v_diff_out),
            updated_at = NOW()
        WHERE id = COALESCE(NEW.fund_id, OLD.fund_id);
    END IF;

    IF (TG_OP != 'DELETE' AND NEW.budget_line_id IS NOT NULL AND v_diff_out != 0) THEN
        UPDATE public.budget_lines
        SET actual_amount = actual_amount + v_diff_out,
            updated_at = NOW()
        WHERE id = NEW.budget_line_id;
    END IF;
    
    IF (TG_OP = 'UPDATE' AND OLD.budget_line_id IS NOT NULL AND OLD.budget_line_id != NEW.budget_line_id AND OLD.status = 'posted') THEN
        UPDATE public.budget_lines
        SET actual_amount = actual_amount - OLD.amount_out,
            updated_at = NOW()
        WHERE id = OLD.budget_line_id;
    END IF;

    IF (TG_OP = 'DELETE' AND OLD.budget_line_id IS NOT NULL AND OLD.status = 'posted') THEN
        UPDATE public.budget_lines
        SET actual_amount = actual_amount - OLD.amount_out,
            updated_at = NOW()
        WHERE id = OLD.budget_line_id;
    END IF;

    IF (TG_OP != 'DELETE') THEN
        NEW.balance_after := public.fn_recalculate_fund_balance(NEW.fund_id);
        RETURN NEW;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_petty_cash_movement
    BEFORE INSERT OR UPDATE OR DELETE ON public.petty_cash_movements
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_movement_to_ledger();

-- Trigger: Handle Replenishment Approval
CREATE OR REPLACE FUNCTION public.fn_handle_replenishment_approval()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status = 'pending' AND NEW.status = 'approved') THEN
        INSERT INTO public.petty_cash_movements (
            org_id,
            fund_id,
            replenishment_request_id,
            concept,
            amount_in,
            registered_by,
            approved_by,
            movement_date,
            balance_after
        ) VALUES (
            NEW.org_id,
            NEW.fund_id,
            NEW.id,
            'Reposición de caja: ' || NEW.justification,
            NEW.requested_amount,
            NEW.requested_by,
            NEW.approved_by,
            NEW.approved_at::DATE,
            0
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_replenishment_approval
    AFTER UPDATE ON public.replenishment_requests
    FOR EACH ROW EXECUTE FUNCTION public.fn_handle_replenishment_approval();

-- Updated At
CREATE TRIGGER handle_updated_at_budget_categories BEFORE UPDATE ON public.budget_categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at_budget_items BEFORE UPDATE ON public.budget_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at_budget_lines BEFORE UPDATE ON public.budget_lines FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at_petty_cash_funds BEFORE UPDATE ON public.petty_cash_funds FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at_pc_movements BEFORE UPDATE ON public.petty_cash_movements FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at_replenishment BEFORE UPDATE ON public.replenishment_requests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. Row Level Security (RLS)
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petty_cash_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petty_cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replenishment_requests ENABLE ROW LEVEL SECURITY;

-- Security helper
CREATE OR REPLACE FUNCTION public.fn_is_finance_admin(p_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.org_members 
        WHERE user_id = auth.uid() 
        AND org_id = p_org_id 
        AND role IN ('admin', 'finance_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies: Categories
CREATE POLICY "Budget Categories: Select" ON public.budget_categories FOR SELECT USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));
CREATE POLICY "Budget Categories: Manage" ON public.budget_categories FOR ALL USING (public.fn_is_finance_admin(org_id));

-- Policies: Items
CREATE POLICY "Budget Items: Select" ON public.budget_items FOR SELECT USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));
CREATE POLICY "Budget Items: Manage" ON public.budget_items FOR ALL USING (public.fn_is_finance_admin(org_id));

-- Policies: Lines
CREATE POLICY "Budget Lines: Select" ON public.budget_lines FOR SELECT USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));
CREATE POLICY "Budget Lines: Manage" ON public.budget_lines FOR ALL USING (public.fn_is_finance_admin(org_id));

-- Policies: Funds
CREATE POLICY "Funds: Select" ON public.petty_cash_funds FOR SELECT USING (custodian_id = auth.uid() OR public.fn_is_finance_admin(org_id));
CREATE POLICY "Funds: Manage" ON public.petty_cash_funds FOR ALL USING (public.fn_is_finance_admin(org_id));

-- Policies: Movements
CREATE POLICY "Movements: Select" ON public.petty_cash_movements FOR SELECT USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));
CREATE POLICY "Movements: Insert" ON public.petty_cash_movements FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.petty_cash_funds WHERE id = fund_id AND custodian_id = auth.uid() AND status = 'open')
    AND org_id = (SELECT org_id FROM public.petty_cash_funds WHERE id = fund_id)
);
CREATE POLICY "Movements: Manage" ON public.petty_cash_movements FOR ALL USING (public.fn_is_finance_admin(org_id));

-- Policies: Replenishment
CREATE POLICY "Replenishments: Select" ON public.replenishment_requests FOR SELECT USING (requested_by = auth.uid() OR public.fn_is_finance_admin(org_id));
CREATE POLICY "Replenishments: Insert" ON public.replenishment_requests FOR INSERT WITH CHECK (requested_by = auth.uid());
CREATE POLICY "Replenishments: Update" ON public.replenishment_requests FOR UPDATE USING (public.fn_is_finance_admin(org_id));

COMMIT;
