-- Fix RLS policies for provider_service_availability table
-- This ensures that all authenticated users (clients) can view service availability
-- for active services, not just the service owner

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view service availability" ON public.provider_service_availability;
DROP POLICY IF EXISTS "Providers can manage their own service availability" ON public.provider_service_availability;
DROP POLICY IF EXISTS "Clients can view active service availability" ON public.provider_service_availability;

-- Policy 1: All authenticated users can view availability for active services
-- This allows clients to see when services are available for booking
CREATE POLICY "Authenticated users can view active service availability"
ON public.provider_service_availability
FOR SELECT
TO authenticated
USING (
  -- Check if the service is active
  EXISTS (
    SELECT 1
    FROM public.provider_services
    WHERE provider_services.id = provider_service_availability.service_id
      AND provider_services.is_active = true
  )
  AND provider_service_availability.is_available = true
);

-- Policy 2: Providers can manage (insert, update, delete) their own service availability
CREATE POLICY "Providers can manage their own service availability"
ON public.provider_service_availability
FOR ALL
TO authenticated
USING (
  -- Check if user is the provider who owns the service
  EXISTS (
    SELECT 1
    FROM public.provider_services
    JOIN public.providers ON providers.id = provider_services.provider_id
    WHERE provider_services.id = provider_service_availability.service_id
      AND providers.user_id = auth.uid()
  )
)
WITH CHECK (
  -- Same check for INSERT/UPDATE
  EXISTS (
    SELECT 1
    FROM public.provider_services
    JOIN public.providers ON providers.id = provider_services.provider_id
    WHERE provider_services.id = provider_service_availability.service_id
      AND providers.user_id = auth.uid()
  )
);

-- Verify RLS is enabled
ALTER TABLE public.provider_service_availability ENABLE ROW LEVEL SECURITY;

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'provider_service_availability'
ORDER BY policyname;

-- Additional check: Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'provider_service_availability';

