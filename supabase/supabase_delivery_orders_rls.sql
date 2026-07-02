-- RLS Policy for Delivery users to update order status
-- This allows delivery users (delivery@pehtubgt.com) to update order status

-- First, create a function to check if user is delivery
CREATE OR REPLACE FUNCTION is_delivery_user()
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get the email of the current user
  -- SECURITY DEFINER allows us to access auth.users without RLS restrictions
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = auth.uid();
  
  -- Return true if email is delivery@pehtubgt.com
  -- Use LOWER to ensure case-insensitive comparison
  RETURN LOWER(COALESCE(user_email, '')) = LOWER('delivery@pehtubgt.com');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_delivery_user() TO authenticated;

-- Drop existing delivery policy if it exists
DROP POLICY IF EXISTS "Delivery can update order status" ON public.orders;

-- Create policy to allow delivery to update order status
-- Delivery users can update any order's status
CREATE POLICY "Delivery can update order status"
ON public.orders
FOR UPDATE
TO authenticated
USING (is_delivery_user() IS TRUE)
WITH CHECK (is_delivery_user() IS TRUE);

-- Also allow delivery to view all orders
DROP POLICY IF EXISTS "Delivery can view all orders" ON public.orders;

CREATE POLICY "Delivery can view all orders"
ON public.orders
FOR SELECT
TO authenticated
USING (is_delivery_user() IS TRUE);

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
WHERE tablename = 'orders'
AND policyname LIKE '%Delivery%'
ORDER BY policyname;

-- Test the function to make sure it works
-- This should return true if you're logged in as delivery@pehtubgt.com
SELECT is_delivery_user() AS is_delivery;

