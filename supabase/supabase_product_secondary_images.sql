-- Add secondary_images column to provider_products table

-- Add secondary_images column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.provider_products ADD COLUMN secondary_images TEXT[];
    EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column secondary_images already exists in public.provider_products.';
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.provider_products.secondary_images IS 'Array of up to 5 secondary image URLs for the product. Stored as TEXT array.';

-- Verify column (optional)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'provider_products'
  AND column_name = 'secondary_images';

