-- Dog walk notification preferences

ALTER TABLE public.user_notification_preferences
  ADD COLUMN IF NOT EXISTS notify_dog_walks boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_dog_walks boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS read_dog_walk_notifications text[] NOT NULL DEFAULT '{}';
