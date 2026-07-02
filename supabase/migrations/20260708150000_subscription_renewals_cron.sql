-- Cron + helpers for subscription renewals edge function

CREATE OR REPLACE FUNCTION public.invoke_process_subscription_renewals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions
AS $$
DECLARE
  v_key text;
  v_url text;
BEGIN
  SELECT value INTO v_key FROM private.app_secrets WHERE key = 'service_role_key';
  IF v_key IS NULL OR v_key = '' THEN
    PERFORM public.process_due_product_subscriptions();
    RETURN;
  END IF;

  v_url := COALESCE(
    current_setting('app.settings.supabase_url', true),
    'https://uzcuhdkjfqqzqlxgwyjt.supabase.co'
  ) || '/functions/v1/process-subscription-renewals';

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := '{}'::jsonb
  );
EXCEPTION WHEN OTHERS THEN
  PERFORM public.process_due_product_subscriptions();
END;
$$;

CREATE OR REPLACE FUNCTION public.product_subscriptions_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_subscriptions_updated_at ON public.product_subscriptions;
CREATE TRIGGER trg_product_subscriptions_updated_at
  BEFORE UPDATE ON public.product_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.product_subscriptions_set_updated_at();

DO $sub_cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('pethub-process-product-subscriptions');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      PERFORM cron.unschedule('pethub-process-subscription-renewals');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    PERFORM cron.schedule(
      'pethub-process-subscription-renewals',
      '0 7 * * *',
      'SELECT public.invoke_process_subscription_renewals();'
    );
  END IF;
END;
$sub_cron$;

REVOKE ALL ON FUNCTION public.invoke_process_subscription_renewals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invoke_process_subscription_renewals() TO service_role;
