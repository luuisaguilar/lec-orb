-- Migration: 20260503_sgc_checklist_runs_free_context.sql
-- Description: Permite checklist_runs libres (sin event_id/session_id) para procesos
--              como SGC, RRHH y ADM. Combina F1-02 + F3-04 del plan de integración SGC.
--
-- Problema original: UNIQUE(org_id, session_id) impide múltiples runs sin sesión
-- porque NULL = NULL en un UNIQUE constraint estándar de PostgreSQL < 15.
--
-- Solución:
--   1. Eliminar el constraint table-level.
--   2. Crear un índice único parcial que solo aplica cuando session_id IS NOT NULL.
--      → Permite N runs libres del mismo checklist, pero previene duplicar el mismo
--        checklist en la misma sesión de examen.
--   3. Agregar columna context_type para distinguir el modo de ejecución.

-- ─── 1. Eliminar constraint viejo ────────────────────────────────────────────
ALTER TABLE public.checklist_runs
    DROP CONSTRAINT IF EXISTS checklist_runs_org_id_session_id_key;

-- ─── 2. Índice único parcial: solo aplica cuando hay sesión ──────────────────
CREATE UNIQUE INDEX IF NOT EXISTS checklist_runs_session_unique
    ON public.checklist_runs(org_id, checklist_id, session_id)
    WHERE session_id IS NOT NULL;

-- ─── 3. Columna context_type ─────────────────────────────────────────────────
-- 'session'  → atado a una event_session (EXA, OPS con sesión)
-- 'event'    → atado a un evento pero no a una sesión específica (OPS general)
-- 'free'     → sin contexto de evento (SGC, RRHH, ADM, ACA, VTA, FLI, LEG)
ALTER TABLE public.checklist_runs
    ADD COLUMN IF NOT EXISTS context_type TEXT NOT NULL DEFAULT 'session'
    CHECK (context_type IN ('free', 'event', 'session'));

-- Backfill: los runs existentes (todos atados a sesión) quedan como 'session'
-- El DEFAULT ya lo garantiza, pero lo dejamos explícito para clarity.
UPDATE public.checklist_runs
    SET context_type = 'session'
    WHERE context_type = 'session'; -- no-op, pero documenta la intención

-- ─── 4. Índice de soporte para runs libres ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_checklist_runs_free
    ON public.checklist_runs(org_id, checklist_id, context_type)
    WHERE context_type = 'free';

-- ─── 5. Columna iniciado_por (útil para runs libres) ─────────────────────────
-- En runs de sesión el contexto es claro (el evento/sesión tiene dueño).
-- En runs libres es importante saber quién los inició.
ALTER TABLE public.checklist_runs
    ADD COLUMN IF NOT EXISTS started_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
