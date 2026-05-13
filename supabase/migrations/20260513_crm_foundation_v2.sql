-- Migration: 20260612_crm_foundation.sql
-- Description: CRM module foundation — contacts, opportunities, activities
-- ADR: docs/adr/ADR-009-crm-module-foundation.md

BEGIN;

-- ============================================================
-- 0. CLEANUP OLD CRM EXPERIMENTS
-- ============================================================
DROP TABLE IF EXISTS public.crm_activities CASCADE;
DROP TABLE IF EXISTS public.crm_prospects CASCADE;

-- ============================================================
-- 1. CRM_CONTACTS — Centralized customer/account directory
-- ============================================================

CREATE TABLE IF NOT EXISTS public.crm_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Identity
    type TEXT NOT NULL DEFAULT 'school' CHECK (type IN ('school', 'company', 'individual')),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    
    -- CRM-specific
    source TEXT NOT NULL DEFAULT 'existing' 
        CHECK (source IN ('whatsapp', 'referral', 'web', 'fair', 'call', 'outbound', 'existing')),
    tags JSONB DEFAULT '[]',
    assigned_to UUID REFERENCES auth.users(id),
    
    -- Links to existing entities
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    
    -- Metadata
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_org ON public.crm_contacts(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_type ON public.crm_contacts(org_id, type);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_school ON public.crm_contacts(school_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_assigned ON public.crm_contacts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_source ON public.crm_contacts(org_id, source);

-- ============================================================
-- 2. CRM_OPPORTUNITIES — Sales pipeline
-- ============================================================

CREATE TABLE IF NOT EXISTS public.crm_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
    
    -- Pipeline
    title TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'new' 
        CHECK (stage IN ('new', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
    expected_amount NUMERIC(15,2) DEFAULT 0,
    probability INTEGER DEFAULT 10 CHECK (probability >= 0 AND probability <= 100),
    expected_close DATE,
    
    -- Outcome
    loss_reason TEXT,
    won_at TIMESTAMPTZ,
    lost_at TIMESTAMPTZ,
    
    -- Links to existing entities
    quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
    
    -- Assignment
    assigned_to UUID REFERENCES auth.users(id),
    
    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_opps_org ON public.crm_opportunities(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_opps_contact ON public.crm_opportunities(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_opps_stage ON public.crm_opportunities(org_id, stage);
CREATE INDEX IF NOT EXISTS idx_crm_opps_assigned ON public.crm_opportunities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_opps_quote ON public.crm_opportunities(quote_id);

-- ============================================================
-- 3. CRM_ACTIVITIES — Commercial activities & follow-ups
-- ============================================================

CREATE TABLE IF NOT EXISTS public.crm_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
    opportunity_id UUID REFERENCES public.crm_opportunities(id) ON DELETE SET NULL,
    
    -- Activity details
    type TEXT NOT NULL DEFAULT 'note' 
        CHECK (type IN ('call', 'email', 'meeting', 'task', 'whatsapp', 'note')),
    subject TEXT NOT NULL,
    description TEXT,
    
    -- Scheduling
    due_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'done', 'cancelled')),
    completed_at TIMESTAMPTZ,
    
    -- Assignment
    assigned_to UUID REFERENCES auth.users(id),
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_activities_org ON public.crm_activities(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_contact ON public.crm_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_opp ON public.crm_activities(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_due ON public.crm_activities(org_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_crm_activities_assigned ON public.crm_activities(assigned_to);

-- ============================================================
-- 4. RLS POLICIES
-- ============================================================

ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

-- crm_contacts: org members can read, supervisors+ can write
CREATE POLICY "crm_contacts_select_org" ON public.crm_contacts
    FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "crm_contacts_write_supervisors" ON public.crm_contacts
    FOR ALL TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    )
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

-- crm_opportunities: org members can read, supervisors+ can write
CREATE POLICY "crm_opps_select_org" ON public.crm_opportunities
    FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "crm_opps_write_supervisors" ON public.crm_opportunities
    FOR ALL TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    )
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

-- crm_activities: org members can read, supervisors+ can write
CREATE POLICY "crm_activities_select_org" ON public.crm_activities
    FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "crm_activities_write_supervisors" ON public.crm_activities
    FOR ALL TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    )
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

-- ============================================================
-- 5. TRIGGERS (updated_at)
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_crm_contacts') THEN
        CREATE TRIGGER handle_updated_at_crm_contacts
            BEFORE UPDATE ON public.crm_contacts
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_crm_opportunities') THEN
        CREATE TRIGGER handle_updated_at_crm_opportunities
            BEFORE UPDATE ON public.crm_opportunities
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_crm_activities') THEN
        CREATE TRIGGER handle_updated_at_crm_activities
            BEFORE UPDATE ON public.crm_activities
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;

-- ============================================================
-- 6. AUDIT TRIGGERS
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'crm_contacts_audit') THEN
        CREATE TRIGGER crm_contacts_audit
            AFTER INSERT OR UPDATE OR DELETE ON public.crm_contacts
            FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'crm_opportunities_audit') THEN
        CREATE TRIGGER crm_opportunities_audit
            AFTER INSERT OR UPDATE OR DELETE ON public.crm_opportunities
            FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'crm_activities_audit') THEN
        CREATE TRIGGER crm_activities_audit
            AFTER INSERT OR UPDATE OR DELETE ON public.crm_activities
            FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
    END IF;
END $$;

-- ============================================================
-- 7. BACKFILL: whatsapp_leads → crm_contacts (one-time migration)
-- Only runs if whatsapp_leads has data and crm_contacts is empty
-- ============================================================

INSERT INTO public.crm_contacts (org_id, type, name, phone, source, notes, created_at)
SELECT 
    (SELECT id FROM public.organizations LIMIT 1) AS org_id,
    'individual' AS type,
    COALESCE(wl.full_name, 'Lead WhatsApp') AS name,
    wl.phone,
    'whatsapp' AS source,
    CONCAT_WS(' | ', 
        CASE WHEN wl.course_interest IS NOT NULL THEN 'Interés: ' || wl.course_interest END,
        CASE WHEN wl.details IS NOT NULL THEN 'Detalles: ' || wl.details END,
        CASE WHEN wl.status IS NOT NULL THEN 'Status WA: ' || wl.status END
    ) AS notes,
    wl.created_at
FROM public.whatsapp_leads wl
WHERE NOT EXISTS (
    SELECT 1 FROM public.crm_contacts cc WHERE cc.phone = wl.phone
)
ON CONFLICT DO NOTHING;

COMMIT;
