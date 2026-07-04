-- Pickup / meeting point for dog walk requests

ALTER TABLE public.dog_walk_requests
  ADD COLUMN IF NOT EXISTS pickup_latitude double precision,
  ADD COLUMN IF NOT EXISTS pickup_longitude double precision,
  ADD COLUMN IF NOT EXISTS pickup_address text;

COMMENT ON COLUMN public.dog_walk_requests.pickup_latitude IS 'Latitud del punto de encuentro / recogida del perro';
COMMENT ON COLUMN public.dog_walk_requests.pickup_longitude IS 'Longitud del punto de encuentro / recogida del perro';
COMMENT ON COLUMN public.dog_walk_requests.pickup_address IS 'Dirección legible del punto de encuentro';
