import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import {
  buildSubscriptionRenewalHtml,
  buildSubscriptionRenewalSubject,
  buildSubscriptionRenewalText,
  type SubscriptionRenewalEmailData,
} from '../send-order-confirmation/template.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RenewalRecord = {
  subscription_id: string;
  order_id: string;
  order_number: string;
  delivery_id: string;
  client_id: string;
};

type RpcResult = {
  processed?: number;
  renewals?: RenewalRecord[];
};

type DueSubscription = {
  id: string;
  client_id: string;
  product_id: string;
  provider_id: string;
  product_name: string;
  product_size: string | null;
  quantity: number;
  unit_price: number;
  currency: string;
  interval_days: number;
  fulfillment_method: string;
  delivery_name: string | null;
  delivery_phone: string | null;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_instructions: string | null;
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function parseRpcResult(data: unknown): RpcResult {
  if (typeof data === 'number') {
    return { processed: data, renewals: [] };
  }
  if (!data || typeof data !== 'object') {
    return { processed: 0, renewals: [] };
  }
  const obj = data as RpcResult;
  return {
    processed: obj.processed ?? (Array.isArray(obj.renewals) ? obj.renewals.length : 0),
    renewals: Array.isArray(obj.renewals) ? obj.renewals : [],
  };
}

function generateOrderNumber(): string {
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `ORD-${Date.now().toString().slice(-8)}-${suffix}`;
}

/** Fallback when RPC is not deployed yet — mirrors process_due_product_subscriptions SQL. */
async function processRenewalsInEdge(admin: SupabaseClient): Promise<RpcResult> {
  const today = new Date().toISOString().slice(0, 10);
  const renewals: RenewalRecord[] = [];

  const { data: dueSubs, error: fetchError } = await admin
    .from('product_subscriptions')
    .select('*')
    .eq('status', 'active')
    .lte('next_delivery_date', today)
    .order('next_delivery_date', { ascending: true });

  if (fetchError) throw fetchError;
  if (!dueSubs?.length) return { processed: 0, renewals: [] };

  for (const sub of dueSubs as DueSubscription[]) {
    const lineTotal = Number(sub.unit_price) * sub.quantity;
    const orderNumber = generateOrderNumber();

    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert({
        order_number: orderNumber,
        client_id: sub.client_id,
        total_amount: lineTotal,
        delivery_fee: 0,
        grand_total: lineTotal,
        currency: sub.currency || 'GTQ',
        payment_method: 'card',
        payment_status: 'pending',
        status: 'confirmed',
        delivery_name: sub.delivery_name,
        delivery_phone: sub.delivery_phone,
        delivery_address: sub.delivery_address,
        delivery_city: sub.delivery_city,
        delivery_instructions: sub.delivery_instructions,
        fulfillment_method: sub.fulfillment_method,
      })
      .select('id')
      .single();

    if (orderError || !order) {
      console.error('Renewal order insert failed:', sub.id, orderError);
      continue;
    }

    const { data: provider } = await admin
      .from('providers')
      .select('business_name')
      .eq('user_id', sub.provider_id)
      .maybeSingle();

    const { error: itemError } = await admin.from('order_items').insert({
      order_id: order.id,
      provider_id: sub.provider_id,
      item_type: 'product',
      item_id: sub.product_id,
      item_name: `${sub.product_name} (Suscripción)`,
      unit_price: sub.unit_price,
      quantity: sub.quantity,
      total_price: lineTotal,
      currency: sub.currency || 'GTQ',
      provider_name: provider?.business_name || 'Proveedor',
      has_delivery: sub.fulfillment_method === 'delivery',
      has_pickup: sub.fulfillment_method === 'pickup',
      delivery_fee: 0,
    });

    if (itemError) {
      console.error('Renewal order item failed:', sub.id, itemError);
      continue;
    }

    const { data: delivery, error: deliveryError } = await admin
      .from('subscription_deliveries')
      .insert({
        subscription_id: sub.id,
        order_id: order.id,
        delivery_date: today,
        amount_charged: lineTotal,
        currency: sub.currency || 'GTQ',
        payment_status: 'pending',
        status: 'confirmed',
        notes: 'Renovación automática de suscripción',
      })
      .select('id')
      .single();

    if (deliveryError || !delivery) {
      console.error('Renewal delivery log failed:', sub.id, deliveryError);
      continue;
    }

    const nextDate = new Date(`${today}T12:00:00`);
    nextDate.setDate(nextDate.getDate() + sub.interval_days);
    const nextDeliveryDate = nextDate.toISOString().slice(0, 10);

    const { data: currentSub } = await admin
      .from('product_subscriptions')
      .select('deliveries_count')
      .eq('id', sub.id)
      .single();

    const { error: subUpdateError } = await admin
      .from('product_subscriptions')
      .update({
        next_delivery_date: nextDeliveryDate,
        last_delivery_date: today,
        deliveries_count: (currentSub?.deliveries_count ?? 0) + 1,
      })
      .eq('id', sub.id);

    if (subUpdateError) {
      console.error('Subscription update failed:', sub.id, subUpdateError);
      continue;
    }

    renewals.push({
      subscription_id: sub.id,
      order_id: order.id,
      order_number: orderNumber,
      delivery_id: delivery.id,
      client_id: sub.client_id,
    });
  }

  return { processed: renewals.length, renewals };
}

async function shouldSendRenewalEmail(
  admin: SupabaseClient,
  clientId: string,
): Promise<boolean> {
  const { data: prefs } = await admin
    .from('user_notification_preferences')
    .select('notify_orders')
    .eq('user_id', clientId)
    .maybeSingle();

  return prefs?.notify_orders !== false;
}

async function sendRenewalEmail(
  admin: SupabaseClient,
  renewal: RenewalRecord,
  resendApiKey: string,
  fromEmail: string,
  appUrl: string,
): Promise<{ sent: boolean; skipped?: string; emailId?: string; sentTo?: string; error?: string }> {
  const allowed = await shouldSendRenewalEmail(admin, renewal.client_id);
  if (!allowed) {
    return { sent: false, skipped: 'Client disabled order notifications' };
  }

  const { data: subscription, error: subError } = await admin
    .from('product_subscriptions')
    .select('*')
    .eq('id', renewal.subscription_id)
    .single();

  if (subError || !subscription) {
    return { sent: false, error: 'Subscription not found' };
  }

  const { data: clientUser } = await admin.auth.admin.getUserById(renewal.client_id);
  const { data: clientProfile } = await admin
    .from('user_profiles')
    .select('full_name')
    .eq('user_id', renewal.client_id)
    .maybeSingle();

  const recipientEmail = clientUser?.user?.email;
  if (!recipientEmail) {
    return { sent: false, error: 'No email address for client' };
  }

  const clientName =
    subscription.delivery_name ||
    clientProfile?.full_name ||
    clientUser?.user?.user_metadata?.full_name ||
    recipientEmail.split('@')[0] ||
    'Cliente';

  const emailData: SubscriptionRenewalEmailData = {
    client_name: clientName,
    client_email: recipientEmail,
    product_name: subscription.product_name,
    product_size: subscription.product_size,
    quantity: subscription.quantity,
    unit_price: Number(subscription.unit_price),
    amount_charged: Number(subscription.unit_price) * subscription.quantity,
    currency: subscription.currency || 'GTQ',
    interval_type: subscription.interval_type,
    delivery_date: subscription.last_delivery_date || new Date().toISOString().slice(0, 10),
    next_delivery_date: subscription.next_delivery_date,
    deliveries_count: subscription.deliveries_count,
    order_number: renewal.order_number,
    fulfillment_method: subscription.fulfillment_method,
    delivery_address: subscription.delivery_address,
    delivery_city: subscription.delivery_city,
    payment_status: 'pending',
    app_url: appUrl,
  };

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [recipientEmail],
      subject: buildSubscriptionRenewalSubject(emailData),
      html: buildSubscriptionRenewalHtml(emailData),
      text: buildSubscriptionRenewalText(emailData),
    }),
  });

  const resendResult = await resendResponse.json();
  if (!resendResponse.ok) {
    console.error('Resend error for renewal:', renewal.subscription_id, resendResult);
    return { sent: false, error: 'Failed to send email' };
  }

  await admin
    .from('orders')
    .update({ client_email: recipientEmail })
    .eq('id', renewal.order_id)
    .is('client_email', null);

  return {
    sent: true,
    emailId: resendResult.id,
    sentTo: recipientEmail,
  };
}

