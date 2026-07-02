import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Processes due product subscriptions (creates renewal orders).
 * Payment is recorded as `pending` until Stripe integration charges the saved card.
 * Invoke via pg_cron daily or manually with service role / cron secret.
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Missing Supabase configuration' }, 500);
  }

  const authHeader = req.headers.get('Authorization');
  const cronSecret = Deno.env.get('SUBSCRIPTION_CRON_SECRET');
  const bearer = authHeader?.replace(/^Bearer\s+/i, '') ?? '';

  const isServiceRole = bearer === serviceKey;
  const isCronSecret = cronSecret && bearer === cronSecret;

  if (!isServiceRole && !isCronSecret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data, error } = await supabase.rpc('process_due_product_subscriptions');

  if (error) {
    console.error('process_due_product_subscriptions error:', error);
    return json({ error: error.message }, 500);
  }

  return json({
    success: true,
    processed: data ?? 0,
    processed_at: new Date().toISOString(),
  });
});
