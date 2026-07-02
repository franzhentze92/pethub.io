-- Create admin_costs table for monthly administrative costs
-- This table stores monthly costs like hosting, marketing, delivery, income, etc.

CREATE TABLE IF NOT EXISTS public.admin_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category VARCHAR(50) NOT NULL, -- 'hosting', 'marketing', 'delivery', 'income', 'salarios', 'renta', 'servicios_publicos', 'tecnologia', 'seguros', 'impuestos', 'equipamiento', 'capacitacion', 'consultoria', 'transporte', 'almacenamiento', 'otros'
  description TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'GTQ',
  cost_date DATE NOT NULL, -- Date of the cost (monthly)
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12), -- Month (1-12)
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100), -- Year
  notes TEXT NULL,
  receipt_url TEXT NULL, -- URL to receipt/document if uploaded
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Admin user who created the cost
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_admin_costs_category ON public.admin_costs(category);
CREATE INDEX IF NOT EXISTS idx_admin_costs_date ON public.admin_costs(cost_date);
CREATE INDEX IF NOT EXISTS idx_admin_costs_month_year ON public.admin_costs(year, month);
CREATE INDEX IF NOT EXISTS idx_admin_costs_created_by ON public.admin_costs(created_by);

-- Enable Row Level Security
ALTER TABLE public.admin_costs ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;

-- RLS Policies for admin_costs
-- Policy: Admin users can view all costs
CREATE POLICY "Admin can view all admin costs"
ON public.admin_costs FOR SELECT
TO authenticated
USING (is_admin_user() IS TRUE);

-- Policy: Admin users can insert costs
CREATE POLICY "Admin can insert admin costs"
ON public.admin_costs FOR INSERT
TO authenticated
WITH CHECK (is_admin_user() IS TRUE);

-- Policy: Admin users can update costs
CREATE POLICY "Admin can update admin costs"
ON public.admin_costs FOR UPDATE
TO authenticated
USING (is_admin_user() IS TRUE)
WITH CHECK (is_admin_user() IS TRUE);

-- Policy: Admin users can delete costs
CREATE POLICY "Admin can delete admin costs"
ON public.admin_costs FOR DELETE
TO authenticated
USING (is_admin_user() IS TRUE);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_costs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admin_costs_updated_at
BEFORE UPDATE ON public.admin_costs
FOR EACH ROW
EXECUTE FUNCTION update_admin_costs_updated_at();

-- Verify the table was created
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'admin_costs'
ORDER BY ordinal_position;

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'admin_costs'
ORDER BY policyname;

