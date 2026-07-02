-- Lost pets notification preferences

ALTER TABLE public.user_notification_preferences
  ADD COLUMN IF NOT EXISTS notify_lost_pets boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_lost_pets boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS read_lost_pet_notifications text[] NOT NULL DEFAULT '{}';
