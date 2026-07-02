import { supabase } from '@/lib/supabase';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/services/notificationPreferencesService';
import type { AppNotification, UserNotificationPreferences } from '@/types/notifications';

const RECENT_DAYS = 30;
const NEW_ORDER_DAYS = 14;

const ORDER_STATUS_LABELS: Record<string, string> = {
  confirmed: 'confirmada',
  processing: 'en proceso',
  shipped: 'enviada',
  delivered: 'entregada',
  cancelled: 'cancelada',
};

const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  confirmed: 'confirmada',
  completed: 'completada',
  cancelled: 'cancelada',
};

function isRead(prefs: UserNotificationPreferences, id: string): boolean {
  return prefs.read_order_notifications.includes(id);
}

export function getOrderStatusNotificationId(orderId: string, status: string): string {
  return `order-status-${orderId}-${status}`;
}

export function getOrderCreatedNotificationId(orderId: string): string {
  return `order-created-${orderId}`;
}

export function getAppointmentStatusNotificationId(appointmentId: string, status: string): string {
  return `appointment-status-${appointmentId}-${status}`;
}

export function getAppointmentPendingNotificationId(appointmentId: string): string {
  return `appointment-pending-${appointmentId}`;
}

export function getNotificationIdsForOrder(orderId: string, status: string): string[] {
  const ids = [getOrderStatusNotificationId(orderId, status)];
  if (status === 'pending') {
    ids.push(getOrderCreatedNotificationId(orderId));
  }
  return ids;
}

export function getNotificationIdsForAppointment(appointmentId: string, status: string): string[] {
  const ids = [getAppointmentStatusNotificationId(appointmentId, status)];
  if (status === 'pending') {
    ids.push(getAppointmentPendingNotificationId(appointmentId));
  }
  return ids;
}

export async function markClientOrderNotificationsRead(
  userId: string,
  notificationIds: string[],
): Promise<void> {
  if (!notificationIds.length) return;

  const prefs = await getNotificationPreferences(userId);
  const merged = [...new Set([...prefs.read_order_notifications, ...notificationIds])];
  await updateNotificationPreferences(userId, { read_order_notifications: merged });
}

export async function fetchClientOrdersNotificationsForBell(
  userId: string,
  prefs: UserNotificationPreferences,
): Promise<AppNotification[]> {
  if (!prefs.notify_orders) return [];

  const items: AppNotification[] = [];
  const since = new Date();
  since.setDate(since.getDate() - RECENT_DAYS);
  const newSince = new Date();
  newSince.setDate(newSince.getDate() - NEW_ORDER_DAYS);

  const [statusOrders, pendingOrders, statusAppointments, pendingAppointments] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_number, status, updated_at')
      .eq('client_id', userId)
      .neq('status', 'pending')
      .gte('updated_at', since.toISOString())
      .order('updated_at', { ascending: false })
      .limit(20),
    supabase
      .from('orders')
      .select('id, order_number, status, created_at')
      .eq('client_id', userId)
      .eq('status', 'pending')
      .gte('created_at', newSince.toISOString())
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('service_appointments')
      .select(`
        id,
        status,
        updated_at,
        appointment_date,
        provider_services (service_name)
      `)
      .eq('client_id', userId)
      .in('status', ['confirmed', 'completed', 'cancelled'])
      .gte('updated_at', since.toISOString())
      .order('updated_at', { ascending: false })
      .limit(15),
    supabase
      .from('service_appointments')
      .select(`
        id,
        status,
        created_at,
        appointment_date,
        provider_services (service_name)
      `)
      .eq('client_id', userId)
      .eq('status', 'pending')
      .gte('created_at', newSince.toISOString())
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  for (const order of pendingOrders.data ?? []) {
    const notificationId = getOrderCreatedNotificationId(order.id);
    items.push({
      id: notificationId,
      type: 'orders',
      title: 'Orden registrada',
      message: `Tu orden ${order.order_number} fue recibida y está pendiente de confirmación`,
      time: new Date(order.created_at),
      unread: !isRead(prefs, notificationId),
      href: '/client-orders',
      tab: 'pedidos',
      orderId: order.id,
    });
  }

  for (const order of statusOrders.data ?? []) {
    const label = ORDER_STATUS_LABELS[order.status] ?? order.status;
    const notificationId = getOrderStatusNotificationId(order.id, order.status);

    items.push({
      id: notificationId,
      type: 'orders',
      title: 'Actualización de pedido',
      message: `Tu orden ${order.order_number} está ${label}`,
      time: new Date(order.updated_at),
      unread: !isRead(prefs, notificationId),
      href: '/client-orders',
      tab: 'pedidos',
      orderId: order.id,
    });
  }

  for (const appointment of pendingAppointments.data ?? []) {
    const serviceName =
      (appointment.provider_services as { service_name?: string } | null)?.service_name ??
      'tu servicio';
    const notificationId = getAppointmentPendingNotificationId(appointment.id);

    items.push({
      id: notificationId,
      type: 'orders',
      title: 'Reserva registrada',
      message: `Tu reserva de ${serviceName} está pendiente de confirmación`,
      time: new Date(appointment.created_at),
      unread: !isRead(prefs, notificationId),
      href: '/client-orders',
      tab: 'reservas',
      appointmentId: appointment.id,
    });
  }

  for (const appointment of statusAppointments.data ?? []) {
    const serviceName =
      (appointment.provider_services as { service_name?: string } | null)?.service_name ??
      'tu servicio';
    const label = APPOINTMENT_STATUS_LABELS[appointment.status] ?? appointment.status;
    const notificationId = getAppointmentStatusNotificationId(appointment.id, appointment.status);

    items.push({
      id: notificationId,
      type: 'orders',
      title: 'Actualización de reserva',
      message: `Tu reserva de ${serviceName} fue ${label}`,
      time: new Date(appointment.updated_at),
      unread: !isRead(prefs, notificationId),
      href: '/client-orders',
      tab: 'reservas',
      appointmentId: appointment.id,
    });
  }

  return items;
}

export async function loadClientOrdersPageUnreadIds(userId: string): Promise<Set<string>> {
  const prefs = await getNotificationPreferences(userId);
  const notifications = await fetchClientOrdersNotificationsForBell(userId, prefs);
  return new Set(notifications.filter((n) => n.unread).map((n) => n.id));
}
