-- Migration: Fix duplicate hr_profiles (v2 - robust)
-- Problem: org chart UI and SQL seed used different org_ids, creating duplicates.

DO $$
DECLARE
    correct_oid uuid := '205c3ecb-5849-4232-8b58-f5d94b8cf329';
BEGIN
    -- 1. Delete ALL empty/skeleton profiles
    DELETE FROM public.hr_profiles
    WHERE mission IS NULL OR mission = '';

    RAISE NOTICE 'Step 1: Deleted empty profiles';

    -- 2. For duplicate node_ids, keep only the BEST row (prefer non-null process_id, then oldest)
    DELETE FROM public.hr_profiles
    WHERE id NOT IN (
        SELECT DISTINCT ON (node_id) id
        FROM public.hr_profiles
        ORDER BY node_id,
                 CASE WHEN process_id IS NOT NULL THEN 0 ELSE 1 END,
                 created_at ASC
    );

    RAISE NOTICE 'Step 2: Deduplicated profiles';

    -- 3. Now safe to update all profiles to the correct org_id
    UPDATE public.hr_profiles
    SET org_id = correct_oid
    WHERE org_id != correct_oid;

    RAISE NOTICE 'Step 3: All profiles now use org_id %', correct_oid;
END $$;
