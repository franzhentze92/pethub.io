import { supabase } from '../lib/supabase';
import type { FeedingSchedule } from '../services/FeedingScheduleService';

export function scheduleDayOfWeek(date: Date): number {
  const jsDay = date.getDay();
  return jsDay === 0 ? 7 : jsDay;
}

function parseScheduleDateLocal(dateStr: string): Date {
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return new Date(dateStr);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function scheduleAppliesOnDate(
  schedule: Pick<FeedingSchedule, 'start_date' | 'end_date' | 'days_of_week' | 'is_active'>,
  date: Date,
): boolean {
  if (!schedule.is_active) return false;

  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  const start = parseScheduleDateLocal(schedule.start_date);
  start.setHours(0, 0, 0, 0);

  const end = schedule.end_date ? parseScheduleDateLocal(schedule.end_date) : null;
  if (end) end.setHours(23, 59, 59, 999);

  if (d < start || (end && d > end)) return false;
  return (schedule.days_of_week || []).includes(scheduleDayOfWeek(d));
}

/** Normalize HH:MM or HH:MM:SS to HH:MM for consistent dedupe keys. */
export function normalizeScheduledTime(time: string): string {
  const match = String(time).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return String(time).trim();
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

function mealDedupeKey(scheduleId: string, time: string, mealType: string): string {
  return `${scheduleId}:${normalizeScheduledTime(time)}:${mealType}`;
}

function crossScheduleDedupeKey(
  petId: string,
  date: string,
  time: string,
  mealType: string,
): string {
  return `${petId}:${date}:${normalizeScheduledTime(time)}:${mealType}`;
}

export async function generateMealsForSchedules(
  userId: string,
  schedules: FeedingSchedule[],
  days = 7,
  startDate = new Date(),
): Promise<number> {
  const active = schedules.filter((s) => s.is_active && s.auto_generate_meals);
  if (active.length === 0) return 0;

  const today = new Date(startDate);
  today.setHours(0, 0, 0, 0);

  let totalGenerated = 0;

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const applicable = active.filter((s) => scheduleAppliesOnDate(s, date));
    if (applicable.length === 0) continue;

    const { data: existingMeals } = await supabase
      .from('automated_meals')
      .select('schedule_id, pet_id, scheduled_time, meal_type')
      .eq('owner_id', userId)
      .eq('scheduled_date', dateStr)
      .eq('status', 'scheduled');

    const existingKeys = new Set(
      (existingMeals || []).map((m) =>
        mealDedupeKey(m.schedule_id, m.scheduled_time, m.meal_type),
      ),
    );
    const existingCrossSchedule = new Set(
      (existingMeals || []).map((m) =>
        crossScheduleDedupeKey(m.pet_id, dateStr, m.scheduled_time, m.meal_type),
      ),
    );

    const mealsToCreate: Array<{
      pet_id: string;
      food_id: string;
      schedule_id: string;
      quantity_grams: number;
      scheduled_date: string;
      scheduled_time: string;
      meal_type: string;
      status: string;
      owner_id: string;
    }> = [];

    for (const schedule of applicable) {
      for (const feedingTime of schedule.feeding_times || []) {
        if (!schedule.pet_id || !feedingTime.food_id) continue;

        const key = mealDedupeKey(schedule.id, feedingTime.time, feedingTime.meal_type);
        const crossKey = crossScheduleDedupeKey(
          schedule.pet_id,
          dateStr,
          feedingTime.time,
          feedingTime.meal_type,
        );
        if (existingKeys.has(key) || existingCrossSchedule.has(crossKey)) continue;

        mealsToCreate.push({
          pet_id: schedule.pet_id,
          food_id: feedingTime.food_id,
          schedule_id: schedule.id,
          quantity_grams: feedingTime.quantity_grams || 100,
          scheduled_date: dateStr,
          scheduled_time: feedingTime.time,
          meal_type: feedingTime.meal_type,
          status: 'scheduled',
          owner_id: userId,
        });
        existingKeys.add(key);
        existingCrossSchedule.add(crossKey);
      }
    }

    if (mealsToCreate.length === 0) continue;

    const { data: inserted, error } = await supabase
      .from('automated_meals')
      .insert(mealsToCreate)
      .select('id, schedule_id');

    if (error) {
      console.error(`Error generating meals for ${dateStr}:`, error);
      continue;
    }

    totalGenerated += inserted?.length ?? mealsToCreate.length;

    for (const meal of inserted || []) {
      const schedule = applicable.find((s) => s.id === meal.schedule_id);
      if (schedule?.send_notifications) {
        await ensureNotificationRecord(meal.id, userId).catch(() => {});
      }
    }
  }

  if (totalGenerated > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('feeding-notifications-updated'));
  }

  return totalGenerated;
}

