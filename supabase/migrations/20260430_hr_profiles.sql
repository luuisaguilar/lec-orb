-- Migration: 20260430_hr_profiles.sql
-- Description: Creates the table for HR Job Profiles and Organizational Structure

CREATE TABLE IF NOT EXISTS public.hr_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    node_id VARCHAR(100) NOT NULL, -- Corresponds to the hierarchy node ID (e.g., '1', '1.1')
    role_title VARCHAR(200) NOT NULL,
    holder_name VARCHAR(200),
    area VARCHAR(100),
    role_type VARCHAR(50), -- directive, coordination, operative
    mission TEXT,
    responsibilities JSONB DEFAULT '[]'::jsonb, -- Array of strings
    requirements JSONB DEFAULT '{}'::jsonb, -- { education, experience, specialty, languages, knowledge }
    parent_node_id VARCHAR(100), -- Reference to the parent node_id for tree reconstruction
    process_id VARCHAR(50) REFERENCES public.sgc_processes(id) ON DELETE SET NULL,
    last_pdf_path TEXT, -- Path in sgc-documents bucket
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, node_id)
);

-- Enable RLS
ALTER TABLE public.hr_profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "hr_profiles_select" ON public.hr_profiles FOR SELECT TO authenticated
USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "hr_profiles_insert" ON public.hr_profiles FOR INSERT TO authenticated
WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')));

CREATE POLICY "hr_profiles_update" ON public.hr_profiles FOR UPDATE TO authenticated
USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')));

CREATE POLICY "hr_profiles_delete" ON public.hr_profiles FOR DELETE TO authenticated
USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')));

-- Index for faster hierarchy lookups
CREATE INDEX IF NOT EXISTS idx_hr_profiles_org_node ON public.hr_profiles(org_id, node_id);
CREATE INDEX IF NOT EXISTS idx_hr_profiles_parent ON public.hr_profiles(org_id, parent_node_id);
