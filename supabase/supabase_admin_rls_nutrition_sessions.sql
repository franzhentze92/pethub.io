-- RLS Policy for Admin to view all nutrition_sessions
-- This allows the admin user (admin@pethubgt.com) to see all nutrition sessions

-- First, ensure RLS is enabled on nutrition_sessions
ALTER TABLE public.nutrition_sessions ENABLE ROW LEVEL SECURITY;

-- Use the existing is_admin_user() function (should already exist from user_profiles RLS)
-- If it doesn't exist, create it first:
-- CREATE OR REPLACE FUNCTION is_admin_user()
-- RETURNS BOOLEAN AS $$
-- DECLARE
--   user_email TEXT;
-- BEGIN
--   SELECT email INTO user_email
--   FROM auth.users
--   WHERE id = auth.uid();
--   
--   RETURN LOWER(COALESCE(user_email, '')) = LOWER('admin@pethubgt.com');
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
-- GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;

-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "Admin can view all nutrition sessions" ON public.nutrition_sessions;

-- Create policy to allow admin to view all nutrition sessions
CREATE POLICY "Admin can view all nutrition sessions"
ON public.nutrition_sessions
FOR SELECT
TO authenticated
USING (
  -- Allow if user is admin (using function that bypasses RLS)
  (is_admin_user() IS TRUE)
  OR
  -- Also allow users to see their own sessions (existing behavior)
  (owner_id = auth.uid())
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
WHERE tablename = 'nutrition_sessions'
ORDER BY policyname;

-- Test the function to make sure it works
-- This should return true if you're logged in as admin@pethubgt.com
SELECT is_admin_user() as is_admin;

