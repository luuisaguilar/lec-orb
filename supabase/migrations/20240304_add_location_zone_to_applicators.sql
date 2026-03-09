-- ================================================================
-- Add location_zone to applicators
-- Separate from city (ciudad_origen): represents the zone/sede
-- where the applicator works in-person.
-- Values: 'Hermosillo', 'Obregón', 'Baja California', or NULL
-- ================================================================

ALTER TABLE applicators
    ADD COLUMN IF NOT EXISTS location_zone TEXT;

CREATE INDEX IF NOT EXISTS idx_applicators_location_zone ON applicators(location_zone);

-- Auto-assign zones based on known city values already in the table
UPDATE applicators SET location_zone = 'Hermosillo'
WHERE (city ILIKE '%hermosillo%' OR city ILIKE '%agua prieta%')
  AND location_zone IS NULL;

UPDATE applicators SET location_zone = 'Obregón'
WHERE (city ILIKE '%obregon%' OR city ILIKE '%obregón%' OR city ILIKE '%cd obregon%' OR city ILIKE '%cd. obregon%')
  AND location_zone IS NULL;

UPDATE applicators SET location_zone = 'Baja California'
WHERE (city ILIKE '%tijuana%' OR city ILIKE '%ensenada%' OR city ILIKE '%rosarito%')
  AND location_zone IS NULL;
