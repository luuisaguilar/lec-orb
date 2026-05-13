-- Migration: 20260409_sgc_operational_foundation.sql
-- Description: SGC operativo para exámenes y control documental inicial.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE public.event_sessions
    ADD COLUMN IF NOT EXISTS delivery_mode TEXT NOT NULL DEFAULT 'PAPER'
    CHECK (delivery_mode IN ('PAPER', 'DIGITAL'));

CREATE TABLE IF NOT EXISTS public.process_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    domain TEXT NOT NULL DEFAULT 'operations',
    description TEXT,
    owner_role TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, slug)
);

CREATE TABLE IF NOT EXISTS public.controlled_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    process_id UUID REFERENCES public.process_catalog(id) ON DELETE SET NULL,
    code TEXT,
    title TEXT NOT NULL,
    document_family TEXT,
    owner_role TEXT,
    visibility TEXT NOT NULL DEFAULT 'internal'
        CHECK (visibility IN ('public', 'internal', 'private', 'restricted')),
    validation_status TEXT NOT NULL DEFAULT 'draft',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    controlled_document_id UUID NOT NULL REFERENCES public.controlled_documents(id) ON DELETE CASCADE,
    storage_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    revision_label TEXT NOT NULL DEFAULT 'Rev.0',
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'obsolete')),
    visibility TEXT NOT NULL DEFAULT 'internal'
        CHECK (visibility IN ('public', 'internal', 'private', 'restricted')),
    is_current BOOLEAN NOT NULL DEFAULT true,
    effective_on DATE,
    obsolete_on DATE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.document_bindings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    controlled_document_id UUID NOT NULL REFERENCES public.controlled_documents(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.event_sessions(id) ON DELETE CASCADE,
    module_slug TEXT,
    record_id UUID,
    binding_role TEXT NOT NULL DEFAULT 'reference',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.operational_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    process_id UUID REFERENCES public.process_catalog(id) ON DELETE SET NULL,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    applies_to TEXT NOT NULL DEFAULT 'event_session',
    delivery_mode TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, slug)
);

CREATE TABLE IF NOT EXISTS public.checklist_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    checklist_id UUID NOT NULL REFERENCES public.operational_checklists(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.event_sessions(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'ready', 'blocked', 'completed')),
    progress_pct INTEGER NOT NULL DEFAULT 0,
    due_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, session_id)
);

CREATE TABLE IF NOT EXISTS public.checklist_run_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    checklist_run_id UUID NOT NULL REFERENCES public.checklist_runs(id) ON DELETE CASCADE,
    item_key TEXT NOT NULL,
    item_label TEXT NOT NULL,
    item_type TEXT NOT NULL DEFAULT 'task'
        CHECK (item_type IN ('task', 'evidence')),
    required BOOLEAN NOT NULL DEFAULT true,
    owner_role TEXT,
    artifact_type TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed', 'not_applicable', 'blocked')),
    due_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (checklist_run_id, item_key)
);

CREATE TABLE IF NOT EXISTS public.action_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    checklist_run_id UUID REFERENCES public.checklist_runs(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.event_sessions(id) ON DELETE CASCADE,
    action_key TEXT,
    title TEXT NOT NULL,
    description TEXT,
    owner_role TEXT,
    assigned_to UUID,
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'in_progress', 'done', 'cancelled')),
    due_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE NULLS NOT DISTINCT (checklist_run_id, action_key)
);

CREATE TABLE IF NOT EXISTS public.evidence_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    checklist_run_id UUID REFERENCES public.checklist_runs(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.event_sessions(id) ON DELETE CASCADE,
    request_key TEXT NOT NULL,
    title TEXT NOT NULL,
    artifact_type TEXT,
    requested_to_role TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'submitted', 'accepted', 'waived')),
    required_by TIMESTAMPTZ,
    fulfilled_at TIMESTAMPTZ,
    linked_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (checklist_run_id, request_key)
);

CREATE TABLE IF NOT EXISTS public.process_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    process_id UUID NOT NULL REFERENCES public.process_catalog(id) ON DELETE CASCADE,
    owner_role TEXT,
    frequency TEXT,
    next_review_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'in_review', 'closed')),
    notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_process_catalog_org_slug
    ON public.process_catalog(org_id, slug);
CREATE INDEX IF NOT EXISTS idx_controlled_documents_org_process
    ON public.controlled_documents(org_id, process_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_org_document
    ON public.document_versions(org_id, controlled_document_id);
CREATE INDEX IF NOT EXISTS idx_document_bindings_org_session
    ON public.document_bindings(org_id, session_id);
CREATE INDEX IF NOT EXISTS idx_checklist_runs_org_status
    ON public.checklist_runs(org_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_checklist_run_items_run_status
    ON public.checklist_run_items(checklist_run_id, status);
CREATE INDEX IF NOT EXISTS idx_action_items_org_status
    ON public.action_items(org_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_evidence_requests_org_status
    ON public.evidence_requests(org_id, status, required_by);
CREATE INDEX IF NOT EXISTS idx_process_reviews_org_status
    ON public.process_reviews(org_id, status, next_review_at);

ALTER TABLE public.process_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controlled_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_run_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "process_catalog_org_access"
    ON public.process_catalog FOR ALL
    TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()))
    WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "controlled_documents_org_access"
    ON public.controlled_documents FOR ALL
    TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()))
    WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "document_versions_org_access"
    ON public.document_versions FOR ALL
    TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()))
    WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "document_bindings_org_access"
    ON public.document_bindings FOR ALL
    TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()))
    WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "operational_checklists_org_access"
    ON public.operational_checklists FOR ALL
    TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()))
    WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "checklist_runs_org_access"
    ON public.checklist_runs FOR ALL
    TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()))
    WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "checklist_run_items_org_access"
    ON public.checklist_run_items FOR ALL
    TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()))
    WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "action_items_org_access"
    ON public.action_items FOR ALL
    TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()))
    WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "evidence_requests_org_access"
    ON public.evidence_requests FOR ALL
    TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()))
    WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "process_reviews_org_access"
    ON public.process_reviews FOR ALL
    TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()))
    WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));
