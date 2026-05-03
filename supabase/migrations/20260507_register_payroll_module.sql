-- Migration: 20260507_register_payroll_module.sql
-- Description: Registers the Payroll module in the module_registry

INSERT INTO public.module_registry (slug, name, icon, category, is_native, sort_order, description) VALUES
('payroll', 'Nómina', 'Banknote', 'Finanzas', true, 50, 'Gestión de pagos a staff, periodos de nómina y cálculos dinámicos')
ON CONFLICT (org_id, slug) DO NOTHING;
