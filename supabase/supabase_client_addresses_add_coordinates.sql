-- Add latitude and longitude columns to client_addresses table
-- This allows clients to mark their exact address location on a map
-- for more accurate delivery cost calculation

-- Add latitude column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'client_addresses' 
    AND column_name = 'latitude'
  ) THEN
    ALTER TABLE public.client_addresses
    ADD COLUMN latitude NUMERIC(10, 8) NULL;
  END IF;
END $$;

-- Add longitude column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'client_addresses' 
    AND column_name = 'longitude'
  ) THEN
    ALTER TABLE public.client_addresses
    ADD COLUMN longitude NUMERIC(11, 8) NULL;
  END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_client_addresses_latitude ON public.client_addresses(latitude);
CREATE INDEX IF NOT EXISTS idx_client_addresses_longitude ON public.client_addresses(longitude);
CREATE INDEX IF NOT EXISTS idx_client_addresses_coordinates ON public.client_addresses(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add check constraints to ensure valid coordinate ranges
-- Latitude: -90 to 90
-- Longitude: -180 to 180
ALTER TABLE public.client_addresses
DROP CONSTRAINT IF EXISTS chk_latitude_range;

ALTER TABLE public.client_addresses
ADD CONSTRAINT chk_latitude_range CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

ALTER TABLE public.client_addresses
DROP CONSTRAINT IF EXISTS chk_longitude_range;

ALTER TABLE public.client_addresses
ADD CONSTRAINT chk_longitude_range CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

-- Verify the columns were added
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'client_addresses'
  AND column_name IN ('latitude', 'longitude')
ORDER BY column_name;

