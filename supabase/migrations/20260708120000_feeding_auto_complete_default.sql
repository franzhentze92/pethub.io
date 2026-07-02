-- Auto-completado activado por defecto (comportamiento esperado por dueños de mascota)
ALTER TABLE public.pet_feeding_schedules
  ALTER COLUMN auto_complete_enabled SET DEFAULT true;

UPDATE public.pet_feeding_schedules
SET auto_complete_enabled = true,
    updated_at = now()
WHERE auto_complete_enabled = false;
