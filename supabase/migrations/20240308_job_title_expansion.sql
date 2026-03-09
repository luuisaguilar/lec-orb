-- Add job_title to org_members to track company role separately from platform role
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS job_title VARCHAR;
