-- ================================================================
-- Assign location_zone to all existing applicators by external_id
-- Based on the applicator list provided by the user
-- Run this AFTER the 20240304_add_location_zone_to_applicators.sql migration
-- ================================================================

-- HERMOSILLO ZONE
UPDATE applicators SET location_zone = 'Hermosillo' WHERE external_id IN (
    'AA99JH', -- Claudia Beltrán
    'DB44DG', -- Ivonne Guadalupe Calleja Avila
    'CF56DA', -- Claudia Camarena Gómez
    'AA99JD', -- Marisela Castillo Huerta
    'BJ69HC', -- Maria Nelly Gutierrez Arvizu
    'CF57JA', -- Silvia Selene Moreno Carrasco
    'CF57JE', -- Ana Maria Peralta (Agua Prieta → Hermosillo zone)
    'BJ60CE', -- Claudia Ramos Merino
    'AA99JK', -- Laura Guadalupe Zatarain Nogales
    'AD13DB', -- Francisco Saldaña (Nuevo León)
    'DG21EG'  -- Andrea Orozco
);

-- OBREGÓN ZONE
UPDATE applicators SET location_zone = 'Obregón' WHERE external_id IN (
    'AC43DH', -- Yolanda Maria Felix Miranda
    'CK04CG', -- Ruth Haydee Quintero Ortega
    'CF57KC', -- Karla Valdez Solis
    'CK04BG', -- Karen López del Castillo
    'DE67FE', -- María Jesús Dominguez Ramos
    'DG23GC'  -- Gabriela De la Rosa Ornelas
);

-- BAJA CALIFORNIA ZONE
UPDATE applicators SET location_zone = 'Baja California' WHERE external_id IN (
    'CJ49BG', -- Janett Hernandez Arriaga (Tijuana)
    'CJ49CA', -- Julieta Nuñez Oviedo (Ensenada)
    'DE69EC', -- Lesli Fernanda Mejia Chavez (Ensenada)
    'DE69GJ', -- Myrel Díaz Mercado (Ensenada)
    'CF52CG'  -- Claudia Santillan (Rosarito)
);

-- Verify: check any applicators that still have no zone assigned
SELECT id, name, external_id, city, location_zone
FROM applicators
WHERE location_zone IS NULL
  AND deleted_at IS NULL
ORDER BY name;
