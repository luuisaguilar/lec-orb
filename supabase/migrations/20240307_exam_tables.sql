-- Migration: 20240307_exam_tables.sql
-- Description: Creates tables for TOEFL codes, Administrations, and General Exam Codes.

-- TOEFL Codes Table
CREATE TABLE IF NOT EXISTS public.toefl_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    folio VARCHAR(50) UNIQUE NOT NULL,
    test_type VARCHAR(50) NOT NULL, -- Primary, Junior, ITP
    voucher_code VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'ASSIGNED', 'USED', 'EXPIRED')),
    assigned_to VARCHAR(150), -- Student Name
    assigned_at TIMESTAMP WITH TIME ZONE,
    expiration_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true
);

-- TOEFL Administrations Table
CREATE TABLE IF NOT EXISTS public.toefl_administrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES public.schools(id),
    test_date TIMESTAMP WITH TIME ZONE NOT NULL,
    test_type VARCHAR(50) NOT NULL,
    expected_students INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'PLANNING' CHECK (status IN ('PLANNING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true
);

-- General Exam Codes Table (Cambridge, etc.)
CREATE TABLE IF NOT EXISTS public.exam_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_type VARCHAR(50) NOT NULL, -- KET, PET, FCE...
    code VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'USED', 'EXPIRED')),
    registration_date DATE,
    expiration_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true
);

-- RLS
ALTER TABLE public.toefl_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toefl_administrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Full access to authenticated" ON public.toefl_codes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Full access to authenticated" ON public.toefl_administrations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Full access to authenticated" ON public.exam_codes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER handle_updated_at_toefl_codes BEFORE UPDATE ON public.toefl_codes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at_toefl_admin BEFORE UPDATE ON public.toefl_administrations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at_exam_codes BEFORE UPDATE ON public.exam_codes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Triggers for Audit
CREATE TRIGGER toefl_codes_audit AFTER INSERT OR UPDATE OR DELETE ON public.toefl_codes FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE TRIGGER toefl_admin_audit AFTER INSERT OR UPDATE OR DELETE ON public.toefl_administrations FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE TRIGGER exam_codes_audit AFTER INSERT OR UPDATE OR DELETE ON public.exam_codes FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
