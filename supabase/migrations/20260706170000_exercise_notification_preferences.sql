-- Exercise notification preferences and read tracking

ALTER TABLE public.user_notification_preferences
  ADD COLUMN IF NOT EXISTS notify_exercise boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_exercise boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS read_exercise_notifications text[] NOT NULL DEFAULT '{}';
