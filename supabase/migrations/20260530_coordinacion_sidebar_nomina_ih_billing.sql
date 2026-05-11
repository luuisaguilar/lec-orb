-- Sidebar: show Nómina and CxC (IH Billing) under "Coordinación de Exámenes".
-- App routes (Next.js): payroll → /dashboard/coordinacion-examenes/nominas ; ih-billing → /dashboard/coordinacion-examenes/cxc
-- Legacy URLs still available: /dashboard/nomina , /dashboard/finanzas/ih-billing (same UI).
-- payroll already exists in module_registry (Finanzas); ih-billing may be new in registry.

-- 1) Nómina → same section as exam coordination
UPDATE public.module_registry
SET
  category = 'Coordinación de Exámenes',
  updated_at = now()
WHERE org_id IS NULL
  AND slug = 'payroll';

-- 2) Cuentas por cobrar Cambridge (native UI primary entry: /dashboard/coordinacion-examenes/cxc ; finanzas mirror: /dashboard/finanzas/ih-billing)
INSERT INTO public.module_registry (
  slug,
  name,
  icon,
  category,
  is_native,
  sort_order,
  description,
  org_id
)
VALUES (
  'ih-billing',
  'Cuentas por Cobrar (IH)',
  'CircleDollarSign',
  'Coordinación de Exámenes',
  true,
  54,
  'Sesiones aplicadas, facturas IH y cobros por región',
  NULL
)
ON CONFLICT (org_id, slug) DO UPDATE
SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  is_native = true,
  is_active = true,
  sort_order = EXCLUDED.sort_order,
  description = EXCLUDED.description,
  updated_at = now();
