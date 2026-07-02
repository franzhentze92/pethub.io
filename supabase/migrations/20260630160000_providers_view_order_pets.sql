-- Allow providers to read pet profiles linked to their order items
DROP POLICY IF EXISTS "Providers can view pets in their orders" ON public.pets;

CREATE POLICY "Providers can view pets in their orders"
ON public.pets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.order_item_pets oip
    INNER JOIN public.order_items oi ON oi.id = oip.order_item_id
    WHERE oip.pet_id = pets.id
      AND oi.provider_id = auth.uid()
  )
);

COMMENT ON POLICY "Providers can view pets in their orders" ON public.pets IS
  'Providers can see pet name/species for orders and appointments placed with them.';
