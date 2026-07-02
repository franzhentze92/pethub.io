import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  buildOrderConfirmationHtml,
  buildOrderConfirmationText,
  type OrderEmailData,
  type OrderEmailItem,
} from './template.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function formatAppointmentLabel(
  appointmentDate?: string | null,
  startTime?: string | null,
  endTime?: string | null,
): string | null {
  if (!appointmentDate) return null;
  try {
    const date = new Date(appointmentDate);
    const datePart = date.toLocaleDateString('es-GT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    if (startTime) {
      const timePart = endTime ? `${startTime} – ${endTime}` : startTime;
      return `${datePart} · ${timePart}`;
    }
    return datePart;
  } catch {
    return appointmentDate;
  }
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
    if (!orderId) {
      return jsonResponse({ error: 'orderId is required' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return jsonResponse({ error: 'Order not found' }, 404);
    }

    if (order.client_id !== user.id) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    const { data: orderItems, error: itemsError } = await admin
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (itemsError) {
      return jsonResponse({ error: 'Could not load order items' }, 500);
    }

    const itemIds = (orderItems || []).map((item) => item.id);
    const petNamesByOrderItem = new Map<string, string[]>();

    if (itemIds.length > 0) {
      const { data: petLinks } = await admin
        .from('order_item_pets')
        .select('order_item_id, pets(name)')
        .in('order_item_id', itemIds);

      (petLinks || []).forEach((link) => {
        const name = (link.pets as { name?: string } | null)?.name?.trim();
        if (!name) return;
        const list = petNamesByOrderItem.get(link.order_item_id) || [];
        list.push(name);
        petNamesByOrderItem.set(link.order_item_id, list);
      });
    }

    const serviceIds = (orderItems || [])
      .filter((item) => item.item_type === 'service' && item.item_id)
      .map((item) => item.item_id as string);

    const appointmentByService = new Map<string, string>();

    if (serviceIds.length > 0) {
      const orderCreated = new Date(order.created_at).getTime();
      const windowStart = new Date(orderCreated - 5 * 60 * 1000).toISOString();

      const { data: appointments } = await admin
        .from('service_appointments')
        .select(`
          service_id,
          appointment_date,
          provider_service_time_slots ( start_time, end_time )
        `)
        .eq('client_id', order.client_id)
        .in('service_id', serviceIds)
        .gte('created_at', windowStart)
        .order('created_at', { ascending: false });

      (appointments || []).forEach((appt) => {
        if (!appt.service_id || appointmentByService.has(appt.service_id)) return;
        const slot = appt.provider_service_time_slots as
          | { start_time?: string; end_time?: string }
          | null;
        const label = formatAppointmentLabel(
          appt.appointment_date,
          slot?.start_time,
          slot?.end_time,
        );
        if (label) appointmentByService.set(appt.service_id, label);
      });
    }

    const { data: invoice } = await admin
      .from('invoices')
      .select('invoice_number')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const recipientEmail =
      order.client_email ||
      user.email ||
      (await admin.auth.admin.getUserById(order.client_id)).data.user?.email;

    if (!recipientEmail) {
      return jsonResponse({ error: 'No email address for client' }, 400);
    }

    const clientName =
      order.delivery_name ||
      user.user_metadata?.full_name ||
      recipientEmail.split('@')[0] ||
      'Cliente';

    const emailItems: OrderEmailItem[] = (orderItems || []).map((item) => ({
      id: item.id,
      item_type: item.item_type,
      item_name: item.item_name,
      item_description: item.item_description,
      item_image_url: item.item_image_url,
      provider_name: item.provider_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      currency: item.currency,
      has_delivery: item.has_delivery,
      has_pickup: item.has_pickup,
      pet_names: petNamesByOrderItem.get(item.id),
      appointment_label:
        item.item_type === 'service' && item.item_id
          ? appointmentByService.get(item.item_id) || null
          : null,
    }));

    const emailData: OrderEmailData = {
      order_number: order.order_number,
      created_at: order.created_at,
      client_name: clientName,
      client_email: recipientEmail,
      delivery_name: order.delivery_name,
      delivery_phone: order.delivery_phone,
      delivery_address: order.delivery_address,
      delivery_city: order.delivery_city,
      delivery_instructions: order.delivery_instructions,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      status: order.status,
      currency: order.currency || 'GTQ',
      total_amount: Number(order.total_amount) || 0,
      delivery_fee: Number(order.delivery_fee) || 0,
      grand_total: Number(order.grand_total) || 0,
      invoice_number: invoice?.invoice_number || null,
      fulfillment_method: order.fulfillment_method || null,
      items: emailItems,
      app_url: appUrl,
    };

    const html = buildOrderConfirmationHtml(emailData);
    const text = buildOrderConfirmationText(emailData);

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        subject: `✅ Confirmación de compra ${order.order_number} — PetHub`,
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
    });
  } catch (error) {
    console.error('send-order-confirmation error:', error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Unexpected error',
      },
      500,
    );
  }
});
