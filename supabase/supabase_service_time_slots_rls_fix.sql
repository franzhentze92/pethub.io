-- Fix RLS policies for provider_service_time_slots table
-- This ensures that all authenticated users (clients) can view time slots
-- for active services, not just the service owner

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view service time slots" ON public.provider_service_time_slots;
DROP POLICY IF EXISTS "Providers can manage their own service time slots" ON public.provider_service_time_slots;
DROP POLICY IF EXISTS "Clients can view active service time slots" ON public.provider_service_time_slots;

-- Policy 1: All authenticated users can view time slots for active services
-- This allows clients to see specific time slots when booking services
CREATE POLICY "Authenticated users can view active service time slots"
ON public.provider_service_time_slots
FOR SELECT
TO authenticated
USING (
  -- Check if the service is active
  EXISTS (
    SELECT 1
    FROM public.provider_services
    WHERE provider_services.id = provider_service_time_slots.service_id
      AND provider_services.is_active = true
  )
  AND provider_service_time_slots.is_available = true
);

-- Policy 2: Providers can manage (insert, update, delete) their own service time slots
CREATE POLICY "Providers can manage their own service time slots"
ON public.provider_service_time_slots
FOR ALL
TO authenticated
USING (
  -- Check if user is the provider who owns the service
  EXISTS (
    SELECT 1
    FROM public.provider_services
    JOIN public.providers ON providers.id = provider_services.provider_id
    WHERE provider_services.id = provider_service_time_slots.service_id
      AND providers.user_id = auth.uid()
  )
)
WITH CHECK (
  -- Same check for INSERT/UPDATE
  EXISTS (
    SELECT 1
    FROM public.provider_services
    JOIN public.providers ON providers.id = provider_services.provider_id
    WHERE provider_services.id = provider_service_time_slots.service_id
      AND providers.user_id = auth.uid()
  )
);

-- Verify RLS is enabled
ALTER TABLE public.provider_service_time_slots ENABLE ROW LEVEL SECURITY;

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
WHERE tablename = 'provider_service_time_slots'
ORDER BY policyname;

-- Additional check: Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'provider_service_time_slots';

