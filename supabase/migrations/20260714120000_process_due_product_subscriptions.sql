-- RPC: process due product subscriptions and return renewal details for transactional emails

DROP FUNCTION IF EXISTS public.process_due_product_subscriptions();

CREATE OR REPLACE FUNCTION public.process_due_product_subscriptions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub RECORD;
  v_today date := CURRENT_DATE;
  v_order_id uuid;
  v_order_number text;
  v_delivery_id uuid;
  v_line_total numeric(10, 2);
  v_next_date date;
  v_renewals jsonb := '[]'::jsonb;
  v_provider_name text;
  v_suffix text;
BEGIN
  FOR sub IN
    SELECT ps.*
    FROM public.product_subscriptions ps
    WHERE ps.status = 'active'
      AND ps.next_delivery_date <= v_today
    ORDER BY ps.next_delivery_date
    FOR UPDATE
  LOOP
    v_line_total := sub.unit_price * sub.quantity;
    v_suffix := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 3));
    v_order_number := 'ORD-' || lpad(floor(extract(epoch FROM clock_timestamp()))::bigint::text, 10, '0')
      || '-' || v_suffix;

    INSERT INTO public.orders (
      order_number,
      client_id,
      total_amount,
      delivery_fee,
      grand_total,
      currency,
      payment_method,
      payment_status,
      status,
      delivery_name,
      delivery_phone,
      delivery_address,
      delivery_city,
      delivery_instructions,
      fulfillment_method
    ) VALUES (
      v_order_number,
      sub.client_id,
      v_line_total,
      0,
      v_line_total,
      sub.currency,
      'card',
      'pending',
      'confirmed',
      sub.delivery_name,
      sub.delivery_phone,
      sub.delivery_address,
      sub.delivery_city,
      sub.delivery_instructions,
      sub.fulfillment_method
    )
    RETURNING id INTO v_order_id;

    SELECT p.business_name
    INTO v_provider_name
    FROM public.providers p
    WHERE p.user_id = sub.provider_id
    LIMIT 1;

    INSERT INTO public.order_items (
      order_id,
      provider_id,
      item_type,
      item_id,
      item_name,
      unit_price,
      quantity,
      total_price,
      currency,
      provider_name,
      has_delivery,
      has_pickup,
      delivery_fee
    ) VALUES (
      v_order_id,
      sub.provider_id,
      'product',
      sub.product_id,
      sub.product_name || ' (Suscripción)',
      sub.unit_price,
      sub.quantity,
      v_line_total,
      sub.currency,
      COALESCE(v_provider_name, 'Proveedor'),
      sub.fulfillment_method = 'delivery',
      sub.fulfillment_method = 'pickup',
      0
    );

    INSERT INTO public.subscription_deliveries (
      subscription_id,
      order_id,
      delivery_date,
      amount_charged,
      currency,
      payment_status,
      status,
      notes
    ) VALUES (
      sub.id,
      v_order_id,
      v_today,
      v_line_total,
      sub.currency,
      'pending',
      'confirmed',
      'Renovación automática de suscripción'
    )
    RETURNING id INTO v_delivery_id;

    v_next_date := v_today + sub.interval_days;

    UPDATE public.product_subscriptions
    SET
      next_delivery_date = v_next_date,
      last_delivery_date = v_today,
      deliveries_count = deliveries_count + 1,
      updated_at = now()
    WHERE id = sub.id;

    v_renewals := v_renewals || jsonb_build_array(
      jsonb_build_object(
        'subscription_id', sub.id,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'delivery_id', v_delivery_id,
        'client_id', sub.client_id
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'processed', jsonb_array_length(v_renewals),
    'renewals', v_renewals
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_due_product_subscriptions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_due_product_subscriptions() TO service_role;
