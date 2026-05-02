-- Migration: 20260430_whatsapp_leads.sql
-- Description: Creates a table to store leads captured via WhatsApp Bot

CREATE TABLE IF NOT EXISTS public.whatsapp_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    full_name TEXT,
    course_interest TEXT,
    details TEXT, -- Additional info like exam type
    status TEXT DEFAULT 'nuevo', -- nuevo, contactado, inscrito, descartado
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.whatsapp_leads ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (so the bot can save data without a user session)
-- Note: In production, you might want to use a service role or a specific API key
CREATE POLICY "Allow public insert for whatsapp_leads" 
ON public.whatsapp_leads FOR INSERT 
WITH CHECK (true);

-- Allow authenticated users (staff) to read/update leads
CREATE POLICY "Allow authenticated read for whatsapp_leads" 
ON public.whatsapp_leads FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated update for whatsapp_leads" 
ON public.whatsapp_leads FOR UPDATE 
TO authenticated 
USING (true);
