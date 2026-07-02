ALTER TABLE public.service_appointments
  ADD COLUMN IF NOT EXISTS slot_end_time TIME WITHOUT TIME ZONE;

COMMENT ON COLUMN public.service_appointments.slot_end_time IS
  'End time of the booked slot (denormalized when slot is generated client-side).';
