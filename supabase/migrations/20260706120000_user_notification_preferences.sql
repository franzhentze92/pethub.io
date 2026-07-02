-- User notification preferences (Ajustes → Notificaciones)

CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_feeding boolean NOT NULL DEFAULT true,
  notify_breeding boolean NOT NULL DEFAULT true,
  notify_adoption boolean NOT NULL DEFAULT true,
  notify_orders boolean NOT NULL DEFAULT true,
  notify_vet boolean NOT NULL DEFAULT true,
  notify_account boolean NOT NULL DEFAULT true,
  push_feeding boolean NOT NULL DEFAULT true,
  push_orders boolean NOT NULL DEFAULT true,
  push_breeding boolean NOT NULL DEFAULT true,
  push_adoption boolean NOT NULL DEFAULT true,
  dismissed_account_prompts text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own notification preferences" ON public.user_notification_preferences;
CREATE POLICY "Users manage own notification preferences"
  ON public.user_notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_user_notification_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_notification_preferences_updated_at ON public.user_notification_preferences;
CREATE TRIGGER trg_user_notification_preferences_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_user_notification_preferences_updated_at();
