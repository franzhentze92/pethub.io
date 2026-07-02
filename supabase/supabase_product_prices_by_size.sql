-- Add price columns for different dog sizes to provider_products table

-- Add price_small column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.provider_products ADD COLUMN price_small NUMERIC(10, 2);
    EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column price_small already exists in public.provider_products.';
END $$;

-- Add price_medium column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.provider_products ADD COLUMN price_medium NUMERIC(10, 2);
    EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column price_medium already exists in public.provider_products.';
END $$;

-- Add price_large column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.provider_products ADD COLUMN price_large NUMERIC(10, 2);
    EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column price_large already exists in public.provider_products.';
END $$;

-- Add price_extra_large column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.provider_products ADD COLUMN price_extra_large NUMERIC(10, 2);
    EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column price_extra_large already exists in public.provider_products.';
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.provider_products.price_small IS 'Precio del producto para perros pequeños.';
COMMENT ON COLUMN public.provider_products.price_medium IS 'Precio del producto para perros medianos.';
COMMENT ON COLUMN public.provider_products.price_large IS 'Precio del producto para perros grandes.';
COMMENT ON COLUMN public.provider_products.price_extra_large IS 'Precio del producto para perros extra grandes.';

-- Verify columns (optional)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'provider_products'
  AND column_name IN ('price_small', 'price_medium', 'price_large', 'price_extra_large');

