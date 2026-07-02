-- Allow multiple gallery images per provider service (main + up to 5 secondary)
ALTER TABLE public.provider_services
ADD COLUMN IF NOT EXISTS secondary_images text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.provider_services.secondary_images IS 'Additional service gallery images (up to 5 URLs)';
