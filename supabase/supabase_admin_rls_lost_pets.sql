-- RLS Policy for Admin to view all lost_pets
-- This allows the admin user (admin@pethubgt.com) to see all lost pet reports

-- First, ensure RLS is enabled on lost_pets
ALTER TABLE public.lost_pets ENABLE ROW LEVEL SECURITY;

-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "Admin can view all lost pets" ON public.lost_pets;

-- Create policy to allow admin to view all lost pets
-- This policy uses the is_admin_user() function (defined in supabase_admin_rls_user_profiles.sql)
-- IMPORTANT: This policy must be PERMISSIVE (default) to work with other policies
CREATE POLICY "Admin can view all lost pets"
ON public.lost_pets
FOR SELECT
TO authenticated
USING (
  -- Allow if user is admin (using function that bypasses RLS)
  (is_admin_user() IS TRUE)
  OR
  -- Also allow users to see their own lost pets (existing behavior)
  (owner_id = auth.uid())
);

-- Drop existing policy for users to view their own lost pets if it exists and conflicts
-- (This is usually handled by the combined policy above, but good to be explicit if separate policies existed)
DROP POLICY IF EXISTS "Users can view their own lost pets" ON public.lost_pets;

-- Add a policy for users to view their own lost pets (if not covered by the admin policy)
-- This ensures non-admin users can still see their own data
CREATE POLICY "Users can view their own lost pets"
ON public.lost_pets
FOR SELECT
TO authenticated
USING (
  (owner_id = auth.uid())
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
WHERE tablename = 'lost_pets'
ORDER BY policyname;

