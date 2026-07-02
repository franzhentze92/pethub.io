-- Push subscriptions + server auto-complete nutrition + cron to dispatch push

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  subscription jsonb NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (user_id = auth.uid() OR public.is_admin_user())
  WITH CHECK (user_id = auth.uid() OR public.is_admin_user());

-- Secrets for cron → edge function (service role key set via dashboard/SQL once)
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON TABLE private.app_secrets FROM PUBLIC;

-- Auto-complete now also writes nutrition_sessions
CREATE OR REPLACE FUNCTION public.auto_complete_all_overdue_meals()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completed integer := 0;
  v_meal record;
  v_minutes integer;
  v_meal_ts timestamptz;
  v_deadline timestamptz;
  v_qty numeric;
  v_food record;
BEGIN
  FOR v_meal IN
    SELECT am.id, am.owner_id, am.pet_id, am.scheduled_date, am.scheduled_time,
           am.meal_type, am.quantity_grams, am.food_id,
           s.auto_complete_minutes_after
    FROM public.automated_meals am
    JOIN public.pet_feeding_schedules s ON s.id = am.schedule_id
    WHERE am.status = 'scheduled'
      AND am.scheduled_date = CURRENT_DATE
      AND s.auto_complete_enabled = true
  LOOP
    v_minutes := COALESCE(v_meal.auto_complete_minutes_after, 30);
    v_meal_ts := (v_meal.scheduled_date + v_meal.scheduled_time)::timestamptz;
    v_deadline := v_meal_ts + (v_minutes || ' minutes')::interval;

    IF now() < v_deadline THEN
      CONTINUE;
    END IF;

    UPDATE public.automated_meals
    SET status = 'completed',
        completed_at = now(),
        completed_by = v_meal.owner_id,
        actual_notes = 'Auto-completed',
        updated_at = now()
    WHERE id = v_meal.id;

    SELECT * INTO v_food FROM public.pet_foods WHERE id = v_meal.food_id;
    v_qty := COALESCE(v_meal.quantity_grams, 100);

    IF NOT EXISTS (
      SELECT 1 FROM public.nutrition_sessions ns
      WHERE ns.pet_id = v_meal.pet_id
        AND ns.date = v_meal.scheduled_date
        AND ns.feeding_time = v_meal.scheduled_time
        AND ns.notes ILIKE '%Auto-completed%'
    ) THEN
      INSERT INTO public.nutrition_sessions (
        pet_id, owner_id, date, feeding_time, meal_type,
        food_name, food_category, quantity_grams,
        calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, fiber_per_100g,
        total_calories, total_protein, total_fat, total_carbs, total_fiber,
        notes
      ) VALUES (
        v_meal.pet_id,
        v_meal.owner_id,
        v_meal.scheduled_date,
        v_meal.scheduled_time,
        v_meal.meal_type,
        CASE WHEN v_food.brand IS NOT NULL AND v_food.brand <> ''
          THEN v_food.brand || ' - ' || v_food.name
          ELSE COALESCE(v_food.name, 'Alimento')
        END,
        COALESCE(v_food.food_type, 'dry_food'),
        v_qty,
        COALESCE(v_food.calories_per_100g, 350),
        COALESCE(v_food.protein_per_100g, 25),
        COALESCE(v_food.fat_per_100g, 15),
        COALESCE(v_food.carbs_per_100g, 40),
        COALESCE(v_food.fiber_per_100g, 5),
        COALESCE(v_food.calories_per_100g, 350) * v_qty / 100,
        COALESCE(v_food.protein_per_100g, 25) * v_qty / 100,
        COALESCE(v_food.fat_per_100g, 15) * v_qty / 100,
        COALESCE(v_food.carbs_per_100g, 40) * v_qty / 100,
        COALESCE(v_food.fiber_per_100g, 5) * v_qty / 100,
        'Auto-completed'
      );
    END IF;

    v_completed := v_completed + 1;
  END LOOP;

  RETURN v_completed;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.invoke_send_feeding_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions
AS $$
DECLARE
  v_key text;
  v_url text;
BEGIN
  SELECT value INTO v_key FROM private.app_secrets WHERE key = 'service_role_key';
  IF v_key IS NULL OR v_key = '' THEN
    RETURN;
  END IF;

  v_url := COALESCE(
    current_setting('app.settings.supabase_url', true),
    'https://uzcuhdkjfqqzqlxgwyjt.supabase.co'
  ) || '/functions/v1/send-feeding-reminders';

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := '{}'::jsonb
  );
END;
$$;

DO $push_cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('pethub-send-feeding-push');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    PERFORM cron.schedule(
      'pethub-send-feeding-push',
      '* * * * *',
      'SELECT public.invoke_send_feeding_reminders();'
    );
  END IF;
END;
$push_cron$;

REVOKE ALL ON FUNCTION public.invoke_send_feeding_reminders() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.get_private_app_secret(p_key text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = private
AS $$
  SELECT value FROM private.app_secrets WHERE key = p_key LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_private_app_secret(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_private_app_secret(text) TO service_role;
