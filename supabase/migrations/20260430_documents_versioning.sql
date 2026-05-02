-- Migration: 20260430_documents_versioning.sql
-- Description: Adds versioning and format metadata to documents table

ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS version VARCHAR(20) DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS document_type VARCHAR(50); -- e.g. 'Format', 'Procedure', 'Record'

-- Add some metadata to existing docs if possible or just leave as is
COMMENT ON COLUMN public.documents.version IS 'Version or revision number of the document';
