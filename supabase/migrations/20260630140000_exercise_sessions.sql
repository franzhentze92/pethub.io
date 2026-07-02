-- Exercise sessions: schema, constraints and RLS (idempotent)

CREATE TABLE IF NOT EXISTS public.exercise_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_type text NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  intensity text NOT NULL,
  date date NOT NULL,
  notes text,
  calories_burned integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exercise_sessions
  DROP CONSTRAINT IF EXISTS exercise_sessions_exercise_type_check;

ALTER TABLE public.exercise_sessions
  ADD CONSTRAINT exercise_sessions_exercise_type_check
  CHECK (exercise_type IN (
    'walk', 'run', 'play', 'swimming', 'agility', 'training',
    'fetch', 'hiking', 'tug', 'hide', 'obstacle', 'other'
  ));

ALTER TABLE public.exercise_sessions
  DROP CONSTRAINT IF EXISTS exercise_sessions_intensity_check;

ALTER TABLE public.exercise_sessions
  ADD CONSTRAINT exercise_sessions_intensity_check
  CHECK (intensity IN ('low', 'medium', 'high'));

CREATE INDEX IF NOT EXISTS idx_exercise_sessions_owner_date
  ON public.exercise_sessions (owner_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_exercise_sessions_pet_date
  ON public.exercise_sessions (pet_id, date DESC);

ALTER TABLE public.exercise_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own exercise sessions" ON public.exercise_sessions;
CREATE POLICY "Users manage own exercise sessions"
  ON public.exercise_sessions
  FOR ALL
  USING (owner_id = auth.uid() OR public.is_admin_user())
  WITH CHECK (owner_id = auth.uid() OR public.is_admin_user());