/**
 * Processes due product subscriptions (creates renewal orders + emails clients).
 * Payment is recorded as `pending` until Stripe integration charges the saved card.
 * Invoke via pg_cron daily or manually with service role / cron secret.
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('ORDER_EMAIL_FROM') || 'PetHub <onboarding@resend.dev>';
  const appUrl = Deno.env.get('PUBLIC_APP_URL') || 'https://pethubgt.com';

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

  let result: RpcResult;
  const { data, error } = await supabase.rpc('process_due_product_subscriptions');

  if (error) {
    const rpcMissing =
      error.message.includes('Could not find the function') ||
      error.message.includes('does not exist') ||
      error.code === 'PGRST202';
    if (rpcMissing) {
      console.warn('RPC missing — processing renewals in edge function');
      try {
        result = await processRenewalsInEdge(supabase);
      } catch (fallbackError) {
        console.error('Edge renewal processing failed:', fallbackError);
        return json(
          {
            error:
              fallbackError instanceof Error ? fallbackError.message : 'Renewal processing failed',
          },
          500,
        );
      }
    } else {
      console.error('process_due_product_subscriptions error:', error);
      return json({ error: error.message }, 500);
    }
  } else {
    result = parseRpcResult(data);
  }

  const emailResults: Array<Record<string, unknown>> = [];

  if (resendApiKey && result.renewals?.length) {
    for (const renewal of result.renewals) {
      try {
        const emailResult = await sendRenewalEmail(
          supabase,
          renewal,
          resendApiKey,
          fromEmail,
          appUrl,
        );
        emailResults.push({
          subscription_id: renewal.subscription_id,
          order_id: renewal.order_id,
          ...emailResult,
        });
      } catch (emailError) {
        console.error('Renewal email error:', renewal.subscription_id, emailError);
        emailResults.push({
          subscription_id: renewal.subscription_id,
          order_id: renewal.order_id,
          sent: false,
          error: emailError instanceof Error ? emailError.message : 'Unexpected email error',
        });
      }
    }
  } else if (result.renewals?.length && !resendApiKey) {
    console.warn('RESEND_API_KEY not configured — renewal emails skipped');
  }

  return json({
    success: true,
    processed: result.processed ?? 0,
    emails_sent: emailResults.filter((r) => r.sent === true).length,
    email_results: emailResults,
    processed_at: new Date().toISOString(),
  });
});
