import { supabase } from '@/lib/supabase';
import { fetchNutritionNotificationsForBell } from '@/utils/nutritionNotifications';
import { fetchExerciseNotificationsForBell } from '@/utils/exerciseNotifications';
import { fetchVeterinaryNotificationsForBell } from '@/utils/veterinaryNotifications';
import { fetchSettingsNotificationsForBell } from '@/utils/settingsNotifications';
import { fetchAdoptionNotificationsForBell } from '@/utils/adoptionNotifications';
import { fetchBreedingNotificationsForBell } from '@/utils/breedingNotifications';
import { fetchLostPetNotificationsForBell } from '@/utils/lostPetNotifications';
import { fetchMarketplaceNotificationsForBell } from '@/utils/marketplaceNotifications';
import type { AppNotification, UserNotificationPreferences } from '@/types/notifications';

export async function loadBellNotifications(
  userId: string,
  prefs: UserNotificationPreferences,
): Promise<AppNotification[]> {
  const items: AppNotification[] = [];

  const queries: Promise<void>[] = [];

  if (prefs.notify_account) {
    queries.push(
      fetchSettingsNotificationsForBell(userId, prefs).then((settingsItems) => {
        items.push(...settingsItems);
      }),
    );
  }

  if (prefs.notify_feeding) {
    queries.push(
      fetchNutritionNotificationsForBell(userId).then((nutritionItems) => {
        items.push(...nutritionItems);
      }),
    );
  }

  if (prefs.notify_exercise) {
    queries.push(
      fetchExerciseNotificationsForBell(userId, prefs).then((exerciseItems) => {
        items.push(...exerciseItems);
      }),
    );
  }

  if (prefs.notify_vet) {
    queries.push(
      fetchVeterinaryNotificationsForBell(userId, prefs).then((vetItems) => {
        items.push(...vetItems);
      }),
    );
  }

  if (prefs.notify_breeding) {
    queries.push(
      fetchBreedingNotificationsForBell(userId, prefs).then((breedingItems) => {
        items.push(...breedingItems);
      }),
    );
  }

  if (prefs.notify_adoption) {
    queries.push(
      fetchAdoptionNotificationsForBell(userId, prefs).then((adoptionItems) => {
        items.push(...adoptionItems);
      }),
    );
  }

  if (prefs.notify_lost_pets) {
    queries.push(
      fetchLostPetNotificationsForBell(userId, prefs).then((lostPetItems) => {
        items.push(...lostPetItems);
      }),
    );
  }

  if (prefs.notify_orders) {
    queries.push(
      fetchMarketplaceNotificationsForBell(userId, prefs).then((marketplaceItems) => {
        items.push(...marketplaceItems);
      }),
    );
  }

  await Promise.all(queries);
  items.sort((a, b) => b.time.getTime() - a.time.getTime());
  return items;
}
