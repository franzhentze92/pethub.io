-- Create table for delivery expenses
-- This allows delivery users to track their expenses (gas, oil, parts, tires, etc.)

CREATE TABLE IF NOT EXISTS public.delivery_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL, -- 'gasolina', 'aceite', 'repuestos', 'llantas', 'mantenimiento', 'otros'
  description TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'GTQ',
  expense_date DATE NOT NULL,
  receipt_url TEXT NULL, -- URL to receipt image if uploaded
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.delivery_expenses ENABLE ROW LEVEL SECURITY;

-- Create a function to check if user is delivery using user_profiles
CREATE OR REPLACE FUNCTION is_delivery_user_check()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user has delivery role in user_profiles
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND role = 'delivery'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_delivery_user_check() TO authenticated;

-- Policy: Delivery users can view their own expenses
-- Only allow if delivery_user_id matches auth.uid() (users can only see their own expenses)
CREATE POLICY "Delivery can view their own expenses"
ON public.delivery_expenses FOR SELECT
TO authenticated
USING (delivery_user_id = auth.uid());

-- Policy: Delivery users can insert their own expenses
-- Only allow if delivery_user_id matches auth.uid() (users can only create expenses for themselves)
CREATE POLICY "Delivery can insert their own expenses"
ON public.delivery_expenses FOR INSERT
TO authenticated
WITH CHECK (delivery_user_id = auth.uid());

-- Policy: Delivery users can update their own expenses
-- Only allow if delivery_user_id matches auth.uid() (users can only update their own expenses)
CREATE POLICY "Delivery can update their own expenses"
ON public.delivery_expenses FOR UPDATE
TO authenticated
USING (delivery_user_id = auth.uid())
WITH CHECK (delivery_user_id = auth.uid());

-- Policy: Delivery users can delete their own expenses
-- Only allow if delivery_user_id matches auth.uid() (users can only delete their own expenses)
CREATE POLICY "Delivery can delete their own expenses"
ON public.delivery_expenses FOR DELETE
TO authenticated
USING (delivery_user_id = auth.uid());

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_delivery_expenses_user_id ON public.delivery_expenses(delivery_user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_expenses_date ON public.delivery_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_delivery_expenses_category ON public.delivery_expenses(category);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_delivery_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_delivery_expenses_updated_at
BEFORE UPDATE ON public.delivery_expenses
FOR EACH ROW
EXECUTE FUNCTION update_delivery_expenses_updated_at();

