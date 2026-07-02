-- Link each service appointment to its order line item (and pets via order_item_pets)
ALTER TABLE public.service_appointments
  ADD COLUMN IF NOT EXISTS order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_service_appointments_order_item_id
  ON public.service_appointments(order_item_id);

COMMENT ON COLUMN public.service_appointments.order_item_id IS
  'Order line item for this appointment; used to resolve linked pets.';
