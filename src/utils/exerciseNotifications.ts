import { supabase } from '@/lib/supabase';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/services/notificationPreferencesService';
import type { AppNotification, UserNotificationPreferences } from '@/types/notifications';

export const WEEKLY_GOAL_MINUTES = 150;
const INACTIVE_DAYS = 4;
const WEEKLY_NUDGE_DAY_INDEX = 3;

function isRead(prefs: UserNotificationPreferences, id: string): boolean {
  return prefs.read_exercise_notifications.includes(id);
}

export function getWeekStartStr(date = new Date()): string {
  const start = new Date(date);
  const day = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start.toISOString().split('T')[0];
}

export function getWeekDayIndex(date = new Date()): number {
  return (date.getDay() + 6) % 7;
}

export function getWeeklyGoalNotificationId(petId: string, weekStart: string): string {
  return `exercise-weekly-${petId}-${weekStart}`;
}

export function getInactiveNotificationId(petId: string): string {
  return `exercise-inactive-${petId}`;
}

export function getExerciseReminderNotificationId(reminderId: string): string {
  return `exercise-reminder-${reminderId}`;
}

export function getExerciseNotificationIdsForPet(petId: string, weekStart?: string): string[] {
  return [
    getWeeklyGoalNotificationId(petId, weekStart ?? getWeekStartStr()),
    getInactiveNotificationId(petId),
  ];
}

export async function markExerciseNotificationsRead(
  userId: string,
  notificationIds: string[],
): Promise<void> {
  if (!notificationIds.length) return;

  const prefs = await getNotificationPreferences(userId);
  const merged = [...new Set([...prefs.read_exercise_notifications, ...notificationIds])];
  await updateNotificationPreferences(userId, { read_exercise_notifications: merged });
}

export async function markExerciseNotificationsReadForPet(
  userId: string,
  petId: string,
): Promise<void> {
  const ids = getExerciseNotificationIdsForPet(petId);

  const { data: reminders } = await supabase
    .from('pet_reminders')
    .select('id')
    .eq('owner_id', userId)
    .eq('pet_id', petId)
    .eq('reminder_type', 'exercise')
    .eq('is_active', true)
    .eq('is_completed', false);

  for (const reminder of reminders ?? []) {
    ids.push(getExerciseReminderNotificationId(reminder.id));
  }

  await markExerciseNotificationsRead(userId, ids);
}

export async function fetchExerciseNotificationsForBell(
  userId: string,
  prefs: UserNotificationPreferences,
): Promise<AppNotification[]> {
  if (!prefs.notify_exercise) return [];

  const items: AppNotification[] = [];
  const weekStart = getWeekStartStr();
  const weekDay = getWeekDayIndex();
  const today = new Date().toISOString().split('T')[0];
  const inactiveCutoff = new Date();
  inactiveCutoff.setDate(inactiveCutoff.getDate() - INACTIVE_DAYS);
  const inactiveCutoffStr = inactiveCutoff.toISOString().split('T')[0];

  const [petsRes, weekSessionsRes, remindersRes, allSessionsRes] = await Promise.all([
    supabase.from('pets').select('id, name').eq('owner_id', userId),
    supabase
      .from('exercise_sessions')
      .select('pet_id, duration_minutes')
      .eq('owner_id', userId)
      .gte('date', weekStart),
    supabase
      .from('pet_reminders')
      .select('id, pet_id, title, description, scheduled_date, scheduled_time, pets (name)')
      .eq('owner_id', userId)
      .eq('reminder_type', 'exercise')
      .eq('is_active', true)
      .eq('is_completed', false)
      .lte('scheduled_date', today),
    supabase
      .from('exercise_sessions')
      .select('pet_id, date')
      .eq('owner_id', userId)
      .order('date', { ascending: false }),
  ]);

  const pets = petsRes.data ?? [];
  const weekSessions = weekSessionsRes.data ?? [];

  if (weekDay >= WEEKLY_NUDGE_DAY_INDEX) {
    for (const pet of pets) {
      const minutes = weekSessions
        .filter((session) => session.pet_id === pet.id)
        .reduce((sum, session) => sum + session.duration_minutes, 0);

      if (minutes >= WEEKLY_GOAL_MINUTES) continue;

      const notificationId = getWeeklyGoalNotificationId(pet.id, weekStart);
      items.push({
        id: notificationId,
        type: 'exercise',
        title: 'Meta semanal de ejercicio',
        message: `${pet.name} lleva ${minutes} de ${WEEKLY_GOAL_MINUTES} min esta semana. ¡Registra una actividad!`,
        time: new Date(),
        unread: !isRead(prefs, notificationId),
        href: '/trazabilidad',
        tab: 'register',
        petId: pet.id,
      });
    }
  }

  const lastSessionByPet = new Map<string, string>();
  for (const session of allSessionsRes.data ?? []) {
    if (!lastSessionByPet.has(session.pet_id)) {
      lastSessionByPet.set(session.pet_id, session.date);
    }
  }

  for (const pet of pets) {
    const lastDate = lastSessionByPet.get(pet.id);
    const isInactive = !lastDate || lastDate < inactiveCutoffStr;
    if (!isInactive) continue;

    const notificationId = getInactiveNotificationId(pet.id);
    items.push({
      id: notificationId,
      type: 'exercise',
      title: 'Sin actividad reciente',
      message: lastDate
        ? `No hay ejercicio registrado para ${pet.name} en los últimos ${INACTIVE_DAYS} días`
        : `Aún no registras ejercicio para ${pet.name}. ¡Empieza hoy!`,
      time: lastDate ? new Date(`${lastDate}T12:00:00`) : new Date(),
      unread: !isRead(prefs, notificationId),
      href: '/trazabilidad',
      tab: 'register',
      petId: pet.id,
    });
  }

  for (const reminder of remindersRes.data ?? []) {
    const petName = (reminder.pets as { name?: string } | null)?.name ?? 'tu mascota';
    const notificationId = getExerciseReminderNotificationId(reminder.id);

    items.push({
      id: notificationId,
      type: 'exercise',
      title: reminder.title || 'Recordatorio de ejercicio',
      message: reminder.description || `Hora de ejercitar a ${petName}`,
      time: new Date(
        `${reminder.scheduled_date}${reminder.scheduled_time ? `T${reminder.scheduled_time}` : 'T09:00:00'}`,
      ),
      unread: !isRead(prefs, notificationId),
      href: '/trazabilidad',
      tab: 'register',
      petId: reminder.pet_id,
      petReminderId: reminder.id,
    });
  }

  return items;
}

export async function loadExercisePageUnreadIds(userId: string): Promise<Set<string>> {
  const prefs = await getNotificationPreferences(userId);
  const notifications = await fetchExerciseNotificationsForBell(userId, prefs);
  return new Set(notifications.filter((item) => item.unread).map((item) => item.id));
}
