import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  dismissAccountPrompt,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/services/notificationPreferencesService';
import type { UserNotificationPreferences } from '@/types/notifications';

export function useNotificationPreferences(userId?: string) {
  return useQuery({
    queryKey: ['notificationPreferences', userId],
    queryFn: () => getNotificationPreferences(userId!),
    enabled: !!userId,
  });
}

export function useUpdateNotificationPreferences(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      patch: Partial<Omit<UserNotificationPreferences, 'user_id' | 'created_at' | 'updated_at'>>,
    ) => updateNotificationPreferences(userId!, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences', userId] });
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    },
  });
}

export function useDismissAccountPrompt(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (promptId: string) => dismissAccountPrompt(userId!, promptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences', userId] });
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    },
  });
}
