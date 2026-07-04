-- Radio de cobertura en km para paseadores

ALTER TABLE public.dog_walker_profiles
  ADD COLUMN IF NOT EXISTS coverage_radius_km numeric(5, 2) NOT NULL DEFAULT 3
  CHECK (coverage_radius_km > 0 AND coverage_radius_km <= 30);

COMMENT ON COLUMN public.dog_walker_profiles.coverage_radius_km IS
  'Radio en km desde la ubicación del paseador donde ofrece servicio';
