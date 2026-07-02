-- Track read marketplace/order notifications

ALTER TABLE public.user_notification_preferences
  ADD COLUMN IF NOT EXISTS read_order_notifications text[] NOT NULL DEFAULT '{}';
