import { supabase } from '@/lib/supabase';
import {
  fetchActiveFeedingNotificationsForBell,
  markFeedingNotificationsRead,
} from '@/utils/feedingScheduleAutomation';
import type { AppNotification } from '@/types/notifications';

export function getFeedingNotificationId(dbNotificationId: string): string {
  return `feeding-${dbNotificationId}`;
}

export async function fetchNutritionNotificationsForBell(
  userId: string,
): Promise<AppNotification[]> {
  const reminders = await fetchActiveFeedingNotificationsForBell(userId);

  return reminders.map((reminder) => ({
    id: reminder.id,
    type: 'feeding',
    title: reminder.title,
    message: reminder.message,
    time: reminder.time,
    unread: true,
    href: '/feeding-schedules',
    tab: 'meals',
    mealId: reminder.mealId,
    openComplete: true,
  }));
}

export async function markNutritionNotificationsRead(
  userId: string,
  notificationIds?: string[],
): Promise<void> {
  await markFeedingNotificationsRead(userId, notificationIds);
}

export async function markNutritionNotificationsReadForMeal(
  userId: string,
  mealId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('feeding_schedule_notifications')
    .select('id')
    .eq('owner_id', userId)
    .eq('meal_id', mealId)
    .eq('status', 'pending');

  if (error || !data?.length) return;

  await markFeedingNotificationsRead(
    userId,
    data.map((row) => getFeedingNotificationId(row.id)),
  );
}

export async function loadNutritionPagePendingMealIds(userId: string): Promise<Set<string>> {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('feeding_schedule_notifications')
    .select(`
      meal_id,
      automated_meals!feeding_schedule_notifications_meal_id_fkey (status)
    `)
    .eq('owner_id', userId)
    .eq('notification_type', 'upcoming_feeding')
    .eq('status', 'pending')
    .lte('scheduled_time', nowIso);

  if (error || !data?.length) return new Set();

  return new Set(
    data
      .filter((row) => {
        const meal = row.automated_meals as { status?: string } | null;
        return meal?.status === 'scheduled';
      })
      .map((row) => row.meal_id as string),
  );
}

export async function fetchMealForDeepLink(mealId: string): Promise<{
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  pet_id: string;
  schedule_id: string;
  meal_type: string;
  food_id: string;
  quantity_grams: number;
  pets?: { name: string };
  pet_foods?: { name: string; brand: string };
} | null> {
  const { data, error } = await supabase
    .from('automated_meals')
    .select(`
      id,
      scheduled_date,
      scheduled_time,
      status,
      pet_id,
      schedule_id,
      meal_type,
      food_id,
      quantity_grams,
      pets (name),
      pet_foods!automated_meals_food_id_fkey (name, brand)
    `)
    .eq('id', mealId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}
