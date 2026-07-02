-- RLS Policy for Admin to view all delivery expenses
-- This allows the admin user (admin@pethubgt.com) to see all delivery expenses

-- Create a function that checks if user is admin
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
DROP POLICY IF EXISTS "Admin can view all delivery expenses" ON public.delivery_expenses;

-- Create policy to allow admin to view all delivery expenses
-- This policy uses the is_admin_user() function which bypasses RLS
CREATE POLICY "Admin can view all delivery expenses"
ON public.delivery_expenses
FOR SELECT
TO authenticated
USING (
  -- Allow if user is admin (using function that bypasses RLS)
  (is_admin_user() IS TRUE)
  OR
  -- Also allow delivery users to see their own expenses (existing behavior)
  (delivery_user_id = auth.uid())
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
WHERE tablename = 'delivery_expenses'
ORDER BY policyname;

