-- Migration: 20260512_crm_prospects.sql
-- Description: CRM module for prospect tracking (in-person visits + online leads).
--              Tables: crm_prospects, crm_activities
--              Module registry seed for sidebar navigation.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ENUMS
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE crm_prospect_status AS ENUM (
        'nuevo',
        'contactado',
        'calificado',
        'cotizado',
        'inscrito',
        'perdido'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE crm_prospect_source AS ENUM (
        'visita',
        'whatsapp',
        'telefono',
        'web',
        'referido',
        'otro'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE crm_activity_type AS ENUM (
        'nota',
        'llamada',
        'whatsapp',
        'correo',
        'visita',
        'cotizacion',
        'seguimiento'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. crm_prospects — main prospect / lead table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_prospects (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Contact info
    name                TEXT NOT NULL,
    phone               TEXT,
    email               TEXT,
    company             TEXT,           -- empresa / institución (colegios, empresas)

    -- Pipeline
    status              crm_prospect_status NOT NULL DEFAULT 'nuevo',
    source              crm_prospect_source NOT NULL DEFAULT 'visita',
    service_interest    TEXT,           -- e.g. "TOEFL", "Cambridge", "CENNI"
    estimated_value     NUMERIC(12,2),  -- valor estimado de la oportunidad (MXN)
    notes               TEXT,

    -- Assignment & scheduling
    assigned_to         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    last_contact_at     TIMESTAMPTZ,
    next_followup_at    TIMESTAMPTZ,

    -- Outcome (filled when status = 'inscrito' | 'perdido')
    closed_at           TIMESTAMPTZ,
    lost_reason         TEXT,

    -- Metadata
    created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_prospects_org        ON public.crm_prospects(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_prospects_status     ON public.crm_prospects(status);
CREATE INDEX IF NOT EXISTS idx_crm_prospects_assigned   ON public.crm_prospects(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_prospects_followup   ON public.crm_prospects(next_followup_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. crm_activities — timeline of interactions per prospect
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_activities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    prospect_id     UUID NOT NULL REFERENCES public.crm_prospects(id) ON DELETE CASCADE,

    type            crm_activity_type NOT NULL DEFAULT 'nota',
    notes           TEXT NOT NULL,
    performed_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    activity_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_activities_prospect ON public.crm_activities(prospect_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_org      ON public.crm_activities(org_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Auto updated_at trigger for crm_prospects
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_crm_prospects') THEN
        CREATE TRIGGER handle_updated_at_crm_prospects
            BEFORE UPDATE ON public.crm_prospects
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RLS — crm_prospects
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.crm_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_prospects_select"
    ON public.crm_prospects FOR SELECT
    TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "crm_prospects_insert"
    ON public.crm_prospects FOR INSERT
    TO authenticated
    WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "crm_prospects_update"
    ON public.crm_prospects FOR UPDATE
    TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "crm_prospects_delete"
    ON public.crm_prospects FOR DELETE
    TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RLS — crm_activities
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_activities_select"
    ON public.crm_activities FOR SELECT
    TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "crm_activities_insert"
    ON public.crm_activities FOR INSERT
    TO authenticated
    WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "crm_activities_delete"
    ON public.crm_activities FOR DELETE
    TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. module_registry seed — CRM category with Prospectos module
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.module_registry (slug, name, icon, category, is_native, sort_order, description) VALUES
('crm-prospects', 'Prospectos', 'UserSearch', 'CRM', true, 70, 'Pipeline de ventas y seguimiento a prospectos')
ON CONFLICT (org_id, slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. member_module_access default permissions for native crm-prospects
--    (Admins and supervisors can view + edit; operadores can view + create)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_module_id UUID;
BEGIN
    SELECT id INTO v_module_id FROM public.module_registry WHERE slug = 'crm-prospects' AND org_id IS NULL LIMIT 1;
    IF v_module_id IS NOT NULL THEN
        INSERT INTO public.module_permissions (module_id, role, can_view, can_create, can_edit, can_delete) VALUES
            (v_module_id, 'admin',      true, true,  true,  true),
            (v_module_id, 'supervisor', true, true,  true,  false),
            (v_module_id, 'operador',   true, true,  false, false),
            (v_module_id, 'applicator', false,false, false, false)
        ON CONFLICT (module_id, role) DO NOTHING;
    END IF;
END
$$;
