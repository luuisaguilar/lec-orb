-- Migration: 20240311_petty_cash_and_budget.sql
-- Description: Foundation for Petty Cash (Caja Chica) and Budgeting modules.

-- 1. Create petty_cash_categories
CREATE TABLE IF NOT EXISTS public.petty_cash_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50) NOT NULL,
    slug        VARCHAR(50) NOT NULL,
    sort_order  INT DEFAULT 0,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(slug)
);

-- Seed categories
INSERT INTO public.petty_cash_categories (name, slug, sort_order) VALUES
('Papelería',    'papeleria',    10),
('Limpieza',     'limpieza',     20),
('Oficina',      'oficina',      30),
('Transporte',   'transporte',   40),
('Alimentación', 'alimentacion', 50),
('Servicios',    'servicios',    60),
('Mantenimiento','mantenimiento',70),
('Publicidad',   'publicidad',   80),
('Otros',        'otros',        90)
ON CONFLICT (slug) DO NOTHING;

-- 2. Create petty_cash_settings (Saldo Inicial)
CREATE TABLE IF NOT EXISTS public.petty_cash_settings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    year            INT NOT NULL,
    initial_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_by      UUID REFERENCES auth.users(id),
    UNIQUE(org_id, year)
);

-- 3. Create petty_cash_movements
CREATE TABLE IF NOT EXISTS public.petty_cash_movements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    category_id     UUID NOT NULL REFERENCES public.petty_cash_categories(id),
    date            DATE NOT NULL DEFAULT CURRENT_DATE,
    concept         TEXT NOT NULL,
    type            VARCHAR(10) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    amount          NUMERIC(12,2) NOT NULL,
    partial_amount  NUMERIC(12,2),
    receipt_url     TEXT,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    created_by      UUID REFERENCES auth.users(id),
    updated_by      UUID REFERENCES auth.users(id),
    deleted_at      TIMESTAMPTZ
);

-- 4. Create budgets
CREATE TABLE IF NOT EXISTS public.budgets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    category_id     UUID NOT NULL REFERENCES public.petty_cash_categories(id),
    month           INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year            INT NOT NULL,
    amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_by      UUID REFERENCES auth.users(id),
    UNIQUE(org_id, category_id, month, year)
);

-- 5. RPC function for balance calculation
CREATE OR REPLACE FUNCTION public.fn_petty_cash_balance(p_org_id UUID, p_year INT)
RETURNS NUMERIC AS $$
DECLARE
    v_initial NUMERIC;
    v_incomes NUMERIC;
    v_expenses NUMERIC;
BEGIN
    SELECT initial_balance INTO v_initial 
    FROM public.petty_cash_settings 
    WHERE org_id = p_org_id AND year = p_year;
    
    SELECT SUM(amount) INTO v_incomes 
    FROM public.petty_cash_movements 
    WHERE org_id = p_org_id 
      AND EXTRACT(YEAR FROM date) = p_year 
      AND type = 'INCOME' 
      AND deleted_at IS NULL;

    SELECT SUM(amount) INTO v_expenses 
    FROM public.petty_cash_movements 
    WHERE org_id = p_org_id 
      AND EXTRACT(YEAR FROM date) = p_year 
      AND type = 'EXPENSE' 
      AND deleted_at IS NULL;

    RETURN COALESCE(v_initial, 0) + COALESCE(v_incomes, 0) - COALESCE(v_expenses, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RLS Policies
ALTER TABLE public.petty_cash_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petty_cash_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petty_cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are readable by all authenticated" ON public.petty_cash_categories
    FOR SELECT TO authenticated USING (true);

-- Petty Cash Settings
CREATE POLICY "Settings: org members can select" ON public.petty_cash_settings
    FOR SELECT TO authenticated USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));
CREATE POLICY "Settings: admins can manage" ON public.petty_cash_settings
    FOR ALL TO authenticated USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'admin'));

-- Petty Cash Movements
CREATE POLICY "Movements: org members can select" ON public.petty_cash_movements
    FOR SELECT TO authenticated USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()) AND deleted_at IS NULL);
CREATE POLICY "Movements: org members can insert" ON public.petty_cash_movements
    FOR INSERT TO authenticated WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));
CREATE POLICY "Movements: org members can update" ON public.petty_cash_movements
    FOR UPDATE TO authenticated USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

-- Budgets
CREATE POLICY "Budgets: org members can select" ON public.budgets
    FOR SELECT TO authenticated USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));
CREATE POLICY "Budgets: admins can manage" ON public.budgets
    FOR ALL TO authenticated USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'admin'));

-- 7. Triggers
-- Updated At
CREATE TRIGGER handle_updated_at_petty_cash_settings BEFORE UPDATE ON public.petty_cash_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at_petty_cash_movements BEFORE UPDATE ON public.petty_cash_movements FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at_budgets BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Audit Log
CREATE TRIGGER petty_cash_settings_audit AFTER INSERT OR UPDATE OR DELETE ON public.petty_cash_settings FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE TRIGGER petty_cash_movements_audit AFTER INSERT OR UPDATE OR DELETE ON public.petty_cash_movements FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE TRIGGER budgets_audit AFTER INSERT OR UPDATE OR DELETE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

-- 8. Register Modules in sidebar
INSERT INTO public.module_registry (slug, name, icon, category, is_native, sort_order, description) VALUES
('petty-cash', 'Caja Chica',  'Wallet',       'Finanzas', true, 54, 'Control de gastos menores por empresa'),
('budget',     'Presupuesto', 'PieChart',     'Finanzas', true, 55, 'Presupuesto mensual por categoría y empresa')
ON CONFLICT (org_id, slug) DO NOTHING;
