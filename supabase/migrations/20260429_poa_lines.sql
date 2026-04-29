-- Migration: 20260429_poa_lines.sql
-- Description: Tabla poa_lines para el módulo de Presupuesto / POA.
--   - Reemplaza el uso de `budgets` (atado a petty_cash_categories) para el POA.
--   - Permite líneas de presupuesto de texto libre, agrupadas por sección.
--   - Soporta dos fuentes: CAJA_CHICA y CUENTA_BAC.
--   - La tabla `budgets` existente NO se toca — sigue siendo usada por el comparativo
--     de Caja Chica por categoría.

-- 1. Tabla principal
CREATE TABLE IF NOT EXISTS public.poa_lines (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    year            INT         NOT NULL,
    month           INT         NOT NULL CHECK (month BETWEEN 1 AND 12),
    source          TEXT        NOT NULL DEFAULT 'CAJA_CHICA'
                                CHECK (source IN ('CAJA_CHICA', 'CUENTA_BAC')),
    section         TEXT        NOT NULL DEFAULT 'General',
    concept         TEXT        NOT NULL,
    budgeted_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    real_amount     NUMERIC(15,2),          -- null = no capturado aún
    notes           TEXT,
    sort_order      INT         NOT NULL DEFAULT 0,
    created_by      UUID        REFERENCES auth.users(id),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, year, month, source, concept)
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS poa_lines_org_year_idx
    ON public.poa_lines(org_id, year);

CREATE INDEX IF NOT EXISTS poa_lines_org_year_source_idx
    ON public.poa_lines(org_id, year, source);

-- 3. RLS
ALTER TABLE public.poa_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "poa_lines: org members can select"
    ON public.poa_lines FOR SELECT TO authenticated
    USING (org_id IN (
        SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "poa_lines: org members can insert"
    ON public.poa_lines FOR INSERT TO authenticated
    WITH CHECK (org_id IN (
        SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "poa_lines: org members can update"
    ON public.poa_lines FOR UPDATE TO authenticated
    USING (org_id IN (
        SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "poa_lines: org members can delete"
    ON public.poa_lines FOR DELETE TO authenticated
    USING (org_id IN (
        SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
    ));

-- 4. Trigger updated_at
CREATE TRIGGER handle_updated_at_poa_lines
    BEFORE UPDATE ON public.poa_lines
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. Audit log
CREATE TRIGGER poa_lines_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.poa_lines
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
