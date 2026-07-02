-- Add clothing size price columns to provider_products table

-- Add price_xs column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.provider_products ADD COLUMN price_xs NUMERIC(10, 2);
    EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column price_xs already exists in public.provider_products.';
END $$;

-- Add price_s column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.provider_products ADD COLUMN price_s NUMERIC(10, 2);
    EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column price_s already exists in public.provider_products.';
END $$;

-- Add price_m column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.provider_products ADD COLUMN price_m NUMERIC(10, 2);
    EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column price_m already exists in public.provider_products.';
END $$;

-- Add price_l column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.provider_products ADD COLUMN price_l NUMERIC(10, 2);
    EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column price_l already exists in public.provider_products.';
END $$;

-- Add price_xl column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.provider_products ADD COLUMN price_xl NUMERIC(10, 2);
    EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column price_xl already exists in public.provider_products.';
END $$;

-- Add price_xxl column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.provider_products ADD COLUMN price_xxl NUMERIC(10, 2);
    EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column price_xxl already exists in public.provider_products.';
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.provider_products.price_xs IS 'Price for extra small clothing size (XS).';
COMMENT ON COLUMN public.provider_products.price_s IS 'Price for small clothing size (S).';
COMMENT ON COLUMN public.provider_products.price_m IS 'Price for medium clothing size (M).';
COMMENT ON COLUMN public.provider_products.price_l IS 'Price for large clothing size (L).';
COMMENT ON COLUMN public.provider_products.price_xl IS 'Price for extra large clothing size (XL).';
COMMENT ON COLUMN public.provider_products.price_xxl IS 'Price for extra extra large clothing size (XXL).';

-- Verify columns (optional)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'provider_products'
  AND column_name IN ('price_xs', 'price_s', 'price_m', 'price_l', 'price_xl', 'price_xxl');

