-- RLS Policy for Admin to view all breeding_matches
-- This allows the admin user (admin@pethubgt.com) to see all breeding match requests

-- First, ensure RLS is enabled on breeding_matches
ALTER TABLE public.breeding_matches ENABLE ROW LEVEL SECURITY;

-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "Admin can view all breeding matches" ON public.breeding_matches;

-- Create policy to allow admin to view all breeding matches
-- This policy uses the is_admin_user() function (defined in supabase_admin_rls_user_profiles.sql)
-- IMPORTANT: This policy must be PERMISSIVE (default) to work with other policies
CREATE POLICY "Admin can view all breeding matches"
ON public.breeding_matches
FOR SELECT
TO authenticated
USING (
  -- Allow if user is admin (using function that bypasses RLS)
  (is_admin_user() IS TRUE)
  OR
  -- Also allow users to see their own matches (existing behavior)
  (owner_id = auth.uid() OR partner_owner_id = auth.uid())
);

-- Drop existing policy for users to view their own matches if it exists and conflicts
-- (This is usually handled by the combined policy above, but good to be explicit if separate policies existed)
DROP POLICY IF EXISTS "Users can view their own breeding matches" ON public.breeding_matches;

-- Add a policy for users to view their own matches (if not covered by the admin policy)
-- This ensures non-admin users can still see their own data
CREATE POLICY "Users can view their own breeding matches"
ON public.breeding_matches
FOR SELECT
TO authenticated
USING (
  (owner_id = auth.uid() OR partner_owner_id = auth.uid())
);

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'breeding_matches'
ORDER BY policyname;

