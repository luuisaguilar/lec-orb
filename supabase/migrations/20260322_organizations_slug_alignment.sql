-- Align organization slug handling with the current multi-tenant schema.
-- Policy:
--   * INSERT: slug is always generated/normalized in the database
--   * UPDATE: slug stays stable unless an explicit new slug is provided or slug is blank

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS slug text;

CREATE OR REPLACE FUNCTION public.slugify_organization(value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  normalized text;
BEGIN
  normalized := lower(trim(coalesce(value, '')));
  normalized := extensions.unaccent(normalized);
  normalized := regexp_replace(normalized, '&', ' and ', 'g');
  normalized := regexp_replace(normalized, '[^a-z0-9]+', '-', 'g');
  normalized := regexp_replace(normalized, '-{2,}', '-', 'g');
  normalized := trim(both '-' from normalized);

  IF normalized = '' THEN
    RETURN 'organization';
  END IF;

  RETURN normalized;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_organization_slug(
  org_name text,
  requested_slug text DEFAULT NULL,
  current_org_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
  candidate_slug text;
  suffix integer := 2;
BEGIN
  base_slug := public.slugify_organization(
    COALESCE(NULLIF(btrim(requested_slug), ''), org_name)
  );
  candidate_slug := base_slug;

  WHILE EXISTS (
    SELECT 1
    FROM public.organizations
    WHERE slug = candidate_slug
      AND (current_org_id IS NULL OR id <> current_org_id)
  ) LOOP
    candidate_slug := base_slug || '-' || suffix::text;
    suffix := suffix + 1;
  END LOOP;

  RETURN candidate_slug;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_organization_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.slug := public.generate_organization_slug(NEW.name, NEW.slug, NULL);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.slug IS NULL OR btrim(NEW.slug) = '' THEN
      NEW.slug := public.generate_organization_slug(NEW.name, NULL, NEW.id);
    ELSIF NEW.slug IS DISTINCT FROM OLD.slug THEN
      NEW.slug := public.generate_organization_slug(NEW.name, NEW.slug, NEW.id);
    ELSE
      NEW.slug := OLD.slug;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_organizations_set_slug ON public.organizations;
CREATE TRIGGER trg_organizations_set_slug
BEFORE INSERT OR UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.set_organization_slug();

DO $$
DECLARE
  org record;
BEGIN
  FOR org IN
    SELECT id, name, slug
    FROM public.organizations
    ORDER BY created_at NULLS LAST, id
  LOOP
    UPDATE public.organizations
    SET slug = public.generate_organization_slug(org.name, org.slug, org.id)
    WHERE id = org.id;
  END LOOP;
END;
$$;

ALTER TABLE public.organizations
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_slug_unique
  ON public.organizations (slug);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  new_org_id uuid;
  user_name text;
BEGIN
  user_name := NULLIF(
    btrim(
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        split_part(COALESCE(NEW.email, ''), '@', 1)
      )
    ),
    ''
  );

  IF user_name IS NULL THEN
    user_name := 'New User';
  END IF;

  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, user_name, NEW.email)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.organizations (name)
  VALUES (user_name || '''s Organization')
  RETURNING id INTO new_org_id;

  INSERT INTO public.org_members (user_id, org_id, role)
  VALUES (NEW.id, new_org_id, 'admin')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
