-- Migration: 20260510_sgc_phase1.sql
-- Description: SGC (ISO/QMS) Phase 1 schema for Nonconformities, Actions, Audits and Reviews.
-- Notes:
--   - Multi-tenant by org_id
--   - RLS enabled on all SGC tables
--   - Uses existing public.handle_updated_at() and public.fn_audit_log()

-- ============================================================================
-- 1) Sequences for human references
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS public.sgc_nc_ref_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.sgc_action_ref_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.sgc_audit_ref_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.sgc_review_ref_seq START 1;

-- ============================================================================
-- 2) Catalog tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sgc_nc_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('draft', 'analysis', 'pending', 'open', 'done', 'cancel')),
    sequence INT NOT NULL DEFAULT 100,
    is_starting BOOLEAN NOT NULL DEFAULT FALSE,
    is_terminal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, name)
);

CREATE UNIQUE INDEX IF NOT EXISTS sgc_nc_stages_one_start_per_org_idx
    ON public.sgc_nc_stages(org_id)
    WHERE is_starting = TRUE;

CREATE TABLE IF NOT EXISTS public.sgc_action_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('draft', 'open', 'in_progress', 'done', 'cancel')),
    sequence INT NOT NULL DEFAULT 100,
    is_starting BOOLEAN NOT NULL DEFAULT FALSE,
    is_ending BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, name)
);

CREATE UNIQUE INDEX IF NOT EXISTS sgc_action_stages_one_start_per_org_idx
    ON public.sgc_action_stages(org_id)
    WHERE is_starting = TRUE;

CREATE TABLE IF NOT EXISTS public.sgc_nc_severities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    sequence INT NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, name)
);

CREATE TABLE IF NOT EXISTS public.sgc_nc_origins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    ref_code TEXT,
    sequence INT NOT NULL DEFAULT 100,
    parent_id UUID REFERENCES public.sgc_nc_origins(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, name)
);

CREATE TABLE IF NOT EXISTS public.sgc_nc_causes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    ref_code TEXT,
    sequence INT NOT NULL DEFAULT 100,
    parent_id UUID REFERENCES public.sgc_nc_causes(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, name)
);

-- ============================================================================
-- 3) Core entities
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sgc_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    ref TEXT NOT NULL DEFAULT 'NEW',
    title TEXT NOT NULL,
    description TEXT,
    type_action TEXT NOT NULL CHECK (type_action IN ('immediate', 'correction', 'prevention', 'improvement')),
    priority TEXT NOT NULL DEFAULT 'low' CHECK (priority IN ('low', 'normal')),
    stage_id UUID REFERENCES public.sgc_action_stages(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'in_progress', 'done', 'cancel')),
    deadline_at DATE,
    opened_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    responsible_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    manager_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, ref)
);

CREATE INDEX IF NOT EXISTS sgc_actions_org_status_idx
    ON public.sgc_actions(org_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.sgc_nonconformities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    ref TEXT NOT NULL DEFAULT 'NEW',
    title TEXT,
    related_reference TEXT,
    partner_name TEXT,
    description TEXT NOT NULL,
    stage_id UUID REFERENCES public.sgc_nc_stages(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'analysis', 'pending', 'open', 'done', 'cancel')),
    kanban_state TEXT NOT NULL DEFAULT 'normal' CHECK (kanban_state IN ('normal', 'done', 'blocked')),
    responsible_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    manager_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    severity_id UUID REFERENCES public.sgc_nc_severities(id) ON DELETE SET NULL,
    analysis TEXT,
    action_plan_comments TEXT,
    evaluation_comments TEXT,
    opened_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, ref)
);

