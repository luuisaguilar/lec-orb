-- Sprint A4: amounts + line items for quotes and purchase_orders

BEGIN;

-- Quotes header amounts (total derived from subtotal + taxes)
ALTER TABLE public.quotes
    ADD COLUMN IF NOT EXISTS subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS taxes NUMERIC(15,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS currency CHAR(3) NOT NULL DEFAULT 'MXN',
    ADD COLUMN IF NOT EXISTS valid_until DATE,
    ADD COLUMN IF NOT EXISTS supplier_id UUID,
    ADD COLUMN IF NOT EXISTS notes TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'quotes' AND column_name = 'total'
    ) THEN
        ALTER TABLE public.quotes
            ADD COLUMN total NUMERIC(15,2) GENERATED ALWAYS AS (subtotal + taxes) STORED;
    END IF;
END $$;

ALTER TABLE public.purchase_orders
    ADD COLUMN IF NOT EXISTS subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS taxes NUMERIC(15,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS currency CHAR(3) NOT NULL DEFAULT 'MXN',
    ADD COLUMN IF NOT EXISTS supplier_id UUID,
    ADD COLUMN IF NOT EXISTS expected_delivery DATE,
    ADD COLUMN IF NOT EXISTS notes TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'total'
    ) THEN
        ALTER TABLE public.purchase_orders
            ADD COLUMN total NUMERIC(15,2) GENERATED ALWAYS AS (subtotal + taxes) STORED;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC(12,4) NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    unit_price NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    subtotal NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0.16 CHECK (tax_rate >= 0 AND tax_rate <= 1),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    quote_item_id UUID REFERENCES public.quote_items(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(12,4) NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    unit_price NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    subtotal NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0.16 CHECK (tax_rate >= 0 AND tax_rate <= 1),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON public.quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_po_items_order ON public.purchase_order_items(purchase_order_id);

ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quote_items_select_org" ON public.quote_items;
CREATE POLICY "quote_items_select_org" ON public.quote_items
    FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "quote_items_write_supervisors" ON public.quote_items;
CREATE POLICY "quote_items_write_supervisors" ON public.quote_items
    FOR ALL TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    )
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

DROP POLICY IF EXISTS "po_items_select_org" ON public.purchase_order_items;
CREATE POLICY "po_items_select_org" ON public.purchase_order_items
    FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "po_items_write_supervisors" ON public.purchase_order_items;
CREATE POLICY "po_items_write_supervisors" ON public.purchase_order_items
    FOR ALL TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    )
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_quote_items') THEN
        CREATE TRIGGER handle_updated_at_quote_items
            BEFORE UPDATE ON public.quote_items
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_po_items') THEN
        CREATE TRIGGER handle_updated_at_po_items
            BEFORE UPDATE ON public.purchase_order_items
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;

COMMIT;
