-- When an HR org-chart profile title changes, keep linked member and pending invitation job titles in sync.

CREATE OR REPLACE FUNCTION public.sync_job_title_from_hr_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.role_title IS DISTINCT FROM OLD.role_title THEN
        UPDATE public.org_members
        SET job_title = NEW.role_title
        WHERE hr_profile_id = NEW.id;

        UPDATE public.org_invitations
        SET job_title = NEW.role_title
        WHERE hr_profile_id = NEW.id
          AND status = 'pending';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hr_profiles_sync_job_title ON public.hr_profiles;

CREATE TRIGGER trg_hr_profiles_sync_job_title
    AFTER UPDATE OF role_title ON public.hr_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_job_title_from_hr_profile();
