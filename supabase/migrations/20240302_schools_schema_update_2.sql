-- Fix Schools table missing columns from the Revamp (Phase 15)
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS levels TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS rooms JSONB DEFAULT '[]'::jsonb;
