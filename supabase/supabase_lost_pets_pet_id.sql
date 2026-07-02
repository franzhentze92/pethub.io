-- Link lost pet reports to source pets so images stay in sync

ALTER TABLE public.lost_pets
ADD COLUMN IF NOT EXISTS pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lost_pets_pet_id ON public.lost_pets(pet_id);

-- Backfill pet_id from owner + name match
UPDATE public.lost_pets lp
SET pet_id = p.id
FROM public.pets p
WHERE lp.pet_id IS NULL
  AND lp.owner_id = p.owner_id
  AND lower(trim(lp.name)) = lower(trim(p.name));

-- Refresh lost pet gallery from linked pet images
DELETE FROM public.pet_images pi
USING public.lost_pets lp
WHERE pi.lost_pet_id = lp.id
  AND lp.pet_id IS NOT NULL
  AND lp.status = 'lost';

INSERT INTO public.pet_images (lost_pet_id, image_url, display_order)
SELECT lp.id, src.image_url, src.display_order
FROM public.lost_pets lp
JOIN public.pet_images src ON src.pet_id = lp.pet_id
WHERE lp.pet_id IS NOT NULL
  AND lp.status = 'lost'
ORDER BY lp.id, src.display_order;

UPDATE public.lost_pets lp
SET image_url = sub.image_url
FROM (
  SELECT lp2.id AS lost_pet_id,
    (
      SELECT pi.image_url
      FROM public.pet_images pi
      WHERE pi.pet_id = lp2.pet_id
      ORDER BY pi.display_order ASC
      LIMIT 1
    ) AS image_url
  FROM public.lost_pets lp2
  WHERE lp2.pet_id IS NOT NULL
    AND lp2.status = 'lost'
) sub
WHERE lp.id = sub.lost_pet_id
  AND sub.image_url IS NOT NULL;