export async function deduplicateScheduledMeals(userId: string): Promise<{
  removed: number;
  kept: number;
}> {
  const { data: meals, error } = await supabase
    .from('automated_meals')
    .select('id, pet_id, scheduled_date, scheduled_time, meal_type, status, created_at')
    .eq('owner_id', userId)
    .eq('status', 'scheduled')
    .gte('scheduled_date', new Date().toISOString().split('T')[0])
    .order('created_at', { ascending: true });

  if (error || !meals?.length) return { removed: 0, kept: 0 };

  const groups = new Map<string, typeof meals>();
  for (const meal of meals) {
    const key = crossScheduleDedupeKey(
      meal.pet_id,
      meal.scheduled_date,
      meal.scheduled_time,
      meal.meal_type,
    );
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(meal);
  }

  const toDelete: string[] = [];
  let kept = 0;
  for (const group of groups.values()) {
    if (group.length <= 1) {
      kept += group.length;
      continue;
    }
    kept += 1;
    for (const dup of group.slice(1)) {
      toDelete.push(dup.id);
    }
  }

  if (toDelete.length === 0) return { removed: 0, kept };

  const { error: delError } = await supabase.from('automated_meals').delete().in('id', toDelete);
  if (delError) throw delError;

  return { removed: toDelete.length, kept };
}

export async function generateMealsForSchedule(
  userId: string,
  schedule: FeedingSchedule,
  days = 7,
): Promise<number> {
  return generateMealsForSchedules(userId, [schedule], days);
}

export async function ensureAutoCompleteEnabledForUser(userId: string): Promise<void> {
  const syncKey = `feedingAutoCompleteSynced:${userId}`;
  if (typeof localStorage !== 'undefined' && localStorage.getItem(syncKey)) return;

  const { error } = await supabase
    .from('pet_feeding_schedules')
    .update({ auto_complete_enabled: true, updated_at: new Date().toISOString() })
    .eq('owner_id', userId)
    .eq('auto_complete_enabled', false);

  if (error) {
    console.error('ensureAutoCompleteEnabledForUser failed:', error);
    return;
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(syncKey, '1');
  }
}

export async function autoCompleteOverdueMealsForUser(userId: string): Promise<number> {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  const { data: scheduledMeals, error } = await supabase
    .from('automated_meals')
    .select(`
      id,
      scheduled_date,
      scheduled_time,
      pet_feeding_schedules!automated_meals_schedule_id_fkey (
        auto_complete_enabled,
        auto_complete_minutes_after
      )
    `)
    .eq('owner_id', userId)
    .eq('status', 'scheduled')
    .eq('scheduled_date', today);

  if (error || !scheduledMeals?.length) return 0;

  const { FeedingScheduleService } = await import('../services/FeedingScheduleService');
  let count = 0;

  for (const meal of scheduledMeals) {
    const schedule = meal.pet_feeding_schedules as {
      auto_complete_enabled?: boolean;
      auto_complete_minutes_after?: number;
    } | null;

    if (!schedule?.auto_complete_enabled) continue;

    const mealDateTime = new Date(`${meal.scheduled_date}T${meal.scheduled_time}`);
    const autoCompleteTime = new Date(mealDateTime);
    autoCompleteTime.setMinutes(
      autoCompleteTime.getMinutes() + (schedule.auto_complete_minutes_after || 30),
    );

    if (now >= autoCompleteTime) {
      try {
        await FeedingScheduleService.markMealAsCompleted(meal.id, userId, {
          notes: 'Auto-completed',
        });
        count++;
      } catch (e) {
        console.error('Auto-complete failed for meal', meal.id, e);
      }
    }
  }

  return count;
}

export interface FeedingBellNotification {
  id: string;
  dbId: string;
  mealId: string;
  title: string;
  message: string;
  time: Date;
}

