-- Migration: 20260513_quotes_prospect_link.sql
-- Links quotes to CRM prospects for full lead→revenue traceability.
-- prospect_id is nullable — existing quotes are unaffected.

-- 1. Add FK column
ALTER TABLE public.quotes
    ADD COLUMN IF NOT EXISTS prospect_id UUID REFERENCES public.crm_prospects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_prospect ON public.quotes(prospect_id);

-- 2. Function: when a quote status changes to 'APPROVED', advance the linked
--    prospect to 'cotizado' (unless already past that stage).
CREATE OR REPLACE FUNCTION public.sync_prospect_on_quote_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.status = 'APPROVED'
       AND OLD.status <> 'APPROVED'
       AND NEW.prospect_id IS NOT NULL
    THEN
        UPDATE public.crm_prospects
        SET status = 'cotizado'
        WHERE id = NEW.prospect_id
          AND status NOT IN ('cotizado', 'inscrito', 'perdido');
    END IF;
    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_quote_approval_to_prospect'
    ) THEN
        CREATE TRIGGER trg_quote_approval_to_prospect
            AFTER UPDATE ON public.quotes
            FOR EACH ROW
            EXECUTE FUNCTION public.sync_prospect_on_quote_approval();
    END IF;
END
$$;
