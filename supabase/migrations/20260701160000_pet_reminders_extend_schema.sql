-- Extend pet_reminders for manual/custom reminders (title, time, frequency, etc.)

ALTER TABLE public.pet_reminders
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS scheduled_time time,
  ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'once',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

UPDATE public.pet_reminders
SET title = COALESCE(title, initcap(replace(reminder_type, '_', ' ')))
WHERE title IS NULL;

ALTER TABLE public.pet_reminders
  ALTER COLUMN title SET DEFAULT 'Recordatorio';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.pet_reminders WHERE title IS NULL
  ) THEN
    UPDATE public.pet_reminders SET title = 'Recordatorio' WHERE title IS NULL;
  END IF;
END $$;

ALTER TABLE public.pet_reminders
  DROP CONSTRAINT IF EXISTS pet_reminders_frequency_check;
ALTER TABLE public.pet_reminders
  ADD CONSTRAINT pet_reminders_frequency_check
  CHECK (frequency IN ('once', 'daily', 'weekly', 'monthly'));

ALTER TABLE public.pet_reminders
  DROP CONSTRAINT IF EXISTS pet_reminders_priority_check;
ALTER TABLE public.pet_reminders
  ADD CONSTRAINT pet_reminders_priority_check
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

CREATE INDEX IF NOT EXISTS idx_pet_reminders_owner_active
  ON public.pet_reminders (owner_id, is_active, is_completed);
