-- ─────────────────────────────────────────────────────────────────────────────
-- F2: Document Management System (DMS)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.documents (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id       UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    module_slug  VARCHAR(50) NOT NULL,
    record_id    UUID,
    file_name    VARCHAR(255) NOT NULL,
    file_path    VARCHAR(500) NOT NULL,
    file_size    BIGINT,
    mime_type    VARCHAR(100),
    tags         TEXT[] DEFAULT '{}',
    uploaded_by  UUID REFERENCES auth.users(id),
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_record ON public.documents(module_slug, record_id);
CREATE INDEX IF NOT EXISTS idx_documents_org ON public.documents(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON public.documents USING GIN (tags);

-- RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_select" ON public.documents FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "documents_insert" ON public.documents FOR INSERT TO authenticated
    WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "documents_delete" ON public.documents FOR DELETE TO authenticated
    USING (org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
    ));

-- Register in module_registry
INSERT INTO public.module_registry (slug, name, icon, category, is_native, sort_order, description)
VALUES ('documents', 'Documentos', 'FolderOpen', 'Ajustes', true, 64, 'Gestión de archivos y documentos')
ON CONFLICT DO NOTHING;
