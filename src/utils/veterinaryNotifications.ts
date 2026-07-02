import { addDays, isBefore, parseISO, startOfDay } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { computeVaccinationStatus } from '@/lib/vaccinationCatalog';
import { getAppointmentTypeLabel, isVaccinationType } from '@/lib/veterinaryTypes';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/services/notificationPreferencesService';
import type { AppNotification, UserNotificationPreferences } from '@/types/notifications';

const DUE_SOON_DAYS = 14;
const FOLLOW_UP_WINDOW_DAYS = 14;

function isRead(prefs: UserNotificationPreferences, id: string): boolean {
  return prefs.read_vet_notifications.includes(id);
}

export function getVaccinationNotificationId(vaccinationId: string): string {
  return `vet-vaccination-${vaccinationId}`;
}

export function getFollowUpNotificationId(sessionId: string): string {
  return `vet-followup-${sessionId}`;
}

export function getVetReminderNotificationId(reminderId: string): string {
  return `vet-reminder-${reminderId}`;
}

function isFollowUpInWindow(followUpDate: string): boolean {
  const today = startOfDay(new Date());
  const due = startOfDay(parseISO(followUpDate));
  if (isBefore(due, today)) return true;
  return !isBefore(addDays(today, FOLLOW_UP_WINDOW_DAYS), due);
}

export async function markVeterinaryNotificationsRead(
  userId: string,
  notificationIds: string[],
): Promise<void> {
  if (!notificationIds.length) return;

  const prefs = await getNotificationPreferences(userId);
  const merged = [...new Set([...prefs.read_vet_notifications, ...notificationIds])];
  await updateNotificationPreferences(userId, { read_vet_notifications: merged });
}

export async function markVeterinaryNotificationsReadForPet(
  userId: string,
  petId: string,
): Promise<void> {
  const ids: string[] = [];

  const [vaccinationsRes, followUpsRes, remindersRes] = await Promise.all([
    supabase
      .from('pet_vaccinations')
      .select('id')
      .eq('owner_id', userId)
      .eq('pet_id', petId)
      .is('reminder_completed_at', null),
    supabase
      .from('veterinary_sessions')
      .select('id')
      .eq('owner_id', userId)
      .eq('pet_id', petId)
      .not('follow_up_date', 'is', null)
      .is('follow_up_completed_at', null),
    supabase
      .from('pet_reminders')
      .select('id')
      .eq('owner_id', userId)
      .eq('pet_id', petId)
      .eq('reminder_type', 'vet')
      .eq('is_active', true)
      .eq('is_completed', false),
  ]);

  for (const row of vaccinationsRes.data ?? []) {
    ids.push(getVaccinationNotificationId(row.id));
  }
  for (const row of followUpsRes.data ?? []) {
    ids.push(getFollowUpNotificationId(row.id));
  }
  for (const row of remindersRes.data ?? []) {
    ids.push(getVetReminderNotificationId(row.id));
  }

  await markVeterinaryNotificationsRead(userId, ids);
}

