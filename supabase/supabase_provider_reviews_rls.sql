-- Enable RLS for provider_reviews table
ALTER TABLE public.provider_reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Clients can insert their own reviews" ON public.provider_reviews;
DROP POLICY IF EXISTS "Clients can view all reviews" ON public.provider_reviews;
DROP POLICY IF EXISTS "Providers can view their own reviews" ON public.provider_reviews;
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.provider_reviews;

-- Policy 1: Clients can insert their own reviews
CREATE POLICY "Clients can insert their own reviews"
ON public.provider_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = client_id
);

-- Policy 2: Anyone (authenticated or not) can view reviews
-- This allows reviews to be displayed in the marketplace and provider pages
CREATE POLICY "Anyone can view reviews"
ON public.provider_reviews
FOR SELECT
TO public
USING (true);

-- Policy 3: Clients can update their own reviews (optional, for editing)
CREATE POLICY "Clients can update their own reviews"
ON public.provider_reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = client_id)
WITH CHECK (auth.uid() = client_id);

-- Policy 4: Clients can delete their own reviews (optional, for deletion)
CREATE POLICY "Clients can delete their own reviews"
ON public.provider_reviews
FOR DELETE
TO authenticated
USING (auth.uid() = client_id);

-- Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'provider_reviews';

-- Verify policies were created
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
WHERE tablename = 'provider_reviews'
ORDER BY policyname;

