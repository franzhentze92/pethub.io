import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  buildOrderStatusHtml,
  buildOrderStatusSubject,
  buildOrderStatusText,
  type OrderStatusEmailData,
} from '../send-order-confirmation/template.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOTIFY_STATUSES = new Set([
  'processing',
  'shipped',
  'in_transit',
  'delivered',
  'completed',
  'cancelled',
]);

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function canNotifyOrderStatus(
  admin: ReturnType<typeof createClient>,
  userId: string,
  userEmail: string | undefined,
  orderId: string,
): Promise<boolean> {
  if (userEmail === 'admin@pethubgt.com' || userEmail === 'delivery@pehtubgt.com') {
    return true;
  }

  const { data: profile } = await admin
    .from('user_profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (profile?.role === 'admin' || profile?.role === 'delivery') {
    return true;
  }

  const { count } = await admin
    .from('order_items')
    .select('id', { count: 'exact', head: true })
    .eq('order_id', orderId)
    .eq('provider_id', userId);

  return (count ?? 0) > 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('ORDER_EMAIL_FROM') || 'PetHub <onboarding@resend.dev>';
    const appUrl = Deno.env.get('PUBLIC_APP_URL') || 'https://pethubgt.com';

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Missing Supabase configuration' }, 500);
    }

    if (!resendApiKey) {
      return jsonResponse({
        success: false,
        skipped: true,
        reason: 'RESEND_API_KEY not configured',
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '', {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json();
    const orderId = body?.orderId as string | undefined;
    const status = body?.status as string | undefined;
    const previousStatus = (body?.previousStatus as string | undefined) ?? null;

    if (!orderId || !status) {
      return jsonResponse({ error: 'orderId and status are required' }, 400);
    }

    if (!NOTIFY_STATUSES.has(status)) {
      return jsonResponse({
        success: false,
        skipped: true,
        reason: `Status "${status}" does not trigger client email`,
      });
    }

    if (previousStatus === status) {
      return jsonResponse({
        success: false,
        skipped: true,
        reason: 'Status unchanged',
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const allowed = await canNotifyOrderStatus(admin, user.id, user.email, orderId);
    if (!allowed) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return jsonResponse({ error: 'Order not found' }, 404);
    }

    if (order.status !== status) {
      return jsonResponse({ error: 'Order status mismatch' }, 409);
    }

    const { data: orderItems, error: itemsError } = await admin
      .from('order_items')
      .select('item_name, quantity, item_type')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (itemsError) {
      return jsonResponse({ error: 'Could not load order items' }, 500);
    }

    const { data: clientUser } = await admin.auth.admin.getUserById(order.client_id);
    const { data: clientProfile } = await admin
      .from('user_profiles')
      .select('full_name')
      .eq('user_id', order.client_id)
      .maybeSingle();

    const recipientEmail = order.client_email || clientUser?.user?.email;

    if (!recipientEmail) {
      return jsonResponse({ error: 'No email address for client' }, 400);
    }

    const clientName =
      order.delivery_name ||
      clientProfile?.full_name ||
      clientUser?.user?.user_metadata?.full_name ||
      recipientEmail.split('@')[0] ||
      'Cliente';

    const emailData: OrderStatusEmailData = {
      order_number: order.order_number,
      updated_at: order.updated_at || new Date().toISOString(),
      client_name: clientName,
      client_email: recipientEmail,
      status,
      previous_status: previousStatus,
      currency: order.currency || 'GTQ',
      grand_total: Number(order.grand_total) || 0,
      delivery_address: order.delivery_address,
      delivery_city: order.delivery_city,
      fulfillment_method: order.fulfillment_method || null,
      items: (orderItems || []).map((item) => ({
        item_name: item.item_name,
        quantity: item.quantity,
        item_type: item.item_type,
      })),
      app_url: appUrl,
    };

    const html = buildOrderStatusHtml(emailData);
    const text = buildOrderStatusText(emailData);
    const subject = buildOrderStatusSubject(emailData);

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        subject,
        html,
        text,
      }),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend error:', resendResult);
      return jsonResponse(
        {
          success: false,
          error: 'Failed to send email',
          details: resendResult,
        },
        502,
      );
    }

    if (!order.client_email) {
      await admin.from('orders').update({ client_email: recipientEmail }).eq('id', orderId);
    }

    return jsonResponse({
      success: true,
      emailId: resendResult.id,
      sentTo: recipientEmail,
      status,
    });
  } catch (error) {
    console.error('send-order-status-email error:', error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Unexpected error',
      },
      500,
    );
  }
});
