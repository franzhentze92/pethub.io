-- Server-side helpers for feeding schedules (used by RPC + optional pg_cron)

CREATE OR REPLACE FUNCTION public.generate_daily_meals_from_schedules(target_date date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid := auth.uid();
  v_day integer;
  v_inserted integer := 0;
  v_schedule record;
  v_feeding jsonb;
  v_time text;
  v_meal_type text;
  v_food_id uuid;
  v_qty numeric;
BEGIN
  IF v_owner IS NULL THEN
    RETURN 0;
  END IF;

  v_day := EXTRACT(ISODOW FROM target_date)::integer;

  FOR v_schedule IN
    SELECT *
    FROM public.pet_feeding_schedules
    WHERE owner_id = v_owner
      AND is_active = true
      AND auto_generate_meals = true
      AND target_date >= start_date
      AND (end_date IS NULL OR target_date <= end_date)
      AND v_day = ANY(days_of_week)
  LOOP
    FOR v_feeding IN SELECT * FROM jsonb_array_elements(v_schedule.feeding_times)
    LOOP
      v_time := v_feeding->>'time';
      v_meal_type := v_feeding->>'meal_type';
      v_food_id := NULLIF(v_feeding->>'food_id', '')::uuid;
      v_qty := COALESCE(NULLIF(v_feeding->>'quantity_grams', '')::numeric, 100);

      IF v_food_id IS NULL THEN
        CONTINUE;
      END IF;

      IF EXISTS (
        SELECT 1 FROM public.automated_meals am
        WHERE am.owner_id = v_owner
          AND am.schedule_id = v_schedule.id
          AND am.scheduled_date = target_date
          AND am.scheduled_time = v_time::time
          AND am.meal_type = v_meal_type
      ) THEN
        CONTINUE;
      END IF;

      INSERT INTO public.automated_meals (
        owner_id, pet_id, schedule_id, food_id,
        scheduled_date, scheduled_time, meal_type, quantity_grams, status
      ) VALUES (
        v_owner, v_schedule.pet_id, v_schedule.id, v_food_id,
        target_date, v_time::time, v_meal_type, v_qty, 'scheduled'
      );

      v_inserted := v_inserted + 1;
    END LOOP;
  END LOOP;

  RETURN v_inserted;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_complete_overdue_meals()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid := auth.uid();
  v_completed integer := 0;
  v_meal record;
  v_minutes integer;
  v_meal_ts timestamptz;
  v_deadline timestamptz;
BEGIN
  IF v_owner IS NULL THEN
    RETURN 0;
  END IF;

  FOR v_meal IN
    SELECT am.id, am.scheduled_date, am.scheduled_time,
           s.auto_complete_minutes_after
    FROM public.automated_meals am
    JOIN public.pet_feeding_schedules s ON s.id = am.schedule_id
    WHERE am.owner_id = v_owner
      AND am.status = 'scheduled'
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
          completed_by = v_owner,
          actual_notes = 'Auto-completed',
          updated_at = now()
      WHERE id = v_meal.id;

      v_completed := v_completed + 1;
    END IF;
  END LOOP;

  RETURN v_completed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_daily_meals_from_schedules(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_complete_overdue_meals() TO authenticated;
