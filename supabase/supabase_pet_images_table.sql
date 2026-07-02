-- Multiple images per pet (up to 10) for pets, adoption_pets, and lost_pets

CREATE TABLE IF NOT EXISTS public.pet_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  adoption_pet_id UUID REFERENCES public.adoption_pets(id) ON DELETE CASCADE,
  lost_pet_id UUID REFERENCES public.lost_pets(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pet_images_single_parent CHECK (
    (CASE WHEN pet_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN adoption_pet_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN lost_pet_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  )
);

CREATE INDEX IF NOT EXISTS idx_pet_images_pet_id ON public.pet_images(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_images_adoption_pet_id ON public.pet_images(adoption_pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_images_lost_pet_id ON public.pet_images(lost_pet_id);

ALTER TABLE public.pet_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pet_images_select_all" ON public.pet_images;
CREATE POLICY "pet_images_select_all"
ON public.pet_images FOR SELECT
USING (true);

DROP POLICY IF EXISTS "pet_images_manage_pet_owner" ON public.pet_images;
CREATE POLICY "pet_images_manage_pet_owner"
ON public.pet_images FOR ALL
TO authenticated
USING (
  (pet_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.pets p WHERE p.id = pet_images.pet_id AND p.owner_id = auth.uid()
  ))
  OR
  (adoption_pet_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.adoption_pets ap WHERE ap.id = pet_images.adoption_pet_id AND ap.owner_id = auth.uid()
  ))
  OR
  (lost_pet_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.lost_pets lp WHERE lp.id = pet_images.lost_pet_id AND lp.owner_id = auth.uid()
  ))
)
WITH CHECK (
  (pet_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.pets p WHERE p.id = pet_images.pet_id AND p.owner_id = auth.uid()
  ))
  OR
  (adoption_pet_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.adoption_pets ap WHERE ap.id = pet_images.adoption_pet_id AND ap.owner_id = auth.uid()
  ))
  OR
  (lost_pet_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.lost_pets lp WHERE lp.id = pet_images.lost_pet_id AND lp.owner_id = auth.uid()
  ))
);

-- Backfill: copy existing image_url into pet_images for pets that have one
INSERT INTO public.pet_images (pet_id, image_url, display_order)
SELECT p.id, p.image_url, 0
FROM public.pets p
WHERE p.image_url IS NOT NULL AND p.image_url <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.pet_images pi WHERE pi.pet_id = p.id
  );

INSERT INTO public.pet_images (adoption_pet_id, image_url, display_order)
SELECT ap.id, ap.image_url, 0
FROM public.adoption_pets ap
WHERE ap.image_url IS NOT NULL AND ap.image_url <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.pet_images pi WHERE pi.adoption_pet_id = ap.id
  );

INSERT INTO public.pet_images (lost_pet_id, image_url, display_order)
SELECT lp.id, lp.image_url, 0
FROM public.lost_pets lp
WHERE lp.image_url IS NOT NULL AND lp.image_url <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.pet_images pi WHERE pi.lost_pet_id = lp.id
  );
