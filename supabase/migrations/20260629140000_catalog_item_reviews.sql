-- Reviews for individual marketplace products and services
CREATE TABLE IF NOT EXISTS public.catalog_item_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  item_type text NOT NULL CHECK (item_type IN ('product', 'service')),
  product_id uuid REFERENCES public.provider_products(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.provider_services(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_item_reviews_item_ref_check CHECK (
    (item_type = 'product' AND product_id IS NOT NULL AND service_id IS NULL)
    OR (item_type = 'service' AND service_id IS NOT NULL AND product_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS catalog_item_reviews_product_client_uidx
  ON public.catalog_item_reviews (product_id, client_id)
  WHERE product_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS catalog_item_reviews_service_client_uidx
  ON public.catalog_item_reviews (service_id, client_id)
  WHERE service_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS catalog_item_reviews_product_id_idx ON public.catalog_item_reviews (product_id);
CREATE INDEX IF NOT EXISTS catalog_item_reviews_service_id_idx ON public.catalog_item_reviews (service_id);

ALTER TABLE public.catalog_item_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view catalog item reviews" ON public.catalog_item_reviews;
CREATE POLICY "Anyone can view catalog item reviews"
  ON public.catalog_item_reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Clients can insert own catalog item reviews" ON public.catalog_item_reviews;
CREATE POLICY "Clients can insert own catalog item reviews"
  ON public.catalog_item_reviews FOR INSERT
  WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients can update own catalog item reviews" ON public.catalog_item_reviews;
CREATE POLICY "Clients can update own catalog item reviews"
  ON public.catalog_item_reviews FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients can delete own catalog item reviews" ON public.catalog_item_reviews;
CREATE POLICY "Clients can delete own catalog item reviews"
  ON public.catalog_item_reviews FOR DELETE
  USING (auth.uid() = client_id);

COMMENT ON TABLE public.catalog_item_reviews IS 'Client reviews for individual marketplace products and services';
