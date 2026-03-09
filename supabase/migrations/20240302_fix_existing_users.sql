-- Corrección para usuarios registrados ANTES del trigger de auto-org.
-- Ejecuta este script en el SQL Editor de Supabase -> New Query.

DO $$
DECLARE
  org1_id UUID;
  org2_id UUID;
BEGIN

  -- Usuario: a.operacioneslecmx@gmail.com (usuario principal)
  INSERT INTO public.organizations (name)
  VALUES ('LEC - Organización Principal')
  RETURNING id INTO org1_id;
  
  INSERT INTO public.profiles (id, full_name)
  VALUES ('e1e54505-1a28-47a9-8465-bb108cdf7b00', 'Luis Aguilar')
  ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO public.org_members (user_id, org_id, role)
  VALUES ('e1e54505-1a28-47a9-8465-bb108cdf7b00', org1_id, 'admin')
  ON CONFLICT (user_id, org_id) DO NOTHING;

  -- Usuario: luisag.test99@gmail.com (cuenta de prueba)
  INSERT INTO public.organizations (name)
  VALUES ('Organización de Prueba')
  RETURNING id INTO org2_id;
  
  INSERT INTO public.profiles (id, full_name)
  VALUES ('7f68eed8-eea8-49f4-a07a-8264005d5944', 'Luis Test')
  ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO public.org_members (user_id, org_id, role)
  VALUES ('7f68eed8-eea8-49f4-a07a-8264005d5944', org2_id, 'admin')
  ON CONFLICT (user_id, org_id) DO NOTHING;

END $$;
