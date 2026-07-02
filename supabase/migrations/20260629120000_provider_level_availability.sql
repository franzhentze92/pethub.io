-- Provider-level availability (applies to all services by default)
CREATE TABLE IF NOT EXISTS public.provider_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_availability_provider_id
  ON public.provider_availability(provider_id);

CREATE TABLE IF NOT EXISTS public.provider_time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  slot_start_time time NOT NULL,
  slot_end_time time NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  max_bookings_per_slot integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_time_slots_provider_id
  ON public.provider_time_slots(provider_id);

ALTER TABLE public.provider_services
  ADD COLUMN IF NOT EXISTS uses_custom_availability boolean NOT NULL DEFAULT false;

ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_time_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view provider availability" ON public.provider_availability;
CREATE POLICY "Authenticated users can view provider availability"
  ON public.provider_availability FOR SELECT TO authenticated
  USING (is_available = true);

DROP POLICY IF EXISTS "Providers can manage own availability" ON public.provider_availability;
CREATE POLICY "Providers can manage own availability"
  ON public.provider_availability FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.user_id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view provider time slots" ON public.provider_time_slots;
CREATE POLICY "Authenticated users can view provider time slots"
  ON public.provider_time_slots FOR SELECT TO authenticated
  USING (is_available = true);

DROP POLICY IF EXISTS "Providers can manage own time slots" ON public.provider_time_slots;
CREATE POLICY "Providers can manage own time slots"
  ON public.provider_time_slots FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.user_id = auth.uid()));
