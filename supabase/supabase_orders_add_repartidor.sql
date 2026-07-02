-- Add repartidor column to orders table
-- This allows delivery users to assign a delivery person to each order

-- Add the column if it doesn't exist
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS repartidor VARCHAR(50) NULL;

-- Add a comment to the column
COMMENT ON COLUMN public.orders.repartidor IS 'Nombre del repartidor asignado a la orden (Repartidor 1, Repartidor 2, Repartidor 3)';

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_repartidor ON public.orders(repartidor);

