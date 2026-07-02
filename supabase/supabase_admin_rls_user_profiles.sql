-- RLS Policy for Admin to view all user_profiles
-- This allows the admin user (admin@pethubgt.com) to see all user profiles

-- First, ensure RLS is enabled on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create a function that bypasses RLS for admin check
-- SECURITY DEFINER allows the function to bypass RLS when checking auth.users
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get the email of the current user
  -- SECURITY DEFINER allows us to access auth.users without RLS restrictions
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = auth.uid();
  
  -- Return true if email is admin@pethubgt.com
  -- Use LOWER to ensure case-insensitive comparison
  RETURN LOWER(COALESCE(user_email, '')) = LOWER('admin@pethubgt.com');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;

-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "Admin can view all user profiles" ON public.user_profiles;

-- Create policy to allow admin to view all user profiles
-- This policy uses the is_admin_user() function which bypasses RLS
-- IMPORTANT: This policy must be PERMISSIVE (default) to work with other policies
CREATE POLICY "Admin can view all user profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  -- Allow if user is admin (using function that bypasses RLS)
  -- Check if function returns true (explicit comparison)
  (is_admin_user() IS TRUE)
  OR
  -- Also allow users to see their own profile (existing behavior)
  (user_id = auth.uid())
);

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- Test the function to make sure it works
-- This should return true if you're logged in as admin@pethubgt.com
SELECT is_admin_user() as is_admin;

-- Verify the function exists and is correct
SELECT 
  proname as function_name,
  prosrc as function_body,
  prosecdef as is_security_definer
FROM pg_proc
WHERE proname = 'is_admin_user';

-- IMPORTANT: After running this script, test the function while logged in as admin
-- Run this query in SQL Editor while logged in as admin@pethubgt.com:
-- SELECT is_admin_user(); -- Should return true

-- If the function returns false, check:
-- 1. Are you logged in as admin@pethubgt.com?
-- 2. Does the user exist in auth.users with that email?
-- 3. Is the function marked as SECURITY DEFINER? (should show true in is_security_definer)

