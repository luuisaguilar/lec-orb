-- Seed data for LEC Platform - Finance Module (POA 2026)

-- 1. Register Modules (Idempotent)
INSERT INTO public.module_registry (slug, name, icon, category, is_native, sort_order, description) VALUES
('budget', 'Presupuesto', 'PieChart', 'Finanzas', true, 55, 'Presupuesto mensual por canal y partida (POA 2026)'),
('petty-cash', 'Caja Chica', 'Wallet', 'Finanzas', true, 56, 'Gestión de fondos de caja chica y reposiciones')
ON CONFLICT (slug) DO UPDATE SET 
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    category = EXCLUDED.category,
    description = EXCLUDED.description;

-- 2. Default Categories (Global or template-based if needed)
-- Note: In a multi-tenant system, categories are usually per-org. 
-- This seed provides a reference or global templates if the system supports them.
-- If the system requires org_id, this part should be handled during org creation.

-- 3. Initial Catalog Templates (POA 2026)
-- Assuming some shared items or example data for the first org (testing purposes)
-- In production, this would be a script run per organization.
