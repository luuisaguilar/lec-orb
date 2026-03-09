-- Migration: 20240307_payment_catalog.sql
-- Description: Creates payment_concepts table and inserts the provided exam price list.

CREATE TABLE IF NOT EXISTS public.payment_concepts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    concept_key VARCHAR(50) UNIQUE NOT NULL, -- e.g., YLE_STAR
    description TEXT NOT NULL, -- e.g., YLE Starters
    cost DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'MXN',
    expiration_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- RLS
ALTER TABLE public.payment_concepts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read for payment_concepts" ON public.payment_concepts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage payment_concepts" ON public.payment_concepts FOR ALL TO authenticated USING (true);

-- Insert the provided concepts
INSERT INTO public.payment_concepts (concept_key, description, cost, currency, expiration_date) VALUES
('YLE_STAR', 'YLE Starters', 2950, 'MXN', '2026-07-31'),
('YLE_MOV', 'YLE Movers', 3190, 'MXN', '2026-07-31'),
('YLE_FLY', 'YLE Flyers', 3320, 'MXN', '2026-07-31'),
('KET_FS', 'KET for Schools', 3999, 'MXN', '2026-07-31'),
('PET_FS', 'PET for Schools', 4190, 'MXN', '2026-07-31'),
('FCE_FS', 'FCE for Schools', 6940, 'MXN', '2026-07-31'),
('CAE', 'CAE (C1 Advanced)', 7045, 'MXN', '2026-07-31'),
('LINGS_2HB', 'Linguaskills (2 habilidades, presencial)', 1850, 'MXN', '2026-07-31'),
('LINGS_4HB', 'Linguaskills (4 habilidades, presencial)', 4140, 'MXN', '2026-07-31'),
('LINGS_HE2', 'Linguaskills Home Edition (2 habilidades)', 1930, 'MXN', '2026-07-31'),
('LINGS_HE4', 'Linguaskills Home Edition (4 habilidades)', 4990, 'MXN', '2026-07-31'),
('IELTS', 'IELTS', 5750, 'MXN', '2026-07-31'),
('TKT', 'TKT', 2200, 'MXN', '2026-07-31'),
('ITEP_ACP', 'iTEP Academic Plus', 3450, 'MXN', '2026-07-31'),
('OOPT', 'Oxford Online Placement Test', 850, 'MXN', '2026-12-31'),
('OOPT_YL', 'Oxford Online Placement Test Young Learners', 600, 'MXN', '2026-12-31'),
('OOPT_YL_S', 'OOPT Young Learners + Speaking', 1000, 'MXN', '2026-12-31'),
('OTE', 'Oxford Test English (A1-B2)', 4100, 'MXN', '2026-12-31'),
('OTE_ADV', 'Oxford Test English Advanced (B2-C1)', 4300, 'MXN', '2026-12-31'),
('OTE_SCH', 'Oxford Test English for Schools (A2-B2)', 4000, 'MXN', '2026-12-31'),
('MET_GO_PB', 'Michigan English Test GO! PB', 2900, 'MXN', '2026-12-31'),
('MET_GO_ON', 'Michigan English Test GO! Online', 3000, 'MXN', '2026-12-31'),
('MET', 'Michigan English Test', 4650, 'MXN', '2026-12-31'),
('STAMP_4SE', 'AVANT STAMP 4Se (primaria)', 2350, 'MXN', '2026-12-31'),
('STAMP_4S', 'AVANT STAMP 4S (secundaria)', 2550, 'MXN', '2026-12-31'),
('TOEFL_ITP', 'TOEFL Institucional', 1850, 'MXN', '2026-12-31'),
('TOEFL_ITP_S', 'TOEFL ITP + Speaking (solo digital)', 2550, 'MXN', '2026-12-31'),
('TOEFL_PRJR_PB', 'TOEFL Primary/Jr Paper Based (R,L)', 1650, 'MXN', '2026-12-31'),
('TOEFL_PRJR_DIG', 'TOEFL Primary/Jr Digital (R,L)', 1750, 'MXN', '2026-12-31'),
('TOEFL_PRJR_SDIG', 'TOEFL Primary/Jr Solo Digital (R,L,S)', 2650, 'MXN', '2026-12-31'),
('TOEFL_PRJR_4S', 'TOEFL Primary 4 Skills Solo Digital (R,L,W,S)', 3000, 'MXN', '2026-12-31'),
('ELET_4H', 'ELET 4 habilidades', 1650, 'MXN', '2026-12-31'),
('ELET_5HB', 'ELET 5 habilidades', 3000, 'MXN', '2026-12-31')
ON CONFLICT (concept_key) DO UPDATE SET
    description = EXCLUDED.description,
    cost = EXCLUDED.cost,
    expiration_date = EXCLUDED.expiration_date;

-- Create Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    concept_id UUID REFERENCES public.payment_concepts(id),
    folio VARCHAR(50) UNIQUE NOT NULL, -- e.g., PAG-20260305-01
    amount DECIMAL(10, 2) NOT NULL,
    person_name VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true
);

-- RLS for Payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to payments" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER handle_updated_at_payments
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for audit
CREATE TRIGGER payments_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
