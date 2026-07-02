-- Nutrition & feeding schema (idempotent)

CREATE TABLE IF NOT EXISTS public.pet_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text,
  food_type text NOT NULL DEFAULT 'dry_food',
  species text NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  calories_per_100g numeric,
  protein_per_100g numeric,
  fat_per_100g numeric,
  fiber_per_100g numeric,
  carbs_per_100g numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pet_feeding_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  schedule_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  feeding_times jsonb NOT NULL DEFAULT '[]'::jsonb,
  days_of_week integer[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6,7],
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  auto_generate_meals boolean NOT NULL DEFAULT true,
  send_notifications boolean NOT NULL DEFAULT true,
  notification_minutes_before integer NOT NULL DEFAULT 15,
  auto_complete_enabled boolean NOT NULL DEFAULT false,
  auto_complete_minutes_after integer NOT NULL DEFAULT 30,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.automated_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  schedule_id uuid NOT NULL REFERENCES public.pet_feeding_schedules(id) ON DELETE CASCADE,
  food_id uuid NOT NULL REFERENCES public.pet_foods(id),
  scheduled_date date NOT NULL,
  scheduled_time time NOT NULL,
  meal_type text NOT NULL,
  quantity_grams numeric NOT NULL CHECK (quantity_grams > 0),
  status text NOT NULL DEFAULT 'scheduled',
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id),
  actual_quantity_grams numeric,
  actual_food_id uuid REFERENCES public.pet_foods(id),
  actual_meal_type text,
  actual_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nutrition_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  feeding_time time,
  meal_type text,
  food_name text NOT NULL,
  food_category text,
  quantity_grams numeric NOT NULL CHECK (quantity_grams > 0),
  notes text,
  calories_per_100g numeric,
  protein_per_100g numeric,
  fat_per_100g numeric,
  carbs_per_100g numeric,
  fiber_per_100g numeric,
  total_calories numeric,
  total_protein numeric,
  total_fat numeric,
  total_carbs numeric,
  total_fiber numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feeding_schedule_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  schedule_id uuid NOT NULL REFERENCES public.pet_feeding_schedules(id) ON DELETE CASCADE,
  meal_id uuid REFERENCES public.automated_meals(id) ON DELETE SET NULL,
  notification_type text NOT NULL,
  scheduled_time timestamptz NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automated_meals
  DROP CONSTRAINT IF EXISTS automated_meals_status_check;
ALTER TABLE public.automated_meals
  ADD CONSTRAINT automated_meals_status_check
  CHECK (status IN ('scheduled', 'completed', 'skipped', 'modified'));

ALTER TABLE public.nutrition_sessions
  DROP CONSTRAINT IF EXISTS nutrition_sessions_meal_type_check;
ALTER TABLE public.nutrition_sessions
  ADD CONSTRAINT nutrition_sessions_meal_type_check
  CHECK (meal_type IS NULL OR meal_type IN ('breakfast', 'lunch', 'dinner', 'snack'));

CREATE INDEX IF NOT EXISTS idx_nutrition_sessions_owner_date
  ON public.nutrition_sessions (owner_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_pet_feeding_schedules_owner
  ON public.pet_feeding_schedules (owner_id);

CREATE INDEX IF NOT EXISTS idx_automated_meals_owner_date
  ON public.automated_meals (owner_id, scheduled_date DESC);

ALTER TABLE public.pet_feeding_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automated_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feeding_schedule_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_foods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own feeding schedules" ON public.pet_feeding_schedules;
CREATE POLICY "Users manage own feeding schedules"
  ON public.pet_feeding_schedules FOR ALL
  USING (owner_id = auth.uid() OR public.is_admin_user())
  WITH CHECK (owner_id = auth.uid() OR public.is_admin_user());

DROP POLICY IF EXISTS "Users manage own automated meals" ON public.automated_meals;
CREATE POLICY "Users manage own automated meals"
  ON public.automated_meals FOR ALL
  USING (owner_id = auth.uid() OR public.is_admin_user())
  WITH CHECK (owner_id = auth.uid() OR public.is_admin_user());

DROP POLICY IF EXISTS "Users manage own nutrition sessions" ON public.nutrition_sessions;
CREATE POLICY "Users manage own nutrition sessions"
  ON public.nutrition_sessions FOR ALL
  USING (owner_id = auth.uid() OR public.is_admin_user())
  WITH CHECK (owner_id = auth.uid() OR public.is_admin_user());

DROP POLICY IF EXISTS "Anyone can read pet foods" ON public.pet_foods;
CREATE POLICY "Anyone can read pet foods"
  ON public.pet_foods FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin manage pet foods" ON public.pet_foods;
CREATE POLICY "Admin manage pet foods"
  ON public.pet_foods FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Users manage own feeding notifications" ON public.feeding_schedule_notifications;
CREATE POLICY "Users manage own feeding notifications"
  ON public.feeding_schedule_notifications FOR ALL
  USING (owner_id = auth.uid() OR public.is_admin_user())
  WITH CHECK (owner_id = auth.uid() OR public.is_admin_user());
