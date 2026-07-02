-- Product subscriptions: recurring product deliveries with per-delivery billing
-- Applied to remote Supabase via MCP (2026-07-08)

ALTER TABLE public.provider_products
  ADD COLUMN IF NOT EXISTS subscription_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.product_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.provider_products(id) ON DELETE RESTRICT,
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  initial_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  payment_card_id uuid REFERENCES public.payment_cards(id) ON DELETE SET NULL,
  stripe_customer_id text,
  stripe_payment_method_id text,
  product_name text NOT NULL,
  product_size text,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(10, 2) NOT NULL CHECK (unit_price >= 0),
  currency varchar(3) NOT NULL DEFAULT 'GTQ',
  interval_type text NOT NULL CHECK (interval_type IN ('weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly')),
  interval_days integer NOT NULL CHECK (interval_days > 0),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'cancelled', 'payment_failed')),
  fulfillment_method text NOT NULL DEFAULT 'delivery'
    CHECK (fulfillment_method IN ('delivery', 'pickup')),
  delivery_name text,
  delivery_phone text,
  delivery_address text,
  delivery_city text,
  delivery_instructions text,
  next_delivery_date date NOT NULL,
  last_delivery_date date,
  deliveries_count integer NOT NULL DEFAULT 1 CHECK (deliveries_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  paused_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.subscription_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.product_subscriptions(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  delivery_date date NOT NULL,
  amount_charged numeric(10, 2) NOT NULL CHECK (amount_charged >= 0),
  currency varchar(3) NOT NULL DEFAULT 'GTQ',
  payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'completed', 'failed')),
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('scheduled', 'processing', 'confirmed', 'delivered', 'failed', 'cancelled')),
  stripe_payment_intent_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_subscriptions_client
  ON public.product_subscriptions (client_id, status);
CREATE INDEX IF NOT EXISTS idx_product_subscriptions_next_delivery
  ON public.product_subscriptions (next_delivery_date, status)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_subscription
  ON public.subscription_deliveries (subscription_id, delivery_date DESC);

ALTER TABLE public.product_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients manage own subscriptions" ON public.product_subscriptions;
CREATE POLICY "Clients manage own subscriptions"
  ON public.product_subscriptions FOR ALL
  USING (client_id = auth.uid() OR public.is_admin_user())
  WITH CHECK (client_id = auth.uid() OR public.is_admin_user());

DROP POLICY IF EXISTS "Providers view their subscriptions" ON public.product_subscriptions;
CREATE POLICY "Providers view their subscriptions"
  ON public.product_subscriptions FOR SELECT
  USING (provider_id = auth.uid() OR public.is_admin_user());

DROP POLICY IF EXISTS "Clients insert own subscription deliveries" ON public.subscription_deliveries;
CREATE POLICY "Clients insert own subscription deliveries"
  ON public.subscription_deliveries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.product_subscriptions ps
      WHERE ps.id = subscription_deliveries.subscription_id
        AND ps.client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Clients view own subscription deliveries" ON public.subscription_deliveries;
CREATE POLICY "Clients view own subscription deliveries"
  ON public.subscription_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.product_subscriptions ps
      WHERE ps.id = subscription_deliveries.subscription_id
        AND (ps.client_id = auth.uid() OR ps.provider_id = auth.uid() OR public.is_admin_user())
    )
  );

UPDATE public.provider_products
SET subscription_enabled = true
WHERE product_category = 'alimentos' AND subscription_enabled = false;

-- See 20260708150000_subscription_renewals_cron.sql for process_due_product_subscriptions + cron
