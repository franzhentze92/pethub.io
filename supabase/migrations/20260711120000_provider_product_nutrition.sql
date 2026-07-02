-- Nutrition / ingredients for marketplace products (foods, supplements) — used by PetBuddy recommendations.

ALTER TABLE public.provider_products
  ADD COLUMN IF NOT EXISTS ingredients text,
  ADD COLUMN IF NOT EXISTS nutrition_protein_pct numeric(5, 2),
  ADD COLUMN IF NOT EXISTS nutrition_fat_pct numeric(5, 2),
  ADD COLUMN IF NOT EXISTS nutrition_fiber_pct numeric(5, 2),
  ADD COLUMN IF NOT EXISTS nutrition_moisture_pct numeric(5, 2),
  ADD COLUMN IF NOT EXISTS nutrition_ash_pct numeric(5, 2),
  ADD COLUMN IF NOT EXISTS nutrition_calories_per_100g numeric(8, 2);

COMMENT ON COLUMN public.provider_products.ingredients IS 'Lista de ingredientes (alimentos/suplementos). Visible en tienda y usado por PetBuddy.';
COMMENT ON COLUMN public.provider_products.nutrition_protein_pct IS 'Proteína cruda % (análisis garantizado, as-fed).';
COMMENT ON COLUMN public.provider_products.nutrition_fat_pct IS 'Grasa cruda % (análisis garantizado, as-fed).';
COMMENT ON COLUMN public.provider_products.nutrition_fiber_pct IS 'Fibra cruda % (análisis garantizado).';
COMMENT ON COLUMN public.provider_products.nutrition_moisture_pct IS 'Humedad % (análisis garantizado).';
COMMENT ON COLUMN public.provider_products.nutrition_ash_pct IS 'Cenizas % (análisis garantizado).';
COMMENT ON COLUMN public.provider_products.nutrition_calories_per_100g IS 'Metabolizable energy kcal por 100g (opcional).';
