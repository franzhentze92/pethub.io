-- How the client chose to receive the order (not provider capabilities)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_method text
  CHECK (fulfillment_method IN ('delivery', 'pickup'));

COMMENT ON COLUMN public.orders.fulfillment_method IS 'Client choice at checkout: delivery or pickup';

-- Backfill: delivery if fee or address was used
UPDATE public.orders
SET fulfillment_method = 'delivery'
WHERE fulfillment_method IS NULL
  AND (
    COALESCE(delivery_fee, 0) > 0
    OR NULLIF(TRIM(delivery_address), '') IS NOT NULL
  );

UPDATE public.orders
SET fulfillment_method = 'pickup'
WHERE fulfillment_method IS NULL;

-- Align order_items flags with chosen method (not provider capabilities)
UPDATE public.order_items oi
SET
  has_delivery = true,
  has_pickup = false
FROM public.orders o
WHERE oi.order_id = o.id
  AND o.fulfillment_method = 'delivery';

UPDATE public.order_items oi
SET
  has_delivery = false,
  has_pickup = true
FROM public.orders o
WHERE oi.order_id = o.id
  AND o.fulfillment_method = 'pickup';
