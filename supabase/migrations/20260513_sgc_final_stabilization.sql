-- Migration: 20260513_sgc_final_stabilization.sql
-- Description: Consolidación final de esquema SGC para alineación con API y estabilidad de Auditorías.

-- 1. SECUENCIAS
CREATE SEQUENCE IF NOT EXISTS public.sgc_nc_ref_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.sgc_action_ref_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.sgc_audit_ref_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.sgc_review_ref_seq START 1;

-- 2. CATÁLOGOS BASE CON ESTRUCTURA COMPLETA
CREATE TABLE IF NOT EXISTS public.sgc_nc_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('draft', 'analysis', 'pending', 'open', 'done', 'cancel')),
    sequence INT NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (org_id, name)
);

CREATE TABLE IF NOT EXISTS public.sgc_action_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('draft', 'open', 'in_progress', 'done', 'cancel')),
    sequence INT NOT NULL DEFAULT 100,
    UNIQUE (org_id, name)
);

CREATE TABLE IF NOT EXISTS public.sgc_nc_severities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sequence INT DEFAULT 100,
    UNIQUE (org_id, name)
);

CREATE TABLE IF NOT EXISTS public.sgc_nc_origins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    ref_code TEXT,
    sequence INT DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE (org_id, name)
);

CREATE TABLE IF NOT EXISTS public.sgc_nc_causes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    ref_code TEXT,
    sequence INT DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE (org_id, name)
);

-- 3. TABLAS PRINCIPALES (CON TODOS LOS CAMPOS QUE EL API BUSCA)
CREATE TABLE IF NOT EXISTS public.sgc_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    ref TEXT NOT NULL DEFAULT 'NEW',
    title TEXT NOT NULL,
    description TEXT,
    type_action TEXT NOT NULL CHECK (type_action IN ('immediate', 'correction', 'prevention', 'improvement')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'in_progress', 'done', 'cancel')),
    deadline_at DATE,
    completed_at TIMESTAMPTZ,
    responsible_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    manager_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    stage_id UUID REFERENCES public.sgc_action_stages(id) ON DELETE SET NULL,
    nc_id UUID, -- Se vincula a sgc_nonconformities si existe
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, ref)
);

CREATE TABLE IF NOT EXISTS public.sgc_nonconformities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    ref TEXT NOT NULL DEFAULT 'NEW',
    title TEXT,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'analysis', 'pending', 'open', 'done', 'cancel')),
    detection_date DATE DEFAULT CURRENT_DATE,
    source_type TEXT, -- interna, externa, auditoria
    analysis TEXT,
    action_plan_comments TEXT,
    evaluation_comments TEXT,
    kanban_state TEXT DEFAULT 'normal' CHECK (kanban_state IN ('normal', 'blocked', 'done')),
    partner_name TEXT,
    related_reference TEXT,
    stage_id UUID REFERENCES public.sgc_nc_stages(id) ON DELETE SET NULL,
    severity_id UUID REFERENCES public.sgc_nc_severities(id) ON DELETE SET NULL,
    origin_id UUID REFERENCES public.sgc_nc_origins(id) ON DELETE SET NULL,
    cause_id UUID REFERENCES public.sgc_nc_causes(id) ON DELETE SET NULL,
    responsible_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    manager_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, ref)
);

CREATE TABLE IF NOT EXISTS public.sgc_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    ref TEXT NOT NULL DEFAULT 'NEW',
    title TEXT NOT NULL,
    review_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    state TEXT NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'done')),
    policy TEXT,
    changes TEXT,
    conclusion TEXT,
    attendees TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, ref)
);

-- 4. AJUSTES A AUDITORÍAS (Reconciliación)
ALTER TABLE public.sgc_audits 
    DROP CONSTRAINT IF EXISTS sgc_audits_audit_manager_id_fkey,
    ADD CONSTRAINT sgc_audits_audit_manager_id_fkey 
    FOREIGN KEY (audit_manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.sgc_audit_checks 
    DROP CONSTRAINT IF EXISTS sgc_audit_checks_org_id_clause_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS sgc_audit_checks_instance_idx 
ON public.sgc_audit_checks (org_id, COALESCE(audit_id, '00000000-0000-0000-0000-000000000000'), clause_id);

-- 5. RLS Y POLÍTICAS (Seguridad total)
DO $$ 
DECLARE
    tbl_name TEXT;
    list_tables TEXT[] := ARRAY[
        'sgc_nc_stages', 'sgc_action_stages', 'sgc_nc_severities', 
        'sgc_nc_origins', 'sgc_nc_causes', 'sgc_actions', 
        'sgc_nonconformities', 'sgc_reviews', 'sgc_audits', 
        'sgc_audit_checks', 'sgc_audit_cars'
    ];
BEGIN
    FOR tbl_name IN SELECT unnest(list_tables) LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl_name);
        EXECUTE format('DROP POLICY IF EXISTS "%s_access" ON public.%I', tbl_name, tbl_name);
        EXECUTE format('CREATE POLICY "%s_access" ON public.%I FOR ALL TO authenticated USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()))', tbl_name, tbl_name);
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
