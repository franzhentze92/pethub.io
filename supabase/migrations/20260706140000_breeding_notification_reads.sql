-- Track read breeding/parejas notifications in user preferences

ALTER TABLE public.user_notification_preferences
  ADD COLUMN IF NOT EXISTS read_breeding_notifications text[] NOT NULL DEFAULT '{}';
