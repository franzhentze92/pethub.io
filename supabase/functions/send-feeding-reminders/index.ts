import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
// @deno-types="npm:@types/web-push"
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  subscription: webpush.PushSubscription;
}

interface DueNotification {
  id: string;
  owner_id: string;
  message: string | null;
  meal_id: string;
  automated_meals: {
    status: string;
    scheduled_date: string;
    scheduled_time: string;
    pets: { name: string } | null;
  };
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Missing Supabase env' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const loadSecret = async (dbKey: string, envKey: string): Promise<string | null> => {
    const fromEnv = Deno.env.get(envKey);
    if (fromEnv) return fromEnv;
    const { data, error } = await supabase.rpc('get_private_app_secret', { p_key: dbKey });
    if (error || !data) return null;
    return data as string;
  };

  const vapidPublic = await loadSecret('vapid_public_key', 'VAPID_PUBLIC_KEY');
  const vapidPrivate = await loadSecret('vapid_private_key', 'VAPID_PRIVATE_KEY');
  const vapidSubject =
    (await loadSecret('vapid_subject', 'VAPID_SUBJECT')) || 'mailto:admin@pethubgt.com';

  if (!vapidPublic || !vapidPrivate) {
    return json({ error: 'VAPID keys not configured' }, 500);
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const { data: due, error: dueError } = await supabase
    .from('feeding_schedule_notifications')
    .select(`
      id,
      owner_id,
      message,
      meal_id,
      automated_meals!inner (
        status,
        scheduled_date,
        scheduled_time,
        pets (name)
      )
    `)
    .eq('status', 'pending')
    .lte('scheduled_time', new Date().toISOString())
    .eq('automated_meals.status', 'scheduled')
    .limit(50);

  if (dueError) {
    console.error('due notifications error', dueError);
    return json({ error: dueError.message }, 500);
  }

  const notifications = (due ?? []) as DueNotification[];
  let sent = 0;
  let failed = 0;

  for (const notification of notifications) {
    const petName = notification.automated_meals?.pets?.name ?? 'tu mascota';
    const mealTime = notification.automated_meals?.scheduled_time ?? '';
    const title = 'Recordatorio de comida';
    const body =
      notification.message ||
      `Es hora de alimentar a ${petName}${mealTime ? ` (${mealTime})` : ''}`;

    const { data: subs, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, subscription')
      .eq('user_id', notification.owner_id);

    if (subsError) {
      console.error('subscriptions error', subsError);
      failed++;
      continue;
    }

    const payload = JSON.stringify({
      title,
      body,
      url: '/feeding-schedules',
      tag: `feeding-${notification.meal_id}`,
    });

    let delivered = false;

    for (const sub of (subs ?? []) as PushSubscriptionRow[]) {
      try {
        await webpush.sendNotification(sub.subscription, payload);
        delivered = true;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        console.error('push failed', sub.endpoint, err);
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    }

    if (delivered || !subs?.length) {
      await supabase
        .from('feeding_schedule_notifications')
        .update({ status: 'sent' })
        .eq('id', notification.id);
      sent++;
    } else {
      failed++;
    }
  }

  return json({
    processed: notifications.length,
    sent,
    failed,
  });
});
