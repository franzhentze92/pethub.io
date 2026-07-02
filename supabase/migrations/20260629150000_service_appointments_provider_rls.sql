-- Allow providers to read and update appointments for their business
ALTER TABLE public.service_appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Providers can view their appointments" ON public.service_appointments;
CREATE POLICY "Providers can view their appointments"
  ON public.service_appointments
  FOR SELECT
  TO authenticated
  USING (
    provider_id = auth.uid()
    OR provider_id IN (
      SELECT id FROM public.providers WHERE user_id = auth.uid()
    )
    OR service_id IN (
      SELECT ps.id
      FROM public.provider_services ps
      INNER JOIN public.providers p ON p.id = ps.provider_id
      WHERE p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Providers can update their appointments" ON public.service_appointments;
CREATE POLICY "Providers can update their appointments"
  ON public.service_appointments
  FOR UPDATE
  TO authenticated
  USING (
    provider_id = auth.uid()
    OR provider_id IN (
      SELECT id FROM public.providers WHERE user_id = auth.uid()
    )
    OR service_id IN (
      SELECT ps.id
      FROM public.provider_services ps
      INNER JOIN public.providers p ON p.id = ps.provider_id
      WHERE p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    provider_id = auth.uid()
    OR provider_id IN (
      SELECT id FROM public.providers WHERE user_id = auth.uid()
    )
    OR service_id IN (
      SELECT ps.id
      FROM public.provider_services ps
      INNER JOIN public.providers p ON p.id = ps.provider_id
      WHERE p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Clients can view own appointments" ON public.service_appointments;
CREATE POLICY "Clients can view own appointments"
  ON public.service_appointments
  FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

COMMENT ON POLICY "Providers can view their appointments" ON public.service_appointments IS
  'Provider sees appointments linked by user_id, providers.id, or owned services';
