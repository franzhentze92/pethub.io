-- Dog walker profiles and walk requests (Paseos feature)

CREATE TABLE IF NOT EXISTS public.dog_walker_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  bio text,
  hourly_rate numeric(10, 2) NOT NULL DEFAULT 50 CHECK (hourly_rate >= 0),
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  location_label text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  max_dogs integer NOT NULL DEFAULT 3 CHECK (max_dogs > 0),
  experience_years integer NOT NULL DEFAULT 0 CHECK (experience_years >= 0),
  availability_notes text,
  coverage_radius_km numeric(5, 2) NOT NULL DEFAULT 3 CHECK (coverage_radius_km > 0 AND coverage_radius_km <= 30),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dog_walker_profiles_active
  ON public.dog_walker_profiles (is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_dog_walker_profiles_location
  ON public.dog_walker_profiles (latitude, longitude);

CREATE TABLE IF NOT EXISTS public.dog_walk_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  walker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'paid', 'completed')),
  message text,
  requested_date date NOT NULL,
  requested_time time,
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  price numeric(10, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dog_walk_requests_no_self CHECK (client_id <> walker_id)
);

CREATE INDEX IF NOT EXISTS idx_dog_walk_requests_client
  ON public.dog_walk_requests (client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dog_walk_requests_walker
  ON public.dog_walk_requests (walker_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dog_walk_requests_status
  ON public.dog_walk_requests (status);

-- Link chat rooms to walk requests
ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS dog_walk_request_id uuid
  REFERENCES public.dog_walk_requests(id) ON DELETE CASCADE;

-- Column may exist without FK if added before dog_walk_requests table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chat_rooms'
      AND column_name = 'dog_walk_request_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chat_rooms_dog_walk_request_id_fkey'
  ) THEN
    ALTER TABLE public.chat_rooms
      ADD CONSTRAINT chat_rooms_dog_walk_request_id_fkey
      FOREIGN KEY (dog_walk_request_id)
      REFERENCES public.dog_walk_requests(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_rooms_dog_walk_request_id
  ON public.chat_rooms (dog_walk_request_id)
  WHERE dog_walk_request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_rooms_dog_walk_request_unique
  ON public.chat_rooms (dog_walk_request_id)
  WHERE dog_walk_request_id IS NOT NULL;

-- Update chat_rooms check constraint to allow walk requests
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chat_rooms_match_or_application_check'
  ) THEN
    ALTER TABLE public.chat_rooms DROP CONSTRAINT chat_rooms_match_or_application_check;
  END IF;

  ALTER TABLE public.chat_rooms
  ADD CONSTRAINT chat_rooms_link_check
  CHECK (
    (
      breeding_match_id IS NOT NULL
      AND adoption_application_id IS NULL
      AND dog_walk_request_id IS NULL
    ) OR (
      breeding_match_id IS NULL
      AND adoption_application_id IS NOT NULL
      AND dog_walk_request_id IS NULL
    ) OR (
      breeding_match_id IS NULL
      AND adoption_application_id IS NULL
      AND dog_walk_request_id IS NOT NULL
    )
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- RLS: dog_walker_profiles
ALTER TABLE public.dog_walker_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active walker profiles" ON public.dog_walker_profiles;
CREATE POLICY "Anyone can view active walker profiles"
  ON public.dog_walker_profiles FOR SELECT
  USING (is_active = true OR user_id = auth.uid() OR public.is_admin_user());

DROP POLICY IF EXISTS "Users manage own walker profile" ON public.dog_walker_profiles;
CREATE POLICY "Users manage own walker profile"
  ON public.dog_walker_profiles FOR ALL
  USING (user_id = auth.uid() OR public.is_admin_user())
  WITH CHECK (user_id = auth.uid() OR public.is_admin_user());

-- RLS: dog_walk_requests
ALTER TABLE public.dog_walk_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants view walk requests" ON public.dog_walk_requests;
CREATE POLICY "Participants view walk requests"
  ON public.dog_walk_requests FOR SELECT
  USING (
    client_id = auth.uid()
    OR walker_id = auth.uid()
    OR public.is_admin_user()
  );

DROP POLICY IF EXISTS "Clients create walk requests" ON public.dog_walk_requests;
CREATE POLICY "Clients create walk requests"
  ON public.dog_walk_requests FOR INSERT
  WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS "Participants update walk requests" ON public.dog_walk_requests;
CREATE POLICY "Participants update walk requests"
  ON public.dog_walk_requests FOR UPDATE
  USING (
    client_id = auth.uid()
    OR walker_id = auth.uid()
    OR public.is_admin_user()
  );

-- RLS: chat_rooms for walk requests
DROP POLICY IF EXISTS "Users can read walk chat rooms" ON public.chat_rooms;
CREATE POLICY "Users can read walk chat rooms"
  ON public.chat_rooms FOR SELECT
  USING (
    auth.uid() = owner1_id
    OR auth.uid() = owner2_id
    OR EXISTS (
      SELECT 1 FROM public.dog_walk_requests dwr
      WHERE dwr.id = chat_rooms.dog_walk_request_id
      AND (dwr.client_id = auth.uid() OR dwr.walker_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.adoption_applications aa
      INNER JOIN public.adoption_pets ap ON ap.id = aa.pet_id
      WHERE aa.id = chat_rooms.adoption_application_id
      AND (aa.applicant_id = auth.uid() OR ap.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create walk chat rooms" ON public.chat_rooms;
CREATE POLICY "Users can create walk chat rooms"
  ON public.chat_rooms FOR INSERT
  WITH CHECK (
    (
      dog_walk_request_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.dog_walk_requests dwr
        WHERE dwr.id = dog_walk_request_id
        AND (dwr.client_id = auth.uid() OR dwr.walker_id = auth.uid())
      )
      AND (owner1_id = auth.uid() OR owner2_id = auth.uid())
    )
    OR (
      adoption_application_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.adoption_applications aa
        WHERE aa.id = adoption_application_id
        AND (
          aa.applicant_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.adoption_pets ap
            WHERE ap.id = aa.pet_id AND ap.owner_id = auth.uid()
          )
        )
      )
      AND (owner1_id = auth.uid() OR owner2_id = auth.uid())
    )
    OR (
      breeding_match_id IS NOT NULL
      AND (owner1_id = auth.uid() OR owner2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can read walk chat messages" ON public.chat_messages;
CREATE POLICY "Users can read walk chat messages"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_rooms cr
      WHERE cr.id = chat_messages.chat_room_id
      AND (
        cr.owner1_id = auth.uid()
        OR cr.owner2_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.dog_walk_requests dwr
          WHERE dwr.id = cr.dog_walk_request_id
          AND (dwr.client_id = auth.uid() OR dwr.walker_id = auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM public.adoption_applications aa
          INNER JOIN public.adoption_pets ap ON ap.id = aa.pet_id
          WHERE aa.id = cr.adoption_application_id
          AND (aa.applicant_id = auth.uid() OR ap.owner_id = auth.uid())
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can send walk chat messages" ON public.chat_messages;
CREATE POLICY "Users can send walk chat messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_rooms cr
      WHERE cr.id = chat_messages.chat_room_id
      AND (
        cr.owner1_id = auth.uid()
        OR cr.owner2_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.dog_walk_requests dwr
          WHERE dwr.id = cr.dog_walk_request_id
          AND (dwr.client_id = auth.uid() OR dwr.walker_id = auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM public.adoption_applications aa
          INNER JOIN public.adoption_pets ap ON ap.id = aa.pet_id
          WHERE aa.id = cr.adoption_application_id
          AND (aa.applicant_id = auth.uid() OR ap.owner_id = auth.uid())
        )
      )
    )
  );

COMMENT ON TABLE public.dog_walker_profiles IS 'Client users offering dog walking services in their area';
COMMENT ON TABLE public.dog_walk_requests IS 'Walk booking requests between clients and walkers';
-- Dog walk notification preferences

ALTER TABLE public.user_notification_preferences
  ADD COLUMN IF NOT EXISTS notify_dog_walks boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_dog_walks boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS read_dog_walk_notifications text[] NOT NULL DEFAULT '{}';
-- Radio de cobertura en km para paseadores

ALTER TABLE public.dog_walker_profiles
  ADD COLUMN IF NOT EXISTS coverage_radius_km numeric(5, 2) NOT NULL DEFAULT 3
  CHECK (coverage_radius_km > 0 AND coverage_radius_km <= 30);

COMMENT ON COLUMN public.dog_walker_profiles.coverage_radius_km IS
  'Radio en km desde la ubicaciÃ³n del paseador donde ofrece servicio';
-- Multiple pets per dog walk request

CREATE TABLE IF NOT EXISTS public.dog_walk_request_pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.dog_walk_requests(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, pet_id)
);

CREATE INDEX IF NOT EXISTS idx_dog_walk_request_pets_request
  ON public.dog_walk_request_pets (request_id);

CREATE INDEX IF NOT EXISTS idx_dog_walk_request_pets_pet
  ON public.dog_walk_request_pets (pet_id);

-- Backfill from existing single pet_id column
INSERT INTO public.dog_walk_request_pets (request_id, pet_id)
SELECT id, pet_id
FROM public.dog_walk_requests
WHERE pet_id IS NOT NULL
ON CONFLICT (request_id, pet_id) DO NOTHING;

ALTER TABLE public.dog_walk_request_pets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants view walk request pets" ON public.dog_walk_request_pets;
CREATE POLICY "Participants view walk request pets"
  ON public.dog_walk_request_pets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dog_walk_requests dwr
      WHERE dwr.id = dog_walk_request_pets.request_id
      AND (dwr.client_id = auth.uid() OR dwr.walker_id = auth.uid() OR public.is_admin_user())
    )
  );

DROP POLICY IF EXISTS "Clients add walk request pets" ON public.dog_walk_request_pets;
CREATE POLICY "Clients add walk request pets"
  ON public.dog_walk_request_pets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dog_walk_requests dwr
      WHERE dwr.id = dog_walk_request_pets.request_id
      AND dwr.client_id = auth.uid()
    )
  );

COMMENT ON TABLE public.dog_walk_request_pets IS 'Pets included in a dog walk booking request';
-- Pickup / meeting point for dog walk requests

ALTER TABLE public.dog_walk_requests
  ADD COLUMN IF NOT EXISTS pickup_latitude double precision,
  ADD COLUMN IF NOT EXISTS pickup_longitude double precision,
  ADD COLUMN IF NOT EXISTS pickup_address text;

COMMENT ON COLUMN public.dog_walk_requests.pickup_latitude IS 'Latitud del punto de encuentro / recogida del perro';
COMMENT ON COLUMN public.dog_walk_requests.pickup_longitude IS 'Longitud del punto de encuentro / recogida del perro';
COMMENT ON COLUMN public.dog_walk_requests.pickup_address IS 'DirecciÃ³n legible del punto de encuentro';
