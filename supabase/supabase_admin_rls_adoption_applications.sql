-- RLS Policy for Admin to view all adoption_applications
-- This allows the admin user (admin@pethubgt.com) to see all adoption applications

-- First, ensure RLS is enabled on adoption_applications
ALTER TABLE public.adoption_applications ENABLE ROW LEVEL SECURITY;

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
DROP POLICY IF EXISTS "Admin can view all adoption applications" ON public.adoption_applications;

-- Create policy to allow admin to view all adoption applications
CREATE POLICY "Admin can view all adoption applications"
ON public.adoption_applications
FOR SELECT
TO authenticated
USING (
  -- Allow if user is admin (using function that bypasses RLS)
  (is_admin_user() IS TRUE)
  OR
  -- Also allow applicants to see their own applications
  (applicant_id = auth.uid())
  OR
  -- Also allow shelter owners to see applications for their pets
  -- (shelter_id is obtained through adoption_pets relationship)
  (pet_id IN (
    SELECT ap.id 
    FROM adoption_pets ap
    INNER JOIN shelters s ON ap.shelter_id = s.id
    WHERE s.owner_id = auth.uid()
  ))
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
WHERE tablename = 'adoption_applications'
ORDER BY policyname;

-- Test the function to make sure it works
-- This should return true if you're logged in as admin@pethubgt.com
SELECT is_admin_user() as is_admin;

