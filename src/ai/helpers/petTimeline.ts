import { format, subDays } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { getAppointmentTypeLabel } from '@/lib/veterinaryTypes';

export type PetTimelineEventType =
  | 'meal'
  | 'exercise'
  | 'vet_visit'
  | 'vaccination'
  | 'reminder'
  | 'reminder_completed'
  | 'document_parsed';

export interface PetTimelineEvent {
  date: string;
  datetime: string | null;
  type: PetTimelineEventType;
  domain: string;
  summary: string;
  pet_id: string;
  pet_name: string;
  metadata?: Record<string, unknown>;
}

const EXERCISE_LABELS: Record<string, string> = {
  walk: 'Caminata',
  run: 'Carrera',
  play: 'Juego',
  swimming: 'Natación',
  agility: 'Agilidad',
  training: 'Entrenamiento',
  fetch: 'Buscar pelota',
  hiking: 'Senderismo',
  other: 'Otro',
};

function normalizeDate(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(0, 10);
}

function petName(petNames: Map<string, string>, petId: string): string {
  return petNames.get(petId) ?? 'Mascota';
}

export async function fetchPetTimeline(
  petIds: string[],
  petNames: Map<string, string>,
  ownerId: string,
  daysBack: number,
  limit = 60,
): Promise<PetTimelineEvent[]> {
  if (petIds.length === 0) return [];

  const sinceDate = format(subDays(new Date(), daysBack), 'yyyy-MM-dd');
  const events: PetTimelineEvent[] = [];

  const [
    nutritionRes,
    exerciseRes,
    vetRes,
    vaccinationsRes,
    remindersRes,
    documentsRes,
  ] = await Promise.all([
    supabase
      .from('nutrition_sessions')
      .select('pet_id, date, food_name, quantity_grams, total_calories, created_at')
      .eq('owner_id', ownerId)
      .in('pet_id', petIds)
      .gte('date', sinceDate)
      .order('date', { ascending: false }),
    supabase
      .from('exercise_sessions')
      .select('pet_id, date, exercise_type, duration_minutes, intensity, calories_burned, created_at')
      .eq('owner_id', ownerId)
      .in('pet_id', petIds)
      .gte('date', sinceDate)
      .order('date', { ascending: false }),
    supabase
      .from('veterinary_sessions')
      .select(
        'pet_id, date, appointment_type, diagnosis, treatment, veterinarian_name, veterinary_clinic, cost, created_at',
      )
      .eq('owner_id', ownerId)
      .in('pet_id', petIds)
      .gte('date', sinceDate)
      .order('date', { ascending: false }),
    supabase
      .from('pet_vaccinations')
      .select('pet_id, vaccine_name, administered_at, next_due_date, veterinarian_name')
      .eq('owner_id', ownerId)
      .in('pet_id', petIds)
      .gte('administered_at', sinceDate)
      .order('administered_at', { ascending: false }),
    supabase
      .from('pet_reminders')
      .select(
        'pet_id, title, reminder_type, scheduled_date, scheduled_time, is_completed, completed_at, priority, created_at',
      )
      .eq('owner_id', ownerId)
      .in('pet_id', petIds)
      .gte('scheduled_date', sinceDate)
      .order('scheduled_date', { ascending: false }),
    supabase
      .from('vet_document_extractions')
      .select(
        'session_id, document_type, summary, parse_status, parsed_at, created_at, veterinary_sessions!inner(pet_id)',
      )
      .eq('owner_id', ownerId)
      .eq('parse_status', 'completed')
      .gte('created_at', `${sinceDate}T00:00:00`)
      .order('created_at', { ascending: false }),
  ]);

  for (const row of nutritionRes.data ?? []) {
    const name = petName(petNames, row.pet_id);
    const grams = row.quantity_grams ? ` · ${row.quantity_grams}g` : '';
    const kcal = row.total_calories ? ` · ${Math.round(row.total_calories)} kcal` : '';
    events.push({
      date: normalizeDate(row.date),
      datetime: row.created_at ?? null,
      type: 'meal',
      domain: 'nutrition',
      summary: `Comida: ${row.food_name ?? 'alimento'}${grams}${kcal}`,
      pet_id: row.pet_id,
      pet_name: name,
      metadata: { food_name: row.food_name, quantity_grams: row.quantity_grams },
    });
  }

  for (const row of exerciseRes.data ?? []) {
    const name = petName(petNames, row.pet_id);
    const label = EXERCISE_LABELS[row.exercise_type ?? ''] ?? row.exercise_type ?? 'Actividad';
    events.push({
      date: normalizeDate(row.date),
      datetime: row.created_at ?? null,
      type: 'exercise',
      domain: 'exercise',
      summary: `${label} · ${row.duration_minutes ?? 0} min · intensidad ${row.intensity ?? '—'}`,
      pet_id: row.pet_id,
      pet_name: name,
      metadata: {
        exercise_type: row.exercise_type,
        duration_minutes: row.duration_minutes,
        calories_burned: row.calories_burned,
      },
    });
  }

  for (const row of vetRes.data ?? []) {
    const name = petName(petNames, row.pet_id);
    const label = getAppointmentTypeLabel(row.appointment_type);
    const diag = row.diagnosis ? ` — ${row.diagnosis}` : '';
    events.push({
      date: normalizeDate(row.date),
      datetime: row.created_at ?? null,
      type: 'vet_visit',
      domain: 'veterinary',
      summary: `Visita: ${label}${diag}`,
      pet_id: row.pet_id,
      pet_name: name,
      metadata: {
        appointment_type: row.appointment_type,
        diagnosis: row.diagnosis,
        treatment: row.treatment,
        veterinarian_name: row.veterinarian_name,
        cost: row.cost,
      },
    });
  }

  for (const row of vaccinationsRes.data ?? []) {
    const name = petName(petNames, row.pet_id);
    events.push({
      date: normalizeDate(row.administered_at),
      datetime: row.administered_at ?? null,
      type: 'vaccination',
      domain: 'veterinary',
      summary: `Vacuna: ${row.vaccine_name}`,
      pet_id: row.pet_id,
      pet_name: name,
      metadata: {
        vaccine_name: row.vaccine_name,
        next_due_date: row.next_due_date,
        veterinarian_name: row.veterinarian_name,
      },
    });
  }

  for (const row of remindersRes.data ?? []) {
    const name = petName(petNames, row.pet_id);
    const time = row.scheduled_time ? ` ${String(row.scheduled_time).slice(0, 5)}` : '';
    if (row.is_completed && row.completed_at) {
      events.push({
        date: normalizeDate(row.completed_at),
        datetime: row.completed_at ?? null,
        type: 'reminder_completed',
        domain: 'reminders',
        summary: `Recordatorio completado: ${row.title}`,
        pet_id: row.pet_id,
        pet_name: name,
        metadata: { reminder_type: row.reminder_type, title: row.title },
      });
    } else {
      events.push({
        date: normalizeDate(row.scheduled_date),
        datetime: row.created_at ?? null,
        type: 'reminder',
        domain: 'reminders',
        summary: `Recordatorio: ${row.title}${time}`,
        pet_id: row.pet_id,
        pet_name: name,
        metadata: {
          reminder_type: row.reminder_type,
          priority: row.priority,
          scheduled_time: row.scheduled_time,
        },
      });
    }
  }

  for (const row of documentsRes.data ?? []) {
    const session = row.veterinary_sessions as { pet_id: string } | null;
    const petId = session?.pet_id;
    if (!petId || !petIds.includes(petId)) continue;
    const name = petName(petNames, petId);
    const docLabel = row.document_type === 'invoice' ? 'Factura veterinaria' : 'Resultados de laboratorio';
    events.push({
      date: normalizeDate(row.parsed_at ?? row.created_at),
      datetime: row.parsed_at ?? row.created_at ?? null,
      type: 'document_parsed',
      domain: 'veterinary',
      summary: `${docLabel} analizado`,
      pet_id: petId,
      pet_name: name,
      metadata: {
        document_type: row.document_type,
        summary: row.summary,
        session_id: row.session_id,
      },
    });
  }

  events.sort((a, b) => {
    const aKey = a.datetime ?? `${a.date}T00:00:00`;
    const bKey = b.datetime ?? `${b.date}T00:00:00`;
    return bKey.localeCompare(aKey);
  });

  return events.slice(0, limit);
}

export const TIMELINE_TYPE_LABELS: Record<PetTimelineEventType, string> = {
  meal: '🍽 Comida',
  exercise: '🏃 Ejercicio',
  vet_visit: '🏥 Visita veterinaria',
  vaccination: '💉 Vacuna',
  reminder: '🔔 Recordatorio',
  reminder_completed: '✅ Recordatorio completado',
  document_parsed: '📄 Documento',
};
