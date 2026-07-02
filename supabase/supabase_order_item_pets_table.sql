-- Create table to link order items with pets
-- This allows tracking which pets are associated with each purchased product/service

CREATE TABLE IF NOT EXISTS public.order_item_pets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  price_per_pet NUMERIC(10, 2) NULL, -- For food products with divided price
  quantity INTEGER NOT NULL DEFAULT 1, -- Quantity for this specific pet
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(order_item_id, pet_id) -- Prevent duplicate associations
);

-- Enable RLS
ALTER TABLE public.order_item_pets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view pet associations for their own orders
CREATE POLICY "Users can view their own order item pets"
ON public.order_item_pets FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE oi.id = order_item_pets.order_item_id
    AND o.client_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE oi.id = order_item_pets.order_item_id
    AND oi.provider_id = auth.uid()
  )
);

-- Policy: Users can insert pet associations for their own orders
CREATE POLICY "Users can insert their own order item pets"
ON public.order_item_pets FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE oi.id = order_item_pets.order_item_id
    AND o.client_id = auth.uid()
  )
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_order_item_pets_order_item_id ON public.order_item_pets(order_item_id);
CREATE INDEX IF NOT EXISTS idx_order_item_pets_pet_id ON public.order_item_pets(pet_id);

