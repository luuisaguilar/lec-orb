-- Migration: 20260429_sgc_processes_enhancement.sql
-- Description: Adds responsible_area and more detail fields to sgc_processes

ALTER TABLE public.sgc_processes 
ADD COLUMN IF NOT EXISTS responsible_area VARCHAR(100),
ADD COLUMN IF NOT EXISTS version VARCHAR(20) DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS last_review_date DATE DEFAULT CURRENT_DATE;

-- Update existing records if any
UPDATE public.sgc_processes SET responsible_area = 'Recursos Humanos' WHERE id = 'PROC_RRHH';
UPDATE public.sgc_processes SET responsible_area = 'Administración y Finanzas' WHERE id = 'PROC_FINANZAS';
