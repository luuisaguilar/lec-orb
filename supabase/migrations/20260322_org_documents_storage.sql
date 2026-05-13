-- Provision private storage for the Documents module with tenant isolation by org path.
-- Path contract:
--   <org_id>/<module_slug>/<record_id|general>/<timestamp>.<ext>
-- The application remains responsible for fine-grained authorization and signed URL issuance.

INSERT INTO storage.buckets (id, name, public)
VALUES ('org-documents', 'org-documents', false)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = EXCLUDED.public;

DROP POLICY IF EXISTS "org_documents_select" ON storage.objects;
CREATE POLICY "org_documents_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'org-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT org_id::text
    FROM public.org_members
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "org_documents_insert" ON storage.objects;
CREATE POLICY "org_documents_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'org-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT org_id::text
    FROM public.org_members
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "org_documents_update" ON storage.objects;
CREATE POLICY "org_documents_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'org-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT org_id::text
    FROM public.org_members
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'org-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT org_id::text
    FROM public.org_members
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "org_documents_delete" ON storage.objects;
CREATE POLICY "org_documents_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'org-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT org_id::text
    FROM public.org_members
    WHERE user_id = auth.uid()
  )
);
