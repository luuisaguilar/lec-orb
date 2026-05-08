-- Migration: 20260521_org_locations_catalog.sql
-- Phase 2: per-organization catalog of sedes (assignable to members and invitations).

CREATE TABLE IF NOT EXISTS public.org_locations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name varchar(200) NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT org_locations_name_not_empty CHECK (btrim(name) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS org_locations_org_name_unique
    ON public.org_locations (org_id, lower(btrim(name)));

CREATE INDEX IF NOT EXISTS idx_org_locations_org_active_sort
    ON public.org_locations (org_id, is_active, sort_order, name);

ALTER TABLE public.org_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_locations_select_members" ON public.org_locations;
DROP POLICY IF EXISTS "org_locations_insert_admins" ON public.org_locations;
DROP POLICY IF EXISTS "org_locations_update_admins" ON public.org_locations;
DROP POLICY IF EXISTS "org_locations_delete_admins" ON public.org_locations;

CREATE POLICY "org_locations_select_members"
    ON public.org_locations FOR SELECT
    USING (
        org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
    );

CREATE POLICY "org_locations_insert_admins"
    ON public.org_locations FOR INSERT
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "org_locations_update_admins"
    ON public.org_locations FOR UPDATE
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "org_locations_delete_admins"
    ON public.org_locations FOR DELETE
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Seed defaults per organization.
INSERT INTO public.org_locations (org_id, name, sort_order)
SELECT o.id, 'SONORA', 10
FROM public.organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM public.org_locations l
    WHERE l.org_id = o.id AND lower(btrim(l.name)) = lower('SONORA')
);

INSERT INTO public.org_locations (org_id, name, sort_order)
SELECT o.id, 'BAJA CALIFORNIA', 20
FROM public.organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM public.org_locations l
    WHERE l.org_id = o.id AND lower(btrim(l.name)) = lower('BAJA CALIFORNIA')
);

INSERT INTO public.org_locations (org_id, name, sort_order)
SELECT o.id, 'NUEVO LEON', 30
FROM public.organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM public.org_locations l
    WHERE l.org_id = o.id AND lower(btrim(l.name)) = lower('NUEVO LEON')
);

-- Import distinct legacy free-text locations still in use.
INSERT INTO public.org_locations (org_id, name, sort_order)
SELECT d.org_id, btrim(d.location), 100
FROM (
    SELECT DISTINCT org_id, location
    FROM public.org_members
    WHERE location IS NOT NULL AND btrim(location) <> ''
    UNION
    SELECT DISTINCT org_id, location
    FROM public.org_invitations
    WHERE location IS NOT NULL AND btrim(location) <> ''
) d
WHERE NOT EXISTS (
    SELECT 1 FROM public.org_locations l
    WHERE l.org_id = d.org_id AND lower(btrim(l.name)) = lower(btrim(d.location))
);
