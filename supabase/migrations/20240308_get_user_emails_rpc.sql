-- =============================================================================
-- Function: get_users_emails
-- Purpose: Safely retrieve Auth emails for a specific list of user UUIDs.
-- Security: SECURITY DEFINER runs the function as superuser (postgres), 
-- allowing read access to the hidden `auth.users` table so we don't need 
-- the SUPABASE_SERVICE_ROLE_KEY environment variable in the application code.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_users_emails(user_ids UUID[])
RETURNS TABLE (id UUID, email VARCHAR)
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT au.id, au.email::VARCHAR
    FROM auth.users au
    WHERE au.id = ANY(user_ids);
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_users_emails(UUID[]) TO authenticated;
