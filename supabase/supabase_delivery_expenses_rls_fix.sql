-- Fix RLS policies for delivery_expenses table
-- Remove policies that try to access auth.users directly and simplify them

-- Drop existing policies
DROP POLICY IF EXISTS "Delivery can view their own expenses" ON public.delivery_expenses;
DROP POLICY IF EXISTS "Delivery can insert their own expenses" ON public.delivery_expenses;
DROP POLICY IF EXISTS "Delivery can update their own expenses" ON public.delivery_expenses;
DROP POLICY IF EXISTS "Delivery can delete their own expenses" ON public.delivery_expenses;

-- Create simplified policies that only check delivery_user_id = auth.uid()
-- This is more secure and doesn't require access to auth.users

-- Policy: Delivery users can view their own expenses
CREATE POLICY "Delivery can view their own expenses"
ON public.delivery_expenses FOR SELECT
TO authenticated
USING (delivery_user_id = auth.uid());

-- Policy: Delivery users can insert their own expenses
CREATE POLICY "Delivery can insert their own expenses"
ON public.delivery_expenses FOR INSERT
TO authenticated
WITH CHECK (delivery_user_id = auth.uid());

-- Policy: Delivery users can update their own expenses
CREATE POLICY "Delivery can update their own expenses"
ON public.delivery_expenses FOR UPDATE
TO authenticated
USING (delivery_user_id = auth.uid())
WITH CHECK (delivery_user_id = auth.uid());

-- Policy: Delivery users can delete their own expenses
CREATE POLICY "Delivery can delete their own expenses"
ON public.delivery_expenses FOR DELETE
TO authenticated
USING (delivery_user_id = auth.uid());

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

