import { supabase } from '@/lib/supabase';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type UserNotificationPreferences,
} from '@/types/notifications';

export async function getNotificationPreferences(
  userId: string,
): Promise<UserNotificationPreferences> {
  const { data, error } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  if (data) return data as UserNotificationPreferences;

  const { data: created, error: createError } = await supabase
    .from('user_notification_preferences')
    .insert({ user_id: userId, ...DEFAULT_NOTIFICATION_PREFERENCES })
    .select('*')
    .single();

  if (createError) throw createError;
  return created as UserNotificationPreferences;
}

export async function updateNotificationPreferences(
  userId: string,
  patch: Partial<Omit<UserNotificationPreferences, 'user_id' | 'created_at' | 'updated_at'>>,
): Promise<UserNotificationPreferences> {
  await getNotificationPreferences(userId);

  const { data, error } = await supabase
    .from('user_notification_preferences')
    .update(patch)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data as UserNotificationPreferences;
}

export async function dismissAccountPrompt(
  userId: string,
  promptId: string,
): Promise<void> {
  const prefs = await getNotificationPreferences(userId);
  if (prefs.dismissed_account_prompts.includes(promptId)) return;

  await updateNotificationPreferences(userId, {
    dismissed_account_prompts: [...prefs.dismissed_account_prompts, promptId],
  });
}

export async function hasActivePushSubscription(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) return false;
  return (count ?? 0) > 0;
}
