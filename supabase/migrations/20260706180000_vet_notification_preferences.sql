-- Veterinary notification read tracking and push preference

ALTER TABLE public.user_notification_preferences
  ADD COLUMN IF NOT EXISTS push_vet boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS read_vet_notifications text[] NOT NULL DEFAULT '{}';
