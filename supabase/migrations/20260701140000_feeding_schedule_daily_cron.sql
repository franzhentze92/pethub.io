-- Server-side daily meal generation + auto-complete (runs without the app open)

CREATE OR REPLACE FUNCTION public.generate_daily_meals_for_all_users(p_days_ahead integer DEFAULT 7)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
  v_day_offset integer;
  v_target date;
  v_day integer;
  v_schedule record;
  v_feeding jsonb;
  v_time text;
  v_meal_type text;
  v_food_id uuid;
  v_qty numeric;
  v_meal_id uuid;
  v_reminder_at timestamptz;
BEGIN
  p_days_ahead := GREATEST(1, LEAST(p_days_ahead, 14));

  FOR v_day_offset IN 0..(p_days_ahead - 1) LOOP
    v_target := CURRENT_DATE + v_day_offset;
    v_day := EXTRACT(ISODOW FROM v_target)::integer;

    FOR v_schedule IN
      SELECT *
      FROM public.pet_feeding_schedules
      WHERE is_active = true
        AND auto_generate_meals = true
        AND v_target >= start_date
        AND (end_date IS NULL OR v_target <= end_date)
        AND v_day = ANY(days_of_week)
    LOOP
      FOR v_feeding IN SELECT * FROM jsonb_array_elements(v_schedule.feeding_times)
      LOOP
        v_time := v_feeding->>'time';
        v_meal_type := v_feeding->>'meal_type';
        v_food_id := NULLIF(v_feeding->>'food_id', '')::uuid;
        v_qty := COALESCE(NULLIF(v_feeding->>'quantity_grams', '')::numeric, 100);

        IF v_food_id IS NULL OR v_time IS NULL OR v_meal_type IS NULL THEN
          CONTINUE;
        END IF;

        IF EXISTS (
          SELECT 1 FROM public.automated_meals am
          WHERE am.owner_id = v_schedule.owner_id
            AND am.schedule_id = v_schedule.id
            AND am.scheduled_date = v_target
            AND am.scheduled_time = v_time::time
            AND am.meal_type = v_meal_type
        ) THEN
          CONTINUE;
        END IF;

        INSERT INTO public.automated_meals (
          owner_id, pet_id, schedule_id, food_id,
          scheduled_date, scheduled_time, meal_type, quantity_grams, status
        ) VALUES (
          v_schedule.owner_id, v_schedule.pet_id, v_schedule.id, v_food_id,
          v_target, v_time::time, v_meal_type, v_qty, 'scheduled'
        )
        RETURNING id INTO v_meal_id;

        v_inserted := v_inserted + 1;

        IF v_schedule.send_notifications THEN
          v_reminder_at := (v_target + v_time::time)::timestamptz
            - (COALESCE(v_schedule.notification_minutes_before, 15) || ' minutes')::interval;

          INSERT INTO public.feeding_schedule_notifications (
            owner_id, pet_id, schedule_id, meal_id,
            notification_type, scheduled_time, message, status
          ) VALUES (
            v_schedule.owner_id,
            v_schedule.pet_id,
            v_schedule.id,
            v_meal_id,
            'upcoming_feeding',
            v_reminder_at,
            'Recordatorio: alimentar — ' || v_schedule.schedule_name,
            'pending'
          );
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN v_inserted;
END;
$$;

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
BEGIN
  FOR v_meal IN
    SELECT am.id, am.owner_id, am.scheduled_date, am.scheduled_time,
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

    IF now() >= v_deadline THEN
      UPDATE public.automated_meals
      SET status = 'completed',
          completed_at = now(),
          completed_by = v_meal.owner_id,
          actual_notes = 'Auto-completed',
          updated_at = now()
      WHERE id = v_meal.id;

      v_completed := v_completed + 1;
    END IF;
  END LOOP;

  RETURN v_completed;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

DO $cron_setup$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('pethub-generate-daily-meals');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      PERFORM cron.unschedule('pethub-auto-complete-meals');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    PERFORM cron.schedule(
      'pethub-generate-daily-meals',
      '0 6 * * *',
      'SELECT public.generate_daily_meals_for_all_users(7);'
    );

    PERFORM cron.schedule(
      'pethub-auto-complete-meals',
      '*/5 * * * *',
      'SELECT public.auto_complete_all_overdue_meals();'
    );
  END IF;
END;
$cron_setup$;

REVOKE ALL ON FUNCTION public.generate_daily_meals_for_all_users(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auto_complete_all_overdue_meals() FROM PUBLIC;
