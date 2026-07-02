import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FeedingScheduleService } from '@/services/FeedingScheduleService';
import {
  autoCompleteOverdueMealsForUser,
  ensureAutoCompleteEnabledForUser,
  generateMealsForSchedules,
  processFeedingReminders,
} from '@/utils/feedingScheduleAutomation';
import {
  getPushPermission,
  isPushSupported,
  subscribeToPushNotifications,
} from '@/lib/pushNotifications';

const LAST_MEAL_GENERATION_KEY = 'lastMealGeneration';

/**
 * Runs feeding automation app-wide while the user is logged in.
 * Push activation is in Ajustes → pestaña Notificaciones.
 */
export function useFeedingAutomation(): void {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    if (isPushSupported() && getPushPermission() === 'granted') {
      subscribeToPushNotifications(user.id).catch(console.error);
    }

    const runDailyGeneration = async () => {
      const today = new Date().toISOString().split('T')[0];
      const lastGeneration = localStorage.getItem(LAST_MEAL_GENERATION_KEY);
      if (lastGeneration === today) return;

      try {
        const schedules = await FeedingScheduleService.getFeedingSchedules(user.id);
        if (schedules.length === 0) return;

        await generateMealsForSchedules(user.id, schedules, 7);
        localStorage.setItem(LAST_MEAL_GENERATION_KEY, today);
      } catch (e) {
        console.error('Daily meal generation failed:', e);
      }
    };

    const runAutoComplete = async () => {
      try {
        await autoCompleteOverdueMealsForUser(user.id);
      } catch (e) {
        console.error('Auto-complete check failed:', e);
      }
    };

    const runReminders = async () => {
      try {
        await processFeedingReminders(user.id);
      } catch (e) {
        console.error('Feeding reminders failed:', e);
      }
    };

    ensureAutoCompleteEnabledForUser(user.id).then(() => {
      runDailyGeneration();
      runAutoComplete();
      runReminders();
    });

    const autoCompleteInterval = setInterval(runAutoComplete, 5 * 60 * 1000);
    const reminderInterval = setInterval(runReminders, 60 * 1000);
    const dailyInterval = setInterval(runDailyGeneration, 60 * 60 * 1000);

    return () => {
      clearInterval(autoCompleteInterval);
      clearInterval(reminderInterval);
      clearInterval(dailyInterval);
    };
  }, [user?.id]);
}
