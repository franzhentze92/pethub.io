-- Structured fields so marketplace filters work reliably (not only by keyword guessing)
ALTER TABLE public.provider_products
  ADD COLUMN IF NOT EXISTS target_species text[] NOT NULL DEFAULT ARRAY['todos']::text[],
  ADD COLUMN IF NOT EXISTS product_subtype text,
  ADD COLUMN IF NOT EXISTS life_stage text;

COMMENT ON COLUMN public.provider_products.target_species IS 'Target pets: perro, gato, ave, roedor, todos';
COMMENT ON COLUMN public.provider_products.product_subtype IS 'Category-specific subtype for marketplace filters (e.g. seco, collar, antipulgas)';
COMMENT ON COLUMN public.provider_products.life_stage IS 'Life stage when relevant: cachorro, adulto, senior';

-- Best-effort backfill for existing rows
UPDATE public.provider_products
SET target_species = ARRAY['perro']::text[]
WHERE target_species = ARRAY['todos']::text[]
  AND (
    product_name ILIKE '%perro%' OR product_name ILIKE '%dog%' OR product_name ILIKE '%canino%'
    OR description ILIKE '%perro%' OR description ILIKE '%dog%'
    OR EXISTS (SELECT 1 FROM unnest(COALESCE(tags, ARRAY[]::text[])) t WHERE t ILIKE '%perro%' OR t ILIKE '%dog%')
  )
  AND NOT (
    product_name ILIKE '%gato%' OR product_name ILIKE '%cat%' OR product_name ILIKE '%felino%'
    OR description ILIKE '%gato%' OR description ILIKE '%cat%'
  );

UPDATE public.provider_products
SET target_species = ARRAY['gato']::text[]
WHERE target_species = ARRAY['todos']::text[]
  AND (
    product_name ILIKE '%gato%' OR product_name ILIKE '%cat%' OR product_name ILIKE '%felino%'
    OR description ILIKE '%gato%' OR description ILIKE '%cat%'
    OR EXISTS (SELECT 1 FROM unnest(COALESCE(tags, ARRAY[]::text[])) t WHERE t ILIKE '%gato%' OR t ILIKE '%cat%')
  );
