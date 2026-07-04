export type NotificationType =
  | 'feeding'
  | 'exercise'
  | 'vet'
  | 'breeding'
  | 'adoption'
  | 'lost_pet'
  | 'dog_walk'
  | 'orders'
  | 'reminder'
  | 'account';

export type SettingsPromptId =
  | 'profile-incomplete'
  | 'no-pets'
  | 'no-address'
  | 'push-disabled'
  | 'card-expiring';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: Date;
  unread: boolean;
  href?: string;
  tab?: string;
  activeTab?: string;
  activeSubTab?: string;
  requestsView?: 'sent' | 'received';
  settingsPromptId?: SettingsPromptId;
  adoptionApplicationId?: string;
  breedingMatchId?: string;
  lostPetId?: string;
  dogWalkRequestId?: string;
  petId?: string;
  petReminderId?: string;
  vaccinationId?: string;
  veterinarySessionId?: string;
  orderId?: string;
  appointmentId?: string;
  mealId?: string;
  openComplete?: boolean;
  openChat?: boolean;
}

export interface UserNotificationPreferences {
  user_id: string;
  notify_feeding: boolean;
  notify_exercise: boolean;
  notify_breeding: boolean;
  notify_adoption: boolean;
  notify_lost_pets: boolean;
  notify_dog_walks: boolean;
  notify_orders: boolean;
  notify_vet: boolean;
  notify_account: boolean;
  push_feeding: boolean;
  push_exercise: boolean;
  push_orders: boolean;
  push_breeding: boolean;
  push_adoption: boolean;
  push_lost_pets: boolean;
  push_dog_walks: boolean;
  push_vet: boolean;
  dismissed_account_prompts: string[];
  read_adoption_notifications: string[];
  read_breeding_notifications: string[];
  read_lost_pet_notifications: string[];
  read_dog_walk_notifications: string[];
  read_order_notifications: string[];
  read_exercise_notifications: string[];
  read_vet_notifications: string[];
  created_at: string;
  updated_at: string;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<
  UserNotificationPreferences,
  'user_id' | 'created_at' | 'updated_at'
> = {
  notify_feeding: true,
  notify_exercise: true,
  notify_breeding: true,
  notify_adoption: true,
  notify_lost_pets: true,
  notify_dog_walks: true,
  notify_orders: true,
  notify_vet: true,
  notify_account: true,
  push_feeding: true,
  push_exercise: true,
  push_orders: true,
  push_breeding: true,
  push_adoption: true,
  push_lost_pets: true,
  push_dog_walks: true,
  push_vet: true,
  dismissed_account_prompts: [],
  read_adoption_notifications: [],
  read_breeding_notifications: [],
  read_lost_pet_notifications: [],
  read_dog_walk_notifications: [],
  read_order_notifications: [],
  read_exercise_notifications: [],
  read_vet_notifications: [],
};
