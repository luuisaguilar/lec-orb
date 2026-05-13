-- OOPT: persist split batches as "projects" (results + Storage PDFs), optional link to events,
--       and free-text fields for logistics / analysis / general notes.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Tables
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.oopt_projects (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    event_id                UUID REFERENCES public.events(id) ON DELETE SET NULL,
    title                   TEXT NOT NULL,
    logistics_notes         TEXT,
    analysis_notes          TEXT,
    general_notes           TEXT,
    source_pdf_filename     TEXT,
    source_pdf_storage_path TEXT,
    total_pages             INTEGER NOT NULL DEFAULT 0,
    processed_count         INTEGER NOT NULL DEFAULT 0,
    errors_count             INTEGER NOT NULL DEFAULT 0,
    split_errors            JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_oopt_projects_org_created
    ON public.oopt_projects(org_id, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_oopt_projects_event
    ON public.oopt_projects(event_id)
    WHERE deleted_at IS NULL AND event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.oopt_results (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id          UUID NOT NULL REFERENCES public.oopt_projects(id) ON DELETE CASCADE,
    page_number         INTEGER NOT NULL,
    original_name       TEXT NOT NULL DEFAULT '',
    final_name          TEXT NOT NULL DEFAULT '',
    level               TEXT NOT NULL DEFAULT '',
    score               TEXT NOT NULL DEFAULT '',
    result_date         TEXT NOT NULL DEFAULT '',
    source              TEXT NOT NULL DEFAULT 'pdf' CHECK (source IN ('table', 'pdf')),
    filename            TEXT NOT NULL,
    pdf_storage_path    TEXT NOT NULL,
    ue_score            TEXT NOT NULL DEFAULT '',
    ue_cef              TEXT NOT NULL DEFAULT '',
    li_score            TEXT NOT NULL DEFAULT '',
    li_cef              TEXT NOT NULL DEFAULT '',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_oopt_results_project ON public.oopt_results(project_id);
CREATE INDEX IF NOT EXISTS idx_oopt_results_org ON public.oopt_results(org_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RLS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.oopt_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oopt_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oopt_projects_select"
    ON public.oopt_projects FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL
        AND org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
    );

CREATE POLICY "oopt_projects_insert"
    ON public.oopt_projects FOR INSERT
    TO authenticated
    WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "oopt_projects_update"
    ON public.oopt_projects FOR UPDATE
    TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "oopt_projects_delete"
    ON public.oopt_projects FOR DELETE
    TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

CREATE POLICY "oopt_results_select"
    ON public.oopt_results FOR SELECT
    TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "oopt_results_insert"
    ON public.oopt_results FOR INSERT
    TO authenticated
    WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "oopt_results_delete"
    ON public.oopt_results FOR DELETE
    TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Storage bucket (private; first path segment = org_id)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('oopt-projects', 'oopt-projects', false)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, public = EXCLUDED.public;

DROP POLICY IF EXISTS "oopt_projects_storage_select" ON storage.objects;
CREATE POLICY "oopt_projects_storage_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'oopt-projects'
  AND (storage.foldername(name))[1] IN (
    SELECT org_id::text
    FROM public.org_members
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "oopt_projects_storage_insert" ON storage.objects;
CREATE POLICY "oopt_projects_storage_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'oopt-projects'
  AND (storage.foldername(name))[1] IN (
    SELECT org_id::text
    FROM public.org_members
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "oopt_projects_storage_update" ON storage.objects;
CREATE POLICY "oopt_projects_storage_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'oopt-projects'
  AND (storage.foldername(name))[1] IN (
    SELECT org_id::text
    FROM public.org_members
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'oopt-projects'
  AND (storage.foldername(name))[1] IN (
    SELECT org_id::text
    FROM public.org_members
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "oopt_projects_storage_delete" ON storage.objects;
CREATE POLICY "oopt_projects_storage_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'oopt-projects'
  AND (storage.foldername(name))[1] IN (
    SELECT org_id::text
    FROM public.org_members
    WHERE user_id = auth.uid()
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Allow saving projects: anyone who already has oopt-pdf view gets edit
--    (server still enforces checkServerPermission for mutations).
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.member_module_access
SET can_edit = true
WHERE module = 'oopt-pdf' AND can_view = true AND can_edit = false;

-- Allow supervisors/admins who can edit to also remove saved projects (API checks role too).
UPDATE public.member_module_access
SET can_delete = true
WHERE module = 'oopt-pdf' AND can_edit = true AND can_delete = false
  AND member_id IN (
      SELECT om.id
      FROM public.org_members om
      WHERE om.role IN ('admin', 'supervisor')
  );
