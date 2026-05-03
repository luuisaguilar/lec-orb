-- Migration: 20260509_travel_expenses_detailed_fields.sql
-- Description: Adds detailed budget (ppto) and real expense fields to travel_expense_reports.

ALTER TABLE public.travel_expense_reports 
ADD COLUMN IF NOT EXISTS ppto_aereos NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ppto_gasolina NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ppto_taxis NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ppto_casetas NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ppto_hospedaje NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ppto_alimentacion NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ppto_otros NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS real_aereos NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS real_gasolina NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS real_taxis NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS real_casetas NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS real_hospedaje NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS real_alimentacion NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS real_otros NUMERIC(12,2) DEFAULT 0;

-- Comment for clarity
COMMENT ON COLUMN public.travel_expense_reports.real_aereos IS 'Gasto real en pasajes aéreos con factura';
COMMENT ON COLUMN public.travel_expense_reports.real_gasolina IS 'Gasto real en combustible con factura';
