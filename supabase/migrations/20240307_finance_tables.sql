-- Migration: 20240307_finance_tables.sql
-- Description: Creates quotes (Cotizaciones) and purchase_orders (Órdenes de Compra) tables
--              with RLS and Audit Triggers.

-- 0. Helper Functions (Create handle_updated_at if it doesn't exist)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Create Quotes Table
CREATE TABLE IF NOT EXISTS public.quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    folio VARCHAR(50) UNIQUE NOT NULL, -- e.g., COT-20260305-01
    provider VARCHAR(100), -- Cambridge, Oxford, ETS, etc.
    description TEXT,
    file_path VARCHAR(255), -- S3 or Storage path for the PDF
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true
);

-- 2. Create Purchase Orders Table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    folio VARCHAR(50) UNIQUE NOT NULL, -- e.g., OC-20260305-01
    quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
    provider VARCHAR(100),
    description TEXT,
    file_path VARCHAR(255), -- S3 or Storage path for the PDF
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true
);

-- 3. Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies 
-- For now, allow authenticated users full access (assuming admin portal). 
-- These can be tightened later by checking user roles.
CREATE POLICY "Allow authenticated full access to quotes" 
    ON public.quotes FOR ALL 
    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to purchase_orders" 
    ON public.purchase_orders FOR ALL 
    TO authenticated USING (true) WITH CHECK (true);

-- 5. Attach Automatic Updated_At Triggers (standard Supabase function handle_updated_at)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_quotes') THEN
        CREATE TRIGGER handle_updated_at_quotes
            BEFORE UPDATE ON public.quotes
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_purchase_orders') THEN
        CREATE TRIGGER handle_updated_at_purchase_orders
            BEFORE UPDATE ON public.purchase_orders
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END
$$;

-- 6. Attach Audit Log Triggers (using fn_audit_log from 20240305_audit_log.sql)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'quotes_audit') THEN
        CREATE TRIGGER quotes_audit
            AFTER INSERT OR UPDATE OR DELETE ON public.quotes
            FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'purchase_orders_audit') THEN
        CREATE TRIGGER purchase_orders_audit
            AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders
            FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
    END IF;
END
$$;
