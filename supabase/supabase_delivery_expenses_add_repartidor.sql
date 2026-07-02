-- Add repartidor column to delivery_expenses table
-- This allows tracking which delivery person made the expense

-- Add the column if it doesn't exist
ALTER TABLE public.delivery_expenses 
ADD COLUMN IF NOT EXISTS repartidor VARCHAR(50) NULL;

-- Update existing records to have a default value (optional)
-- UPDATE public.delivery_expenses SET repartidor = 'Repartidor 1' WHERE repartidor IS NULL;

-- Add a comment to the column
COMMENT ON COLUMN public.delivery_expenses.repartidor IS 'Nombre del repartidor que realizó el gasto (Repartidor 1, Repartidor 2, Repartidor 3)';

