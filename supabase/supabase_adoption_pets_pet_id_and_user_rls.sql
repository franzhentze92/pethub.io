-- Link adoption listings to the owner's pet profile (peer-to-peer adoptions)
ALTER TABLE public.adoption_pets
  ADD COLUMN IF NOT EXISTS pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_adoption_pets_pet_id ON public.adoption_pets(pet_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_adoption_pets_one_active_per_pet
  ON public.adoption_pets(pet_id)
  WHERE pet_id IS NOT NULL AND status = 'available';

DROP POLICY IF EXISTS "Pet owners view applications for own listings" ON public.adoption_applications;
CREATE POLICY "Pet owners view applications for own listings"
  ON public.adoption_applications
  FOR SELECT
  USING (
    pet_id IN (
      SELECT id FROM public.adoption_pets
      WHERE owner_id = auth.uid() AND shelter_id IS NULL
    )
  );

DROP POLICY IF EXISTS "Pet owners update applications for own listings" ON public.adoption_applications;
CREATE POLICY "Pet owners update applications for own listings"
  ON public.adoption_applications
  FOR UPDATE
  USING (
    pet_id IN (
      SELECT id FROM public.adoption_pets
      WHERE owner_id = auth.uid() AND shelter_id IS NULL
    )
  )
  WITH CHECK (
    pet_id IN (
      SELECT id FROM public.adoption_pets
      WHERE owner_id = auth.uid() AND shelter_id IS NULL
    )
  );
