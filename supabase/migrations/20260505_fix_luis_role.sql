-- Migration: 20260505_fix_luis_role.sql
-- Description: Assigns Luis Aguilar as Auxiliar de Operaciones and unassigns from Director General.

UPDATE public.hr_profiles 
SET holder_name = 'Vacante / Por asignar',
    updated_at = NOW()
WHERE node_id = 'DIRECTOR GENERAL';

UPDATE public.hr_profiles 
SET holder_name = 'Luis Aguilar',
    updated_at = NOW()
WHERE node_id = 'AUXILIAR DE OPERACIONES';
