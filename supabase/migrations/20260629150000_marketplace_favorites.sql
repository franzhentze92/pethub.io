-- Unified favorites for marketplace products and services
CREATE TABLE IF NOT EXISTS public.marketplace_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('product', 'service')),
  product_id uuid REFERENCES public.provider_products(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.provider_services(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_favorites_item_ref_check CHECK (
    (item_type = 'product' AND product_id IS NOT NULL AND service_id IS NULL)
    OR (item_type = 'service' AND service_id IS NOT NULL AND product_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS marketplace_favorites_user_product_uidx
  ON public.marketplace_favorites (user_id, product_id)
  WHERE product_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS marketplace_favorites_user_service_uidx
  ON public.marketplace_favorites (user_id, service_id)
  WHERE service_id IS NOT NULL;

INSERT INTO public.marketplace_favorites (user_id, item_type, product_id, created_at)
SELECT user_id, 'product', product_id, created_at
FROM public.user_wishlist
ON CONFLICT DO NOTHING;

ALTER TABLE public.marketplace_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view marketplace favorites" ON public.marketplace_favorites;
CREATE POLICY "Anyone can view marketplace favorites"
  ON public.marketplace_favorites FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own marketplace favorites" ON public.marketplace_favorites;
CREATE POLICY "Users manage own marketplace favorites"
  ON public.marketplace_favorites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.marketplace_favorites IS 'User favorites for marketplace products and services';