export async function fetchVeterinaryNotificationsForBell(
  userId: string,
  prefs: UserNotificationPreferences,
): Promise<AppNotification[]> {
  if (!prefs.notify_vet) return [];

  const items: AppNotification[] = [];
  const today = new Date().toISOString().split('T')[0];

  const [vaccinationsRes, followUpsRes, remindersRes] = await Promise.all([
    supabase
      .from('pet_vaccinations')
      .select(`
        id,
        pet_id,
        vaccine_name,
        next_due_date,
        pets (name)
      `)
      .eq('owner_id', userId)
      .not('next_due_date', 'is', null)
      .is('reminder_completed_at', null),
    supabase
      .from('veterinary_sessions')
      .select(`
        id,
        pet_id,
        appointment_type,
        diagnosis,
        follow_up_date,
        pets (name)
      `)
      .eq('owner_id', userId)
      .not('follow_up_date', 'is', null)
      .is('follow_up_completed_at', null),
    supabase
      .from('pet_reminders')
      .select(`
        id,
        pet_id,
        title,
        description,
        scheduled_date,
        scheduled_time,
        pets (name)
      `)
      .eq('owner_id', userId)
      .eq('reminder_type', 'vet')
      .eq('is_active', true)
      .eq('is_completed', false)
      .lte('scheduled_date', today),
  ]);

  for (const record of vaccinationsRes.data ?? []) {
    const status = computeVaccinationStatus(record.next_due_date, DUE_SOON_DAYS);
    if (status !== 'overdue' && status !== 'due_soon') continue;

    const petName = (record.pets as { name?: string } | null)?.name ?? 'tu mascota';
    const notificationId = getVaccinationNotificationId(record.id);
    const overdue = status === 'overdue';

    items.push({
      id: notificationId,
      type: 'vet',
      title: overdue ? 'Vacuna vencida' : 'Vacuna próxima',
      message: overdue
        ? `La vacuna ${record.vaccine_name} de ${petName} está vencida`
        : `La vacuna ${record.vaccine_name} de ${petName} vence pronto`,
      time: new Date(record.next_due_date),
      unread: !isRead(prefs, notificationId),
      href: '/veterinaria',
      tab: 'register',
      petId: record.pet_id,
      vaccinationId: record.id,
    });
  }

  for (const session of followUpsRes.data ?? []) {
    if (isVaccinationType(session.appointment_type)) continue;
    if (!session.follow_up_date || !isFollowUpInWindow(session.follow_up_date)) continue;

    const petName = (session.pets as { name?: string } | null)?.name ?? 'tu mascota';
    const notificationId = getFollowUpNotificationId(session.id);
    const overdue = isBefore(startOfDay(parseISO(session.follow_up_date)), startOfDay(new Date()));

    items.push({
      id: notificationId,
      type: 'vet',
      title: overdue ? 'Seguimiento veterinario vencido' : 'Seguimiento veterinario',
      message: overdue
        ? `Seguimiento de ${getAppointmentTypeLabel(session.appointment_type)} para ${petName} está pendiente`
        : `Próximo seguimiento de ${petName}: ${getAppointmentTypeLabel(session.appointment_type)}`,
      time: new Date(session.follow_up_date),
      unread: !isRead(prefs, notificationId),
      href: '/veterinaria',
      tab: 'history',
      petId: session.pet_id,
      veterinarySessionId: session.id,
    });
  }

  for (const reminder of remindersRes.data ?? []) {
    const petName = (reminder.pets as { name?: string } | null)?.name ?? 'tu mascota';
    const notificationId = getVetReminderNotificationId(reminder.id);

    items.push({
      id: notificationId,
      type: 'vet',
      title: reminder.title || 'Recordatorio veterinario',
      message: reminder.description || `Cita o cuidado veterinario para ${petName}`,
      time: new Date(
        `${reminder.scheduled_date}${reminder.scheduled_time ? `T${reminder.scheduled_time}` : 'T09:00:00'}`,
      ),
      unread: !isRead(prefs, notificationId),
      href: '/veterinaria',
      tab: 'register',
      petId: reminder.pet_id,
      petReminderId: reminder.id,
    });
  }

  return items;
}

export async function loadVeterinaryPageUnreadIds(userId: string): Promise<Set<string>> {
  const prefs = await getNotificationPreferences(userId);
  const notifications = await fetchVeterinaryNotificationsForBell(userId, prefs);
  return new Set(notifications.filter((item) => item.unread).map((item) => item.id));
}

export function sessionHasUnreadNotification(
  sessionId: string,
  followUpDate: string | null | undefined,
  unreadIds: Set<string>,
): boolean {
  if (!followUpDate) return false;
  return unreadIds.has(getFollowUpNotificationId(sessionId));
}
