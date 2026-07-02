-- Add price columns for different dog sizes to provider_services table

-- Add price_small column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.provider_services ADD COLUMN price_small NUMERIC(10, 2);
    EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column price_small already exists in public.provider_services.';
END $$;

-- Add price_medium column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.provider_services ADD COLUMN price_medium NUMERIC(10, 2);
    EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column price_medium already exists in public.provider_services.';
END $$;

-- Add price_large column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.provider_services ADD COLUMN price_large NUMERIC(10, 2);
    EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column price_large already exists in public.provider_services.';
END $$;

-- Add price_extra_large column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.provider_services ADD COLUMN price_extra_large NUMERIC(10, 2);
    EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column price_extra_large already exists in public.provider_services.';
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.provider_services.price_small IS 'Precio del servicio para perros pequeños (hasta 10 kg).';
COMMENT ON COLUMN public.provider_services.price_medium IS 'Precio del servicio para perros medianos (11 - 25 kg).';
COMMENT ON COLUMN public.provider_services.price_large IS 'Precio del servicio para perros grandes (26 - 45 kg).';
COMMENT ON COLUMN public.provider_services.price_extra_large IS 'Precio del servicio para perros extra grandes (más de 45 kg).';

-- Verify columns (optional)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'provider_services'
  AND column_name IN ('price_small', 'price_medium', 'price_large', 'price_extra_large');

