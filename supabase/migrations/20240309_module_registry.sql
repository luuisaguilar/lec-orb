-- Migration: 20240309_module_registry.sql
-- Description: Creates the module_registry and module_permissions tables.
--              These are the foundation of the ERP plugin architecture.
--              Native modules get is_native=true and are inserted as seed data.
--              Custom modules (created via Studio) get is_native=false.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. module_registry — Source of truth for all modules (native + custom)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.module_registry (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    -- NULL org_id = global/builtin module available to all orgs
    slug        VARCHAR(50) NOT NULL,
    name        VARCHAR(100) NOT NULL,
    icon        VARCHAR(50) DEFAULT 'FileText',   -- Lucide icon name (string)
    description TEXT,
    category    VARCHAR(50),                       -- Groups in sidebar: "Institucional", "Finanzas", etc.
    is_native   BOOLEAN DEFAULT false,             -- true = has dedicated React component + API routes
    is_active   BOOLEAN DEFAULT true,
    sort_order  INT DEFAULT 0,
    config      JSONB DEFAULT '{}',                -- {default_view: "table", color: "#...", etc.}
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, slug),
    -- Allow global (org_id IS NULL) slugs to also be unique
    UNIQUE NULLS NOT DISTINCT (org_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_module_registry_org ON public.module_registry(org_id);
CREATE INDEX IF NOT EXISTS idx_module_registry_slug ON public.module_registry(slug);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. module_permissions — Role-based permissions for custom modules
--    (Native modules use the existing checkServerPermission + permissionsMap)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.module_permissions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id  UUID NOT NULL REFERENCES public.module_registry(id) ON DELETE CASCADE,
    role       VARCHAR(30) NOT NULL,      -- "admin" | "supervisor" | "operador" | "applicator"
    can_view   BOOLEAN DEFAULT true,
    can_create BOOLEAN DEFAULT false,
    can_edit   BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    UNIQUE(module_id, role)
);

CREATE INDEX IF NOT EXISTS idx_module_permissions_module ON public.module_permissions(module_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Auto updated_at trigger for module_registry
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_module_registry') THEN
        CREATE TRIGGER handle_updated_at_module_registry
            BEFORE UPDATE ON public.module_registry
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS for module_registry
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.module_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_permissions ENABLE ROW LEVEL SECURITY;

-- Global modules (org_id IS NULL) are visible to all authenticated users
-- Org-specific modules (is_native=false, custom) are visible only to that org
CREATE POLICY "module_registry_select"
    ON public.module_registry FOR SELECT
    TO authenticated
    USING (
        org_id IS NULL
        OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
    );

-- Only admins of an org can create/edit/delete custom modules
CREATE POLICY "module_registry_insert"
    ON public.module_registry FOR INSERT
    TO authenticated
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "module_registry_update"
    ON public.module_registry FOR UPDATE
    TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "module_registry_delete"
    ON public.module_registry FOR DELETE
    TO authenticated
    USING (
        is_native = false  -- Cannot delete native modules
        AND org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- module_permissions: visible to org members, writable by admins only
CREATE POLICY "module_permissions_select"
    ON public.module_permissions FOR SELECT
    TO authenticated
    USING (
        module_id IN (
            SELECT mr.id FROM public.module_registry mr
            WHERE mr.org_id IS NULL
               OR mr.org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "module_permissions_write"
    ON public.module_permissions FOR ALL
    TO authenticated
    USING (
        module_id IN (
            SELECT mr.id FROM public.module_registry mr
            WHERE mr.org_id IN (
                SELECT org_id FROM public.org_members
                WHERE user_id = auth.uid() AND role = 'admin'
            )
        )
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Seed: Insert all native modules as global (org_id = NULL)
--    These represent every existing functionality in LEC Platform.
--    is_native=true means the platform uses dedicated React components,
--    not the generic DynamicModule renderer.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.module_registry (slug, name, icon, category, is_native, sort_order, description) VALUES
-- Core
('dashboard',        'Dashboard',                'BarChart3',     NULL,              true,  0,  'Vista general de métricas y calendario'),
-- Institucional
('schools',          'Colegios / Sedes',         'School',        'Institucional',   true,  10, 'Gestión de colegios y sedes'),
('applicators',      'Aplicadores',              'Users',         'Institucional',   true,  11, 'Directorio de aplicadores y staff'),
('events',           'Eventos',                  'Calendar',      'Institucional',   true,  12, 'Planeación y gestión de exámenes'),
-- Inventario
('inventory',        'Speaking Packs',           'Package',       'Inventario',      true,  20, 'Control de inventario de paquetes'),
-- Exámenes
('toefl',            'Exámenes TOEFL',           'GraduationCap', 'Exámenes',        true,  30, 'Administraciones y códigos TOEFL'),
('cenni',            'CENNI',                    'FileText',      'Exámenes',        true,  31, 'Gestión de casos CENNI'),
('exam-codes',       'Códigos de Examen',        'Package',       'Exámenes',        true,  32, 'Códigos de acceso para exámenes'),
('calculator',       'Calculadora de Tiempos',   'Calculator',    'Exámenes',        true,  33, 'Calcula tiempos para sesiones'),
-- Catálogos
('catalog',          'Catálogo de Conceptos',    'BookOpen',      'Catálogos',       true,  40, 'Catálogo de exámenes y precios'),
-- Administración / Finanzas
('quotes',           'Cotizaciones',             'FileText',      'Finanzas',        true,  50, 'Gestión de cotizaciones'),
('purchase-orders',  'Órdenes de Compra',        'ShoppingCart',  'Finanzas',        true,  51, 'Órdenes de compra a proveedores'),
('payments',         'Pagos con Referencia',     'DollarSign',    'Finanzas',        true,  52, 'Registro de pagos y referencias'),
('payroll',          'Nómina',                   'Briefcase',     'Finanzas',        true,  53, 'Cálculo y gestión de nómina'),
-- Ajustes / Admin
('users',            'Usuarios y Permisos',      'UserCog',       'Ajustes',         true,  60, 'Gestión de usuarios y roles'),
('audit-log',        'Registro de Actividad',    'History',       'Ajustes',         true,  61, 'Historial de cambios y acciones'),
-- Studio — admin-only module builder
('studio',           'LEC Studio',               'Layers',        'Ajustes',         true,  62, 'Crea y gestiona módulos personalizados sin código')
ON CONFLICT (org_id, slug) DO NOTHING;