export async function fetchActiveFeedingNotificationsForBell(
  userId: string,
): Promise<FeedingBellNotification[]> {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('feeding_schedule_notifications')
    .select(`
      id,
      message,
      scheduled_time,
      meal_id,
      automated_meals!feeding_schedule_notifications_meal_id_fkey (
        status,
        scheduled_date,
        scheduled_time,
        pets (name)
      )
    `)
    .eq('owner_id', userId)
    .eq('notification_type', 'upcoming_feeding')
    .eq('status', 'pending')
    .lte('scheduled_time', nowIso)
    .order('scheduled_time', { ascending: false })
    .limit(20);

  if (error || !data?.length) return [];

  return data
    .filter((row) => {
      const meal = row.automated_meals as {
        status?: string;
        scheduled_date?: string;
        scheduled_time?: string;
      } | null;
      return meal?.status === 'scheduled' && meal.scheduled_date && meal.scheduled_time;
    })
    .map((row) => {
      const meal = row.automated_meals as {
        scheduled_date: string;
        scheduled_time: string;
        pets?: { name?: string } | null;
      };
      const mealTime = new Date(`${meal.scheduled_date}T${meal.scheduled_time}`);
      const petName = meal.pets?.name ?? 'tu mascota';

      return {
        id: `feeding-${row.id}`,
        dbId: row.id,
        mealId: row.meal_id as string,
        title: 'Recordatorio de comida',
        message: row.message || `Es hora de alimentar a ${petName}`,
        time: mealTime,
      };
    });
}

export async function markFeedingNotificationsRead(
  userId: string,
  notificationIds?: string[],
): Promise<void> {
  let query = supabase
    .from('feeding_schedule_notifications')
    .update({ status: 'read' })
    .eq('owner_id', userId)
    .eq('status', 'pending');

  if (notificationIds?.length) {
    const dbIds = notificationIds
      .map((id) => id.replace(/^feeding-/, ''))
      .filter(Boolean);
    if (dbIds.length === 0) return;
    query = query.in('id', dbIds);
  }

  const { error } = await query;
  if (error) console.error('Error marking feeding notifications read:', error);
}

async function ensureNotificationRecord(mealId: string, userId: string): Promise<void> {
  const { data: existing } = await supabase
    .from('feeding_schedule_notifications')
    .select('id')
    .eq('meal_id', mealId)
    .eq('notification_type', 'upcoming_feeding')
    .limit(1);

  if (existing && existing.length > 0) return;

  const { data: meal, error: fetchError } = await supabase
    .from('automated_meals')
    .select(`
      *,
      pets (name),
      pet_feeding_schedules (schedule_name, notification_minutes_before, send_notifications)
    `)
    .eq('id', mealId)
    .single();

  if (fetchError || !meal) return;

  const schedule = meal.pet_feeding_schedules as {
    schedule_name?: string;
    notification_minutes_before?: number;
    send_notifications?: boolean;
  } | null;

  if (!schedule?.send_notifications) return;

  const notificationTime = new Date(`${meal.scheduled_date}T${meal.scheduled_time}`);
  notificationTime.setMinutes(
    notificationTime.getMinutes() - (schedule.notification_minutes_before || 15),
  );

  await supabase.from('feeding_schedule_notifications').insert({
    owner_id: userId,
    pet_id: meal.pet_id,
    schedule_id: meal.schedule_id,
    meal_id: mealId,
    notification_type: 'upcoming_feeding',
    scheduled_time: notificationTime.toISOString(),
    message: `Recordatorio: alimentar a ${meal.pets?.name ?? 'tu mascota'} — ${schedule.schedule_name ?? 'horario'}`,
    status: 'pending',
  });
}

export async function processFeedingReminders(userId: string): Promise<void> {
  const now = new Date();

  const { data: meals, error } = await supabase
    .from('automated_meals')
    .select(`
      id,
      scheduled_date,
      scheduled_time,
      pet_feeding_schedules (send_notifications)
    `)
    .eq('owner_id', userId)
    .eq('status', 'scheduled')
    .gte('scheduled_date', now.toISOString().split('T')[0])
    .order('scheduled_date')
    .order('scheduled_time');

  if (error || !meals?.length) return;

  for (const meal of meals) {
    const schedule = meal.pet_feeding_schedules as { send_notifications?: boolean } | null;
    if (!schedule?.send_notifications) continue;
    await ensureNotificationRecord(meal.id, userId);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('feeding-notifications-updated'));
  }
}

