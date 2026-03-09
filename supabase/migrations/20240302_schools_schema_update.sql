-- ================================================================
-- Update Schools Table Schema (Adding Venues/Sedes Data)
-- Run this script in the Supabase SQL Editor
-- ================================================================

-- Add the new columns to the existing schools table
ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS levels TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS rooms JSONB DEFAULT '[]'::jsonb;

-- Ensure the rooms JSONB is indexed for faster querying if needed
CREATE INDEX IF NOT EXISTS idx_schools_rooms ON public.schools USING GIN (rooms);