CREATE INDEX IF NOT EXISTS sgc_nonconformities_org_status_idx
    ON public.sgc_nonconformities(org_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.sgc_nonconformity_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    nonconformity_id UUID NOT NULL REFERENCES public.sgc_nonconformities(id) ON DELETE CASCADE,
    action_id UUID NOT NULL REFERENCES public.sgc_actions(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL DEFAULT 'planned' CHECK (relation_type IN ('immediate', 'planned')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (nonconformity_id, action_id)
);

CREATE TABLE IF NOT EXISTS public.sgc_nonconformity_origins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    nonconformity_id UUID NOT NULL REFERENCES public.sgc_nonconformities(id) ON DELETE CASCADE,
    origin_id UUID NOT NULL REFERENCES public.sgc_nc_origins(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (nonconformity_id, origin_id)
);

CREATE TABLE IF NOT EXISTS public.sgc_nonconformity_causes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    nonconformity_id UUID NOT NULL REFERENCES public.sgc_nonconformities(id) ON DELETE CASCADE,
    cause_id UUID NOT NULL REFERENCES public.sgc_nc_causes(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (nonconformity_id, cause_id)
);

CREATE TABLE IF NOT EXISTS public.sgc_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    ref TEXT NOT NULL DEFAULT 'NEW',
    title TEXT,
    audit_date TIMESTAMPTZ,
    state TEXT NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'done')),
    audit_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    strong_points TEXT,
    to_improve_points TEXT,
    closing_date TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, ref)
);

CREATE INDEX IF NOT EXISTS sgc_audits_org_state_idx
    ON public.sgc_audits(org_id, state, created_at DESC);

CREATE TABLE IF NOT EXISTS public.sgc_audit_auditors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    audit_id UUID NOT NULL REFERENCES public.sgc_audits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (audit_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.sgc_audit_auditees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    audit_id UUID NOT NULL REFERENCES public.sgc_audits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (audit_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.sgc_audit_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    audit_id UUID NOT NULL REFERENCES public.sgc_audits(id) ON DELETE CASCADE,
    procedure_reference TEXT,
    question TEXT NOT NULL,
    is_conformed BOOLEAN NOT NULL DEFAULT FALSE,
    comments TEXT,
    seq INT NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sgc_audit_nonconformities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    audit_id UUID NOT NULL REFERENCES public.sgc_audits(id) ON DELETE CASCADE,
    nonconformity_id UUID NOT NULL REFERENCES public.sgc_nonconformities(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (audit_id, nonconformity_id)
);

CREATE TABLE IF NOT EXISTS public.sgc_audit_improvement_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    audit_id UUID NOT NULL REFERENCES public.sgc_audits(id) ON DELETE CASCADE,
    action_id UUID NOT NULL REFERENCES public.sgc_actions(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (audit_id, action_id)
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
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, ref)
);

CREATE INDEX IF NOT EXISTS sgc_reviews_org_state_idx
    ON public.sgc_reviews(org_id, state, created_at DESC);

CREATE TABLE IF NOT EXISTS public.sgc_review_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    review_id UUID NOT NULL REFERENCES public.sgc_reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (review_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.sgc_review_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    review_id UUID NOT NULL REFERENCES public.sgc_reviews(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('action', 'nonconformity')),
    action_id UUID REFERENCES public.sgc_actions(id) ON DELETE SET NULL,
    nonconformity_id UUID REFERENCES public.sgc_nonconformities(id) ON DELETE SET NULL,
    decision TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT sgc_review_item_target_ck CHECK (
        (item_type = 'action' AND action_id IS NOT NULL AND nonconformity_id IS NULL)
        OR
        (item_type = 'nonconformity' AND nonconformity_id IS NOT NULL AND action_id IS NULL)
    )
);

-- ============================================================================
-- 4) Business rule functions and triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sgc_actions_before_write()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_stage_state TEXT;
BEGIN
    IF NEW.stage_id IS NOT NULL THEN
        SELECT state INTO v_stage_state
        FROM public.sgc_action_stages
        WHERE id = NEW.stage_id
          AND org_id = NEW.org_id;

        IF v_stage_state IS NULL THEN
            RAISE EXCEPTION 'Invalid action stage % for org %', NEW.stage_id, NEW.org_id;
        END IF;
        NEW.status := v_stage_state;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.opened_at IS NOT NULL AND NEW.status = 'draft' THEN
            RAISE EXCEPTION 'Action cannot return to draft after being opened';
        END IF;
    END IF;

    IF NEW.status <> 'draft' AND NEW.opened_at IS NULL THEN
        NEW.opened_at := NOW();
    END IF;

    IF NEW.status = 'done' THEN
        IF NEW.closed_at IS NULL THEN
            NEW.closed_at := NOW();
        END IF;
    ELSIF NEW.status <> 'done' THEN
        NEW.closed_at := NULL;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sgc_nonconformities_before_write()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_stage_state TEXT;
    v_missing_actions INT;
