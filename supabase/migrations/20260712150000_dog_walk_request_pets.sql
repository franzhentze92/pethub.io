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
