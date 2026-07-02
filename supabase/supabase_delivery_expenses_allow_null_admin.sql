-- Allow delivery_user_id to be NULL for admin expenses
-- Update RLS policies to allow admin to manage expenses with NULL delivery_user_id

-- First, modify the column to allow NULL
ALTER TABLE public.delivery_expenses
ALTER COLUMN delivery_user_id DROP NOT NULL;

-- Drop existing policies
DROP POLICY IF EXISTS "Delivery can view their own expenses" ON public.delivery_expenses;
DROP POLICY IF EXISTS "Delivery can insert their own expenses" ON public.delivery_expenses;
DROP POLICY IF EXISTS "Delivery can update their own expenses" ON public.delivery_expenses;
DROP POLICY IF EXISTS "Delivery can delete their own expenses" ON public.delivery_expenses;
DROP POLICY IF EXISTS "Admin can view all delivery expenses" ON public.delivery_expenses;

-- Create a function to check if user is admin using user_profiles
CREATE OR REPLACE FUNCTION is_admin_user_from_profiles()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user has admin role in user_profiles
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin_user_from_profiles() TO authenticated;

-- Policy: Users can view expenses
-- - Delivery users can view their own expenses (delivery_user_id = auth.uid())
-- - Admin users can view all expenses (including those with NULL delivery_user_id)
CREATE POLICY "Users can view expenses"
ON public.delivery_expenses FOR SELECT
TO authenticated
USING (
  -- Delivery users can view their own expenses
  (delivery_user_id = auth.uid())
  OR
  -- Admin users can view all expenses
  (is_admin_user_from_profiles() IS TRUE)
);

-- Policy: Users can insert expenses
-- - Delivery users can insert expenses with their own user_id
-- - Admin users can insert expenses with NULL delivery_user_id
CREATE POLICY "Users can insert expenses"
ON public.delivery_expenses FOR INSERT
TO authenticated
WITH CHECK (
  -- Delivery users can insert expenses with their own user_id
  (delivery_user_id = auth.uid())
  OR
  -- Admin users can insert expenses with NULL delivery_user_id
  (is_admin_user_from_profiles() IS TRUE AND delivery_user_id IS NULL)
);

-- Policy: Users can update expenses
-- - Delivery users can update their own expenses
-- - Admin users can update expenses with NULL delivery_user_id (admin expenses)
CREATE POLICY "Users can update expenses"
ON public.delivery_expenses FOR UPDATE
TO authenticated
USING (
  -- Delivery users can update their own expenses
  (delivery_user_id = auth.uid())
  OR
  -- Admin users can update admin expenses (NULL delivery_user_id)
  (is_admin_user_from_profiles() IS TRUE AND delivery_user_id IS NULL)
)
WITH CHECK (
  -- Delivery users can only update to their own user_id
  (delivery_user_id = auth.uid())
  OR
  -- Admin users can only update admin expenses (NULL delivery_user_id)
  (is_admin_user_from_profiles() IS TRUE AND delivery_user_id IS NULL)
);

-- Policy: Users can delete expenses
-- - Delivery users can delete their own expenses
-- - Admin users can delete expenses with NULL delivery_user_id (admin expenses)
CREATE POLICY "Users can delete expenses"
ON public.delivery_expenses FOR DELETE
TO authenticated
USING (
  -- Delivery users can delete their own expenses
  (delivery_user_id = auth.uid())
  OR
  -- Admin users can delete admin expenses (NULL delivery_user_id)
  (is_admin_user_from_profiles() IS TRUE AND delivery_user_id IS NULL)
);

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
WHERE tablename = 'delivery_expenses'
ORDER BY policyname;

-- Verify the column allows NULL
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'delivery_expenses'
  AND column_name = 'delivery_user_id';