BEGIN
    IF NEW.stage_id IS NOT NULL THEN
        SELECT state INTO v_stage_state
        FROM public.sgc_nc_stages
        WHERE id = NEW.stage_id
          AND org_id = NEW.org_id;

        IF v_stage_state IS NULL THEN
            RAISE EXCEPTION 'Invalid nonconformity stage % for org %', NEW.stage_id, NEW.org_id;
        END IF;
        NEW.status := v_stage_state;
    END IF;

    IF NEW.status = 'open' AND NEW.opened_at IS NULL THEN
        NEW.opened_at := NOW();
    END IF;

    IF NEW.status = 'done' THEN
        IF NULLIF(BTRIM(COALESCE(NEW.evaluation_comments, '')), '') IS NULL THEN
            RAISE EXCEPTION 'evaluation_comments is required to close a nonconformity';
        END IF;

        SELECT COUNT(1) INTO v_missing_actions
        FROM public.sgc_nonconformity_actions nca
        JOIN public.sgc_actions a ON a.id = nca.action_id
        WHERE nca.nonconformity_id = NEW.id
          AND a.status <> 'done';

        IF v_missing_actions > 0 THEN
            RAISE EXCEPTION 'All linked actions must be done before closing a nonconformity';
        END IF;

        IF NEW.closed_at IS NULL THEN
            NEW.closed_at := NOW();
        END IF;
    ELSIF NEW.status <> 'done' THEN
        NEW.closed_at := NULL;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sgc_set_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.ref IS NULL OR NEW.ref = 'NEW' THEN
        IF TG_TABLE_NAME = 'sgc_nonconformities' THEN
            NEW.ref := 'NC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('public.sgc_nc_ref_seq')::TEXT, 6, '0');
        ELSIF TG_TABLE_NAME = 'sgc_actions' THEN
            NEW.ref := 'ACT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('public.sgc_action_ref_seq')::TEXT, 6, '0');
        ELSIF TG_TABLE_NAME = 'sgc_audits' THEN
            NEW.ref := 'AUD-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('public.sgc_audit_ref_seq')::TEXT, 6, '0');
        ELSIF TG_TABLE_NAME = 'sgc_reviews' THEN
            NEW.ref := 'REV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('public.sgc_review_ref_seq')::TEXT, 6, '0');
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sgc_actions_before_write_trg ON public.sgc_actions;
CREATE TRIGGER sgc_actions_before_write_trg
    BEFORE INSERT OR UPDATE ON public.sgc_actions
    FOR EACH ROW EXECUTE FUNCTION public.sgc_actions_before_write();

DROP TRIGGER IF EXISTS sgc_nonconformities_before_write_trg ON public.sgc_nonconformities;
CREATE TRIGGER sgc_nonconformities_before_write_trg
    BEFORE INSERT OR UPDATE ON public.sgc_nonconformities
    FOR EACH ROW EXECUTE FUNCTION public.sgc_nonconformities_before_write();

DROP TRIGGER IF EXISTS sgc_nonconformities_ref_trg ON public.sgc_nonconformities;
CREATE TRIGGER sgc_nonconformities_ref_trg
    BEFORE INSERT ON public.sgc_nonconformities
    FOR EACH ROW EXECUTE FUNCTION public.sgc_set_reference();

DROP TRIGGER IF EXISTS sgc_actions_ref_trg ON public.sgc_actions;
CREATE TRIGGER sgc_actions_ref_trg
    BEFORE INSERT ON public.sgc_actions
    FOR EACH ROW EXECUTE FUNCTION public.sgc_set_reference();

DROP TRIGGER IF EXISTS sgc_audits_ref_trg ON public.sgc_audits;
CREATE TRIGGER sgc_audits_ref_trg
    BEFORE INSERT ON public.sgc_audits
    FOR EACH ROW EXECUTE FUNCTION public.sgc_set_reference();

DROP TRIGGER IF EXISTS sgc_reviews_ref_trg ON public.sgc_reviews;
CREATE TRIGGER sgc_reviews_ref_trg
    BEFORE INSERT ON public.sgc_reviews
    FOR EACH ROW EXECUTE FUNCTION public.sgc_set_reference();

-- ============================================================================
-- 5) Enable RLS and policies
-- ============================================================================

