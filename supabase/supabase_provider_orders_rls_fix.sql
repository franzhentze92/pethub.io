-- Fix RLS policies for orders table to allow providers to update order status
-- Providers should be able to update orders that contain their products/services

-- First, check current RLS policies
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
ORDER BY policyname;

-- Drop existing policies that might be blocking provider updates
DROP POLICY IF EXISTS "Providers can update their order status" ON public.orders;
DROP POLICY IF EXISTS "Providers can update orders with their items" ON public.orders;

-- Create policy to allow providers to update order status
-- A provider can update an order if they have items in that order
CREATE POLICY "Providers can update their order status"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.order_items
    WHERE order_items.order_id = orders.id
    AND order_items.provider_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.order_items
    WHERE order_items.order_id = orders.id
    AND order_items.provider_id = auth.uid()
  )
);

-- Verify the policy was created
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
ORDER BY policyname;

-- Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'orders';

