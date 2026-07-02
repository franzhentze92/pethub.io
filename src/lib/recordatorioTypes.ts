export type ReminderType =
  | 'vaccination'
  | 'follow_up'
  | 'service_appointment'
  | 'feeding'
  | 'medication'
  | 'exercise'
  | 'grooming'
  | 'play'
  | 'vet'
  | 'custom';

export type ReminderStatus = 'pending' | 'upcoming' | 'overdue' | 'completed';
export type ReminderPriority = 'low' | 'medium' | 'high' | 'urgent';

export type ReminderSourceTable =
  | 'pet_vaccinations'
  | 'veterinary_sessions'
  | 'service_appointments'
  | 'automated_meals'
  | 'pet_feeding_schedules'
  | 'pet_reminders';

export interface Reminder {
  id: string;
  type: ReminderType;
  title: string;
  description: string;
  date: string;
  time?: string;
  pet_id: string;
  pet_name: string;
  status: ReminderStatus;
  source_id: string;
  source_table: ReminderSourceTable;
  priority: ReminderPriority;
  action_path?: string;
  is_active?: boolean;
}

export interface PetSummary {
  id: string;
  name: string;
  species: string;
  breed: string;
  image_url?: string;
}

export function computeReminderStatusAndPriority(
  dateStr: string,
  completed: boolean,
  opts?: { dueSoonDays?: number; upcomingDays?: number },
): { status: ReminderStatus; priority: ReminderPriority } {
  const dueSoonDays = opts?.dueSoonDays ?? 7;
  const upcomingDays = opts?.upcomingDays ?? 7;
  const target = new Date(`${dateStr}T12:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (completed) {
    return { status: 'completed', priority: 'low' };
  }

  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'overdue', priority: 'urgent' };
  }
  if (diffDays <= dueSoonDays) {
    return { status: 'pending', priority: 'high' };
  }
  if (diffDays > upcomingDays) {
    return { status: 'upcoming', priority: 'low' };
  }
  return { status: 'pending', priority: 'medium' };
}
