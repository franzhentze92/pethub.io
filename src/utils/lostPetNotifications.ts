import { supabase } from '@/lib/supabase';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/services/notificationPreferencesService';
import type { AppNotification, UserNotificationPreferences } from '@/types/notifications';

const NEW_REPORTS_DAYS = 14;

function isRead(prefs: UserNotificationPreferences, id: string): boolean {
  return prefs.read_lost_pet_notifications.includes(id);
}

export async function markLostPetNotificationsRead(
  userId: string,
  notificationIds: string[],
): Promise<void> {
  if (!notificationIds.length) return;

  const prefs = await getNotificationPreferences(userId);
  const merged = [...new Set([...prefs.read_lost_pet_notifications, ...notificationIds])];
  await updateNotificationPreferences(userId, { read_lost_pet_notifications: merged });
}

export async function fetchLostPetNotificationsForBell(
  userId: string,
  prefs: UserNotificationPreferences,
): Promise<AppNotification[]> {
  if (!prefs.notify_lost_pets) return [];

  const items: AppNotification[] = [];
  const since = new Date();
  since.setDate(since.getDate() - NEW_REPORTS_DAYS);

  const [myStatusUpdates, communityReports] = await Promise.all([
    supabase
      .from('lost_pets')
      .select('id, name, status, updated_at')
      .eq('owner_id', userId)
      .in('status', ['found', 'recovered'])
      .order('updated_at', { ascending: false })
      .limit(10),
    supabase
      .from('lost_pets')
      .select('id, name, last_location, created_at, owner_id')
      .eq('status', 'lost')
      .neq('owner_id', userId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(15),
  ]);

  for (const report of myStatusUpdates.data ?? []) {
    const notificationId = `lost-status-${report.id}-found`;
    items.push({
      id: notificationId,
      type: 'lost_pet',
      title: '¡Mascota encontrada!',
      message: `Tu reporte de ${report.name} fue marcado como encontrado`,
      time: new Date(report.updated_at),
      unread: !isRead(prefs, notificationId),
      href: '/mascotas-perdidas',
      tab: 'mis-reportes',
      lostPetId: report.id,
    });
  }

  for (const report of communityReports.data ?? []) {
    const notificationId = `lost-new-${report.id}`;
    const location = report.last_location?.trim() || 'ubicación no indicada';

    items.push({
      id: notificationId,
      type: 'lost_pet',
      title: 'Nueva mascota perdida',
      message: `${report.name} reportada cerca de ${location}`,
      time: new Date(report.created_at),
      unread: !isRead(prefs, notificationId),
      href: '/mascotas-perdidas',
      tab: 'list',
      lostPetId: report.id,
    });
  }

  return items;
}
