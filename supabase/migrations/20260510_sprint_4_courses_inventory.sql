-- Migration: 20260510_sprint_4_courses_inventory.sql
-- Description: Detailed schema for Courses (Academic/Financial) and Multi-location Inventory.

-------------------------------------------------------------------------------
-- 1. ACADEMIC & COURSE FINANCIALS
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    level VARCHAR(50), -- A1, A2, B1, etc.
    start_date DATE,
    end_date DATE,
    schedule_description TEXT, -- e.g. "Lunes a Jueves 18:00 - 20:00"
    instructor_id UUID REFERENCES auth.users(id), -- Optional link to internal staff
    instructor_name VARCHAR(200),
    max_students INTEGER DEFAULT 15,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'published', 'active', 'completed', 'cancelled')),
    
    -- Financial Simulation Fields (The "Analytics" part)
    price_per_student NUMERIC(12,2) DEFAULT 0,
    target_students INTEGER DEFAULT 10,
    
    -- Costs (Fixed)
    fixed_cost_instructor NUMERIC(12,2) DEFAULT 0, -- Total instructor fee
    fixed_cost_marketing NUMERIC(12,2) DEFAULT 0,  -- Marketing campaign budget
    fixed_cost_other NUMERIC(12,2) DEFAULT 0,      -- Rent, etc.
    
    -- Costs (Variable per student)
    var_cost_materials NUMERIC(12,2) DEFAULT 0,
    var_cost_fees NUMERIC(12,2) DEFAULT 0, -- e.g. exam fees if included
    
    -- Analytics Calculated (Can be virtual or stored for snapshots)
    min_students_break_even INTEGER DEFAULT 0,
    target_margin_pct NUMERIC(5,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_org_status ON public.courses(org_id, status);

-------------------------------------------------------------------------------
-- 2. INVENTORY SYSTEM
-------------------------------------------------------------------------------

-- Master Catalog
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    sku VARCHAR(100),
    name VARCHAR(250) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- e.g. "Books", "Merch", "Stationery"
    unit_price NUMERIC(12,2) DEFAULT 0,
    min_stock_level INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, sku)
);

-- Locations (Central Warehouse vs Book Fairs)
CREATE TABLE IF NOT EXISTS public.inventory_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'warehouse'
        CHECK (type IN ('warehouse', 'event', 'office', 'other')),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Current Stock per Location
CREATE TABLE IF NOT EXISTS public.inventory_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.inventory_locations(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(location_id, item_id)
);

-- Transfers & Transactions
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    from_location_id UUID REFERENCES public.inventory_locations(id), -- NULL if purchase
    to_location_id UUID REFERENCES public.inventory_locations(id),   -- NULL if sale/loss
    type VARCHAR(20) NOT NULL 
        CHECK (type IN ('purchase', 'sale', 'transfer', 'adjustment', 'loss', 'return')),
    quantity INTEGER NOT NULL,
    notes TEXT,
    performed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-------------------------------------------------------------------------------
-- 3. RLS POLICIES
-------------------------------------------------------------------------------

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Generic Select Policy for all new tables
DO $$ 
DECLARE 
    t TEXT;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name IN ('courses', 'inventory_items', 'inventory_locations', 'inventory_stock', 'inventory_transactions')
    LOOP
        EXECUTE format('CREATE POLICY %I_select ON public.%I FOR SELECT TO authenticated USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));', t, t);
        EXECUTE format('CREATE POLICY %I_all ON public.%I FOR ALL TO authenticated USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN (''admin'', ''supervisor'')));', t, t);
    END LOOP;
END $$;

-------------------------------------------------------------------------------
-- 4. MODULE REGISTRY
-------------------------------------------------------------------------------

INSERT INTO public.module_registry (slug, name, icon, category, is_native, sort_order, description)
VALUES 
('courses', 'Cursos', 'BookOpen', 'Académico', true, 60, 'Gestión de alumnos, niveles y simulador financiero de rentabilidad'),
('inventory', 'Inventario', 'Package', 'Logística', true, 70, 'Control de stock multi-ubicación para ferias y almacén central')
ON CONFLICT (org_id, slug) DO NOTHING;
