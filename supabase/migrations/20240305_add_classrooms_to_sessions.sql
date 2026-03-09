-- 1. Eliminar la columna 'classrooms' de la tabla 'events' (ya que ahora vive a nivel sesión)
ALTER TABLE events DROP COLUMN IF EXISTS classrooms;

-- 2. Agregar la columna 'classrooms' a la tabla 'event_sessions'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='event_sessions' AND column_name='classrooms') THEN
        ALTER TABLE event_sessions ADD COLUMN classrooms JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;
