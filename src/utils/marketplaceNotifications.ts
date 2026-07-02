import { supabase } from '@/lib/supabase';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/services/notificationPreferencesService';
import type { AppNotification, UserNotificationPreferences } from '@/types/notifications';
import { fetchClientOrdersNotificationsForBell } from '@/utils/clientOrdersNotifications';

const NEW_ORDER_DAYS = 14;

function isRead(prefs: UserNotificationPreferences, id: string): boolean {
  return prefs.read_order_notifications.includes(id);
}

export async function markMarketplaceNotificationsRead(
  userId: string,
  notificationIds: string[],
): Promise<void> {
  if (!notificationIds.length) return;

  const prefs = await getNotificationPreferences(userId);
  const merged = [...new Set([...prefs.read_order_notifications, ...notificationIds])];
  await updateNotificationPreferences(userId, { read_order_notifications: merged });
}

export async function fetchMarketplaceNotificationsForBell(
  userId: string,
  prefs: UserNotificationPreferences,
): Promise<AppNotification[]> {
  if (!prefs.notify_orders) return [];

  const clientItems = await fetchClientOrdersNotificationsForBell(userId, prefs);
  const providerItems = await fetchProviderMarketplaceNotifications(userId, prefs);

  return [...clientItems, ...providerItems];
}

async function fetchProviderMarketplaceNotifications(
  userId: string,
  prefs: UserNotificationPreferences,
): Promise<AppNotification[]> {
  const items: AppNotification[] = [];
  const newSince = new Date();
  newSince.setDate(newSince.getDate() - NEW_ORDER_DAYS);

  const [providerOrderItems, providerAppointments] = await Promise.all([
    supabase
      .from('order_items')
      .select(`
        order_id,
        created_at,
        orders!inner (
          id,
          order_number,
          status,
          created_at,
          delivery_name
        )
      `)
      .eq('provider_id', userId)
      .gte('created_at', newSince.toISOString())
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('service_appointments')
      .select(`
        id,
        status,
        created_at,
        appointment_date,
        client_name,
        provider_services (service_name)
      `)
      .eq('provider_id', userId)
      .eq('status', 'pending')
      .gte('created_at', newSince.toISOString())
      .order('created_at', { ascending: false })
      .limit(15),
  ]);

  const seenProviderOrders = new Set<string>();
  for (const item of providerOrderItems.data ?? []) {
    const order = item.orders as {
      id: string;
      order_number: string;
      status: string;
      created_at: string;
      delivery_name?: string;
    } | null;
    if (!order || order.status !== 'pending' || seenProviderOrders.has(order.id)) continue;
    seenProviderOrders.add(order.id);

    const notificationId = `provider-order-new-${order.id}`;
    items.push({
      id: notificationId,
      type: 'orders',
      title: 'Nuevo pedido recibido',
      message: `Orden ${order.order_number} de ${order.delivery_name || 'un cliente'}`,
      time: new Date(order.created_at),
      unread: !isRead(prefs, notificationId),
      href: '/provider',
      activeTab: 'orders',
      orderId: order.id,
    });
  }

  for (const appointment of providerAppointments.data ?? []) {
    const serviceName =
      (appointment.provider_services as { service_name?: string } | null)?.service_name ??
      'un servicio';
    const notificationId = `provider-appointment-new-${appointment.id}`;

    items.push({
      id: notificationId,
      type: 'orders',
      title: 'Nueva reserva de servicio',
      message: `${appointment.client_name || 'Un cliente'} reservó ${serviceName}`,
      time: new Date(appointment.created_at),
      unread: !isRead(prefs, notificationId),
      href: '/provider',
      activeTab: 'orders',
      activeSubTab: 'appointments',
      appointmentId: appointment.id,
    });
  }

  return items;
}
