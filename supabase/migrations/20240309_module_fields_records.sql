-- Migration: 20240309_module_fields_records.sql
-- Description: Creates module_fields (schema definition) and module_records (JSONB data)
--              tables for the LEC Studio no-code module builder.
--              These tables only store data for CUSTOM modules (is_native=false).
--              Native modules continue using their own dedicated tables.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. module_fields — Schema definition for custom module fields
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.module_fields (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id     UUID NOT NULL REFERENCES public.module_registry(id) ON DELETE CASCADE,
    name          VARCHAR(50) NOT NULL,        -- snake_case key used in data JSONB
    label         VARCHAR(100) NOT NULL,       -- Human-readable label shown in UI
    field_type    VARCHAR(30) NOT NULL
        CHECK (field_type IN (
            'text', 'textarea', 'number', 'currency', 'date', 'datetime',
            'select', 'multiselect', 'boolean', 'email', 'phone', 'url',
            'file', 'relation', 'formula', 'status'
        )),
    is_required   BOOLEAN DEFAULT false,
    default_value TEXT,
    options       JSONB DEFAULT '{}',
    -- options structure by type:
    -- text/textarea:  {max_length: int}
    -- number:         {min: num, max: num, decimals: int}
    -- currency:       {currency: "MXN"}
    -- select:         {choices: ["A","B","C"]}
    -- multiselect:    {choices: [...]}
    -- status:         {stages: ["draft","active","done"]}
    -- relation:       {target_module: "schools", display_field: "name"}
    -- formula:        {expression: "price * qty"}
    -- file:           {accept: ".pdf,.jpg", max_size_mb: 10}
    sort_order    INT DEFAULT 0,
    show_in_list  BOOLEAN DEFAULT true,        -- Show as column in list/table view
    is_searchable BOOLEAN DEFAULT false,       -- Include in full-text search
    validation    JSONB DEFAULT '{}',          -- {min, max, regex, unique}
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    -- Field names must be unique within a module
    UNIQUE(module_id, name)
);

CREATE INDEX IF NOT EXISTS idx_module_fields_module ON public.module_fields(module_id, sort_order);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. module_records — JSONB data store for custom module records
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.module_records (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id   UUID NOT NULL REFERENCES public.module_registry(id) ON DELETE CASCADE,
    org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    data        JSONB NOT NULL DEFAULT '{}',
    -- data is a flat key-value store where keys match module_fields.name
    -- Example: {"client_name": "LEC", "status": "active", "amount": 1500}
    created_by  UUID REFERENCES auth.users(id),
    updated_by  UUID REFERENCES auth.users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    is_active   BOOLEAN DEFAULT true
);

-- GIN index for fast JSONB queries and full-text search
CREATE INDEX IF NOT EXISTS idx_module_records_data ON public.module_records USING GIN (data);
-- Composite index for list queries (most common: by module + org)
CREATE INDEX IF NOT EXISTS idx_module_records_module_org ON public.module_records(module_id, org_id, is_active);
-- Sorting by creation time
CREATE INDEX IF NOT EXISTS idx_module_records_created ON public.module_records(module_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Auto updated_at triggers
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_module_records') THEN
        CREATE TRIGGER handle_updated_at_module_records
            BEFORE UPDATE ON public.module_records
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS for module_fields
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.module_fields ENABLE ROW LEVEL SECURITY;

-- Any org member can view fields for their org's modules
CREATE POLICY "module_fields_select"
    ON public.module_fields FOR SELECT
    TO authenticated
    USING (
        module_id IN (
            SELECT mr.id FROM public.module_registry mr
            WHERE mr.org_id IS NULL
               OR mr.org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
        )
    );

-- Only admins can create/edit/delete fields (via Studio)
CREATE POLICY "module_fields_write"
    ON public.module_fields FOR ALL
    TO authenticated
    USING (
        module_id IN (
            SELECT mr.id FROM public.module_registry mr
            WHERE mr.org_id IN (
                SELECT org_id FROM public.org_members
                WHERE user_id = auth.uid() AND role = 'admin'
            )
        )
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RLS for module_records
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.module_records ENABLE ROW LEVEL SECURITY;

-- Org members can read records belonging to their org
CREATE POLICY "module_records_select"
    ON public.module_records FOR SELECT
    TO authenticated
    USING (
        org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
    );

-- Org members can insert records for their org
CREATE POLICY "module_records_insert"
    ON public.module_records FOR INSERT
    TO authenticated
    WITH CHECK (
        org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
    );

-- Org members can update records for their org
CREATE POLICY "module_records_update"
    ON public.module_records FOR UPDATE
    TO authenticated
    USING (
        org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
    );

-- Only admins/supervisors can delete (soft-delete via is_active)
CREATE POLICY "module_records_delete"
    ON public.module_records FOR DELETE
    TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );
