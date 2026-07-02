-- Allow adoption listing owners to view applicant profile details
DROP POLICY IF EXISTS "Pet owners view applicant profiles" ON public.user_profiles;
CREATE POLICY "Pet owners view applicant profiles"
  ON public.user_profiles
  FOR SELECT
  USING (
    user_id IN (
      SELECT aa.applicant_id
      FROM public.adoption_applications aa
      INNER JOIN public.adoption_pets ap ON ap.id = aa.pet_id
      WHERE ap.owner_id = auth.uid() AND ap.shelter_id IS NULL
    )
    OR user_id IN (
      SELECT aa.applicant_id
      FROM public.adoption_applications aa
      INNER JOIN public.adoption_pets ap ON ap.id = aa.pet_id
      INNER JOIN public.shelters s ON s.id = ap.shelter_id
      WHERE s.owner_id = auth.uid()
    )
  );
