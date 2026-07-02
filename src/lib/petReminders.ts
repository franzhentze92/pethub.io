import { supabase } from '@/lib/supabase';

export type PetReminderType =
  | 'feeding'
  | 'exercise'
  | 'vet'
  | 'play'
  | 'medication'
  | 'grooming'
  | 'custom';

export type PetReminderFrequency = 'once' | 'daily' | 'weekly' | 'monthly';
export type PetReminderPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface PetReminderRow {
  id: string;
  pet_id: string;
  owner_id: string | null;
  reminder_type: string;
  title: string;
  description: string | null;
  due_date: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  frequency: PetReminderFrequency;
  is_active: boolean;
  is_completed: boolean;
  priority: PetReminderPriority;
  completed_at: string | null;
  created_at: string;
  pets?: { id: string; name: string; species?: string; breed?: string; image_url?: string } | null;
}

export interface CreatePetReminderInput {
  pet_id: string;
  owner_id: string;
  reminder_type: PetReminderType;
  title: string;
  description?: string;
  scheduled_date: string;
  scheduled_time?: string;
  frequency?: PetReminderFrequency;
  priority?: PetReminderPriority;
}

export async function fetchPetReminders(ownerId: string): Promise<PetReminderRow[]> {
  const { data, error } = await supabase
    .from('pet_reminders')
    .select(`
      *,
      pets (id, name, species, breed, image_url)
    `)
    .eq('owner_id', ownerId)
    .order('scheduled_date', { ascending: true });

  if (error) throw error;
  return (data ?? []) as PetReminderRow[];
}

export async function createPetReminder(input: CreatePetReminderInput): Promise<PetReminderRow> {
  const { data, error } = await supabase
    .from('pet_reminders')
    .insert({
      pet_id: input.pet_id,
      owner_id: input.owner_id,
      reminder_type: input.reminder_type,
      title: input.title,
      description: input.description ?? null,
      scheduled_date: input.scheduled_date,
      due_date: input.scheduled_date,
      scheduled_time: input.scheduled_time ?? null,
      frequency: input.frequency ?? 'once',
      priority: input.priority ?? 'medium',
      is_active: true,
      is_completed: false,
    })
    .select(`
      *,
      pets (id, name, species, breed, image_url)
    `)
    .single();

  if (error) throw error;
  return data as PetReminderRow;
}

export async function completePetReminder(id: string): Promise<void> {
  const { error } = await supabase
    .from('pet_reminders')
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

export async function togglePetReminderActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('pet_reminders')
    .update({ is_active: isActive })
    .eq('id', id);

  if (error) throw error;
}

export async function deletePetReminder(id: string): Promise<void> {
  const { error } = await supabase.from('pet_reminders').delete().eq('id', id);
  if (error) throw error;
}

export async function updatePetReminder(
  id: string,
  updates: Partial<
    Pick<
      CreatePetReminderInput,
      'title' | 'description' | 'scheduled_date' | 'scheduled_time' | 'frequency' | 'priority' | 'reminder_type'
    >
  >,
): Promise<PetReminderRow> {
  const payload: Record<string, unknown> = { ...updates };
  if (updates.scheduled_date) {
    payload.due_date = updates.scheduled_date;
  }

  const { data, error } = await supabase
    .from('pet_reminders')
    .update(payload)
    .eq('id', id)
    .select(`
      *,
      pets (id, name, species, breed, image_url)
    `)
    .single();

  if (error) throw error;
  return data as PetReminderRow;
}

export const PET_REMINDER_TYPE_LABELS: Record<PetReminderType, string> = {
  feeding: 'Alimentación',
  exercise: 'Ejercicio',
  vet: 'Veterinario',
  play: 'Juego',
  medication: 'Medicamento',
  grooming: 'Aseo',
  custom: 'Personalizado',
};
