-- 1. Add new estatus values to the cenni_status ENUM
ALTER TYPE cenni_status ADD VALUE IF NOT EXISTS 'SOLICITADO';
ALTER TYPE cenni_status ADD VALUE IF NOT EXISTS 'EN OFICINA/POR ENVIAR';
