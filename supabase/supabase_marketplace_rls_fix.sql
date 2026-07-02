-- Fix RLS policies for marketplace to allow all authenticated users to see all active products and services
-- This ensures that clients can see products/services from all providers, not just their own

-- Note: The policies already exist, but we need to ensure they work correctly with JOINs
-- The issue might be that when joining with providers, the provider policies restrict visibility

-- Ensure the SELECT policy for providers allows all authenticated users to see all providers
-- This is critical for marketplace queries that JOIN products/services with providers
DROP POLICY IF EXISTS "Authenticated users can view providers" ON public.providers;
CREATE POLICY "Authenticated users can view providers"
ON public.providers
FOR SELECT
TO authenticated
USING (true);

-- Ensure products policy exists and allows viewing active products
DROP POLICY IF EXISTS "Authenticated users can view active products" ON public.provider_products;
CREATE POLICY "Authenticated users can view active products"
ON public.provider_products
FOR SELECT
TO authenticated
USING (is_active = true);

-- Ensure services policy exists and allows viewing active services
DROP POLICY IF EXISTS "Authenticated users can view active services" ON public.provider_services;
CREATE POLICY "Authenticated users can view active services"
ON public.provider_services
FOR SELECT
TO authenticated
USING (is_active = true);

-- CRITICAL FIX: The policy "Users can view their own provider profile" (roles: public) 
-- is interfering with marketplace queries. When Supabase does JOINs, it applies RLS to both tables.
-- Even though policies are combined with OR, the restrictive policy might be causing issues.
--
-- Solution: Modify the restrictive policy to only apply to anonymous users
-- This ensures authenticated users ALWAYS use the broader "Authenticated users can view providers" policy
-- For authenticated users, they can see all providers via the "Authenticated users can view providers" policy
ALTER POLICY "Users can view their own provider profile" ON public.providers
  USING (auth.role() = 'anon' AND auth.uid() = user_id);

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
WHERE tablename IN ('provider_products', 'provider_services', 'providers')
ORDER BY tablename, policyname;

-- Additional check: Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('provider_products', 'provider_services', 'providers');