DO $$
DECLARE
    tbl TEXT;
    sgc_tables TEXT[] := ARRAY[
        'sgc_nc_stages',
        'sgc_action_stages',
        'sgc_nc_severities',
        'sgc_nc_origins',
        'sgc_nc_causes',
        'sgc_actions',
        'sgc_nonconformities',
        'sgc_nonconformity_actions',
        'sgc_nonconformity_origins',
        'sgc_nonconformity_causes',
        'sgc_audits',
        'sgc_audit_auditors',
        'sgc_audit_auditees',
        'sgc_audit_checks',
        'sgc_audit_nonconformities',
        'sgc_audit_improvement_actions',
        'sgc_reviews',
        'sgc_review_participants',
        'sgc_review_items'
    ];
BEGIN
    FOREACH tbl IN ARRAY sgc_tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

        EXECUTE format('DROP POLICY IF EXISTS "%s: org members select" ON public.%I', tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "%s: org members select" ON public.%I FOR SELECT TO authenticated
             USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()))',
            tbl, tbl
        );

        EXECUTE format('DROP POLICY IF EXISTS "%s: admin-supervisor insert" ON public.%I', tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "%s: admin-supervisor insert" ON public.%I FOR INSERT TO authenticated
             WITH CHECK (
                org_id IN (
                    SELECT org_id FROM public.org_members
                    WHERE user_id = auth.uid() AND role::TEXT IN (''admin'', ''supervisor'')
                )
             )',
            tbl, tbl
        );

        EXECUTE format('DROP POLICY IF EXISTS "%s: admin-supervisor update" ON public.%I', tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "%s: admin-supervisor update" ON public.%I FOR UPDATE TO authenticated
             USING (
                org_id IN (
                    SELECT org_id FROM public.org_members
                    WHERE user_id = auth.uid() AND role::TEXT IN (''admin'', ''supervisor'')
                )
             )
             WITH CHECK (
                org_id IN (
                    SELECT org_id FROM public.org_members
                    WHERE user_id = auth.uid() AND role::TEXT IN (''admin'', ''supervisor'')
                )
             )',
            tbl, tbl
        );

        EXECUTE format('DROP POLICY IF EXISTS "%s: admin-supervisor delete" ON public.%I', tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "%s: admin-supervisor delete" ON public.%I FOR DELETE TO authenticated
             USING (
                org_id IN (
                    SELECT org_id FROM public.org_members
                    WHERE user_id = auth.uid() AND role::TEXT IN (''admin'', ''supervisor'')
                )
             )',
            tbl, tbl
        );
    END LOOP;
END;
$$;

-- ============================================================================
-- 6) updated_at triggers and audit triggers
-- ============================================================================

DO $$
DECLARE
    tbl TEXT;
    updated_tables TEXT[] := ARRAY[
        'sgc_nc_stages',
        'sgc_action_stages',
        'sgc_nc_severities',
        'sgc_nc_origins',
        'sgc_nc_causes',
        'sgc_actions',
        'sgc_nonconformities',
        'sgc_audit_checks',
        'sgc_reviews',
        'sgc_review_items',
        'sgc_audits'
    ];
BEGIN
    FOREACH tbl IN ARRAY updated_tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS handle_updated_at_%I ON public.%I', tbl, tbl);
        EXECUTE format(
            'CREATE TRIGGER handle_updated_at_%I
             BEFORE UPDATE ON public.%I
             FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()',
            tbl, tbl
        );
    END LOOP;
END;
$$;

DO $$
DECLARE
    tbl TEXT;
    audited_tables TEXT[] := ARRAY[
        'sgc_nc_stages',
        'sgc_action_stages',
        'sgc_nc_severities',
        'sgc_nc_origins',
        'sgc_nc_causes',
        'sgc_actions',
        'sgc_nonconformities',
        'sgc_nonconformity_actions',
        'sgc_nonconformity_origins',
        'sgc_nonconformity_causes',
        'sgc_audits',
        'sgc_audit_auditors',
        'sgc_audit_auditees',
        'sgc_audit_checks',
        'sgc_audit_nonconformities',
        'sgc_audit_improvement_actions',
        'sgc_reviews',
        'sgc_review_participants',
        'sgc_review_items'
    ];
BEGIN
    FOREACH tbl IN ARRAY audited_tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I_audit ON public.%I', tbl, tbl);
        EXECUTE format(
            'CREATE TRIGGER %I_audit
             AFTER INSERT OR UPDATE OR DELETE ON public.%I
             FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log()',
            tbl, tbl
        );
    END LOOP;
END;
$$;

