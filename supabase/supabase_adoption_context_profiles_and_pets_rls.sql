-- Applicants can view listing owner profiles for pets they applied to
DROP POLICY IF EXISTS "Applicants view listing owner profiles" ON public.user_profiles;
CREATE POLICY "Applicants view listing owner profiles"
  ON public.user_profiles
  FOR SELECT
  USING (
    user_id IN (
      SELECT ap.owner_id
      FROM public.adoption_applications aa
      INNER JOIN public.adoption_pets ap ON ap.id = aa.pet_id
      WHERE aa.applicant_id = auth.uid()
    )
  );

-- Listing owners can view pets owned by adoption applicants
DROP POLICY IF EXISTS "Listing owners view applicant pets" ON public.pets;
CREATE POLICY "Listing owners view applicant pets"
  ON public.pets
  FOR SELECT
  USING (
    owner_id IN (
      SELECT aa.applicant_id
      FROM public.adoption_applications aa
      INNER JOIN public.adoption_pets ap ON ap.id = aa.pet_id
      WHERE ap.owner_id = auth.uid() AND ap.shelter_id IS NULL
    )
  );

-- Applicants can view source pets linked to listings they applied to
DROP POLICY IF EXISTS "Applicants view adoption listing source pets" ON public.pets;
CREATE POLICY "Applicants view adoption listing source pets"
  ON public.pets
  FOR SELECT
  USING (
    id IN (
      SELECT ap.pet_id
      FROM public.adoption_applications aa
      INNER JOIN public.adoption_pets ap ON ap.id = aa.pet_id
      WHERE aa.applicant_id = auth.uid()
        AND ap.pet_id IS NOT NULL
    )
  );
