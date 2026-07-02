import { format, subDays } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { getAppointmentTypeLabel } from '@/lib/veterinaryTypes';
import {
  computeVaccinationStatus,
  getVaccinationStatusLabel,
} from '@/lib/vaccinationCatalog';
import {
  buildPetMonthlyComparison,
  compliancePercent,
  complianceStatus,
  formatNutritionMonthLabel,
  type FeedingScheduleConfig,
  type NutritionSessionRow,
  type PetProfile,
} from '@/utils/nutritionComparison';
import { fetchMergedNutritionFoodCatalog } from '@/utils/nutritionFoodCatalog';
import { buildPetHealthTrends, type PetHealthTrends } from './petHealthTrends';
import { fetchPetTimeline, type PetTimelineEvent } from './petTimeline';
import { generatePetInsights, type PetInsight } from './petInsights';

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

export interface PetGraphPet {
  id: string;
  name: string;
  species: string;
  weight: number | null;
  age?: number | null;
}

export interface VetDocumentInGraph {
  session_id: string;
  document_type: string;
  summary: string | null;
  parse_status: string;
  parsed_at: string | null;
  structured_data: unknown;
}

export interface PetHealthSlice {
  pet_name: string;
  species: string;
  weight_kg: number | null;
  period_days: number;
  nutrition: Record<string, unknown>;
  exercise: Record<string, unknown>;
  veterinary: Record<string, unknown>;
  vaccinations: Record<string, unknown>;
  upcoming_reminders: Array<Record<string, unknown>>;
}

export interface PetDataGraph {
  pet: PetGraphPet;
  period_days: number;
  health: PetHealthSlice;
  timeline: PetTimelineEvent[];
  documents: VetDocumentInGraph[];
  trends_30d: PetHealthTrends;
  insights: PetInsight[];
}

export interface BuildPetDataGraphOptions {
  daysBack?: number;
  timelineLimit?: number;
  includeTimeline?: boolean;
  includeInsights?: boolean;
}

async function fetchVetDocuments(
  petId: string,
  ownerId: string,
  limit = 5,
): Promise<VetDocumentInGraph[]> {
  const { data } = await supabase
    .from('vet_document_extractions')
    .select(
      'session_id, document_type, summary, parse_status, parsed_at, structured_data, veterinary_sessions!inner(pet_id)',
    )
    .eq('owner_id', ownerId)
    .eq('parse_status', 'completed')
    .order('parsed_at', { ascending: false })
    .limit(limit * 3);

  return (data ?? [])
    .filter((row) => {
      const session = row.veterinary_sessions as { pet_id: string } | null;
      return session?.pet_id === petId;
    })
    .slice(0, limit)
    .map((row) => ({
      session_id: row.session_id,
      document_type: row.document_type,
      summary: row.summary,
      parse_status: row.parse_status,
      parsed_at: row.parsed_at,
      structured_data: row.structured_data,
    }));
}

async function buildHealthSlice(
  pet: PetGraphPet,
  ownerId: string,
  daysBack: number,
): Promise<PetHealthSlice> {
  const monthValue = format(new Date(), 'yyyy-MM');
  const sinceDate = subDays(new Date(), daysBack).toISOString().split('T')[0];
  const monthStart = `${monthValue}-01`;

  const [
    schedulesRes,
    sessionsRes,
    exerciseRes,
    vetRes,
    vaccinationsRes,
    remindersRes,
    catalogRes,
  ] = await Promise.all([
    supabase
      .from('pet_feeding_schedules')
      .select('id, pet_id, is_active, feeding_times, days_of_week, start_date, end_date')
      .eq('owner_id', ownerId)
      .eq('pet_id', pet.id),
    supabase
      .from('nutrition_sessions')
      .select(
        'pet_id, date, food_name, quantity_grams, notes, total_calories, total_protein, total_fat, total_carbs, total_fiber, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, fiber_per_100g',
      )
      .eq('owner_id', ownerId)
      .eq('pet_id', pet.id)
      .gte('date', monthStart),
    supabase
      .from('exercise_sessions')
      .select('id, exercise_type, duration_minutes, intensity, date, calories_burned, notes')
      .eq('owner_id', ownerId)
      .eq('pet_id', pet.id)
      .gte('date', sinceDate)
      .order('date', { ascending: false }),
    supabase
      .from('veterinary_sessions')
      .select(
        'id, date, appointment_type, diagnosis, treatment, prescription, notes, follow_up_date, follow_up_completed_at, veterinarian_name, veterinary_clinic, cost',
      )
      .eq('owner_id', ownerId)
      .eq('pet_id', pet.id)
      .order('date', { ascending: false })
      .limit(6),
    supabase
      .from('pet_vaccinations')
      .select('vaccine_name, vaccine_slug, administered_at, next_due_date, veterinarian_name')
      .eq('owner_id', ownerId)
      .eq('pet_id', pet.id)
      .order('administered_at', { ascending: false }),
    supabase
      .from('pet_reminders')
      .select('title, reminder_type, scheduled_date, scheduled_time, priority, is_completed')
      .eq('owner_id', ownerId)
      .eq('pet_id', pet.id)
      .eq('is_completed', false)
      .eq('is_active', true)
      .gte('scheduled_date', format(new Date(), 'yyyy-MM-dd'))
      .order('scheduled_date', { ascending: true })
      .limit(5),
    fetchMergedNutritionFoodCatalog(),
  ]);

  const petProfile: PetProfile = {
    id: pet.id,
    name: pet.name,
    species: pet.species,
    weight: pet.weight,
    age: pet.age ?? null,
  };

  const nutritionComparison = buildPetMonthlyComparison({
    pet: petProfile,
    monthValue,
    schedules: (schedulesRes.data ?? []) as FeedingScheduleConfig[],
    sessions: (sessionsRes.data ?? []) as NutritionSessionRow[],
    foods: catalogRes.foods,
  });

  const caloriePct = compliancePercent(
    nutritionComparison.expected.calories,
    nutritionComparison.actual.calories,
  );
  const proteinPct = compliancePercent(
    nutritionComparison.expected.protein,
    nutritionComparison.actual.protein,
  );

  const exerciseSessions = (exerciseRes.data ?? []).map((row) => ({
    date: row.date,
    type: EXERCISE_LABELS[row.exercise_type ?? ''] ?? row.exercise_type ?? 'Actividad',
    duration_minutes: row.duration_minutes,
    intensity: row.intensity,
    calories_burned: row.calories_burned,
  }));

  const totalExerciseMinutes = exerciseSessions.reduce(
    (sum, s) => sum + (s.duration_minutes ?? 0),
    0,
  );

  const vetSessions = (vetRes.data ?? []).map((row) => ({
    id: row.id,
    date: row.date,
    appointment_label: getAppointmentTypeLabel(row.appointment_type),
    diagnosis: row.diagnosis,
    treatment: row.treatment,
    prescription: row.prescription,
    notes: row.notes,
    follow_up_date: row.follow_up_date,
    follow_up_pending: Boolean(row.follow_up_date && !row.follow_up_completed_at),
    veterinarian_name: row.veterinarian_name,
    veterinary_clinic: row.veterinary_clinic,
    cost: row.cost,
  }));

  const vaccinations = (vaccinationsRes.data ?? []).map((row) => {
    const status = row.next_due_date
      ? computeVaccinationStatus(row.next_due_date)
      : ('unknown' as const);
    return {
      vaccine_name: row.vaccine_name,
      last_date: row.administered_at,
      next_due_date: row.next_due_date,
      status,
      status_label: getVaccinationStatusLabel(status),
    };
  });

  const nutritionSourceLabel =
    nutritionComparison.expectedSource === 'schedule'
      ? 'horarios de alimentación'
      : nutritionComparison.expectedSource === 'energy_reference'
        ? 'requerimiento energético estimado (MER)'
        : 'sin objetivo definido';

  return {
    pet_name: pet.name,
    species: pet.species,
    weight_kg: pet.weight,
    period_days: daysBack,
    nutrition: {
      month_label: formatNutritionMonthLabel(monthValue),
      expected_source: nutritionComparison.expectedSource,
      expected_source_label: nutritionSourceLabel,
      has_active_schedules: nutritionComparison.hasActiveSchedules,
      meals_logged: nutritionComparison.sessionCount,
      calories: {
        expected: Math.round(nutritionComparison.expected.calories),
        actual: Math.round(nutritionComparison.actual.calories),
        compliance_pct: caloriePct,
        status: complianceStatus(caloriePct),
      },
      protein: {
        expected: Math.round(nutritionComparison.expected.protein),
        actual: Math.round(nutritionComparison.actual.protein),
        compliance_pct: proteinPct,
        status: complianceStatus(proteinPct),
      },
    },
    exercise: {
      sessions_count: exerciseSessions.length,
      total_minutes: totalExerciseMinutes,
      recommended_weekly_minutes: 150,
      weekly_compliance_pct:
        totalExerciseMinutes > 0 ? Math.round((totalExerciseMinutes / 150) * 100) : 0,
      recent_sessions: exerciseSessions.slice(0, 5),
      last_session_date: exerciseSessions[0]?.date ?? null,
    },
    veterinary: {
      recent_visits: vetSessions,
      last_visit: vetSessions[0] ?? null,
      pending_follow_ups: vetSessions.filter((v) => v.follow_up_pending),
    },
    vaccinations: {
      records: vaccinations.slice(0, 6),
      overdue: vaccinations.filter((v) => v.status === 'overdue'),
      due_soon: vaccinations.filter((v) => v.status === 'due_soon'),
    },
    upcoming_reminders: (remindersRes.data ?? []).map((row) => ({
      title: row.title,
      type: row.reminder_type,
      date: row.scheduled_date,
      time: row.scheduled_time ? String(row.scheduled_time).slice(0, 5) : null,
      priority: row.priority,
    })),
  };
}

/** Unified pet data graph — single source of truth for health, timeline, documents and insights. */
export async function buildPetDataGraph(
  pet: PetGraphPet,
  ownerId: string,
  options: BuildPetDataGraphOptions = {},
): Promise<PetDataGraph> {
  const daysBack = Math.min(Math.max(options.daysBack ?? 30, 1), 90);
  const timelineLimit = options.timelineLimit ?? 40;
  const includeTimeline = options.includeTimeline !== false;
  const includeInsights = options.includeInsights !== false;

  const [health, trends_30d, documents] = await Promise.all([
    buildHealthSlice(pet, ownerId, daysBack),
    buildPetHealthTrends(pet.id, ownerId, 30),
    fetchVetDocuments(pet.id, ownerId),
  ]);

  const petNames = new Map([[pet.id, pet.name]]);
  const timeline = includeTimeline
    ? await fetchPetTimeline([pet.id], petNames, ownerId, daysBack, timelineLimit)
    : [];

  const graph: PetDataGraph = {
    pet,
    period_days: daysBack,
    health,
    timeline,
    documents,
    trends_30d,
    insights: [],
  };

  if (includeInsights) {
    graph.insights = await generatePetInsights(graph, ownerId);
  }

  return graph;
}

/** Health summary shape used by pet_health_summary (backward compatible). */
export function graphToHealthSummary(graph: PetDataGraph) {
  return {
    ...graph.health,
    trends_30d: graph.trends_30d,
    documents: graph.documents,
    insights: graph.insights,
  };
}

export interface PetComparisonRow {
  pet_name: string;
  species: string;
  weight_kg: number | null;
  calorie_compliance_pct: number | null;
  calorie_status: string | null;
  exercise_minutes_7d: number;
  exercise_sessions_7d: number;
  meals_this_month: number;
  overdue_vaccines: number;
  due_soon_vaccines: number;
  last_vet_visit: string | null;
  pending_follow_ups: number;
  insight_count: number;
  top_insight: string | null;
}

export async function comparePets(
  pets: PetGraphPet[],
  ownerId: string,
): Promise<PetComparisonRow[]> {
  const graphs = await Promise.all(
    pets.map((pet) =>
      buildPetDataGraph(pet, ownerId, {
        daysBack: 7,
        timelineLimit: 0,
        includeTimeline: false,
        includeInsights: true,
      }),
    ),
  );

  return graphs.map((graph) => {
    const nutrition = graph.health.nutrition as Record<string, unknown>;
    const calories = nutrition.calories as Record<string, unknown> | undefined;
    const exercise = graph.health.exercise as Record<string, unknown>;
    const vaccinations = graph.health.vaccinations as Record<string, unknown>;
    const veterinary = graph.health.veterinary as Record<string, unknown>;
    const lastVisit = veterinary.last_visit as Record<string, unknown> | null;

    const topInsight = graph.insights.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2, info: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    })[0];

    return {
      pet_name: graph.pet.name,
      species: graph.pet.species,
      weight_kg: graph.pet.weight,
      calorie_compliance_pct: (calories?.compliance_pct as number) ?? null,
      calorie_status: (calories?.status as string) ?? null,
      exercise_minutes_7d: (exercise.total_minutes as number) ?? 0,
      exercise_sessions_7d: (exercise.sessions_count as number) ?? 0,
      meals_this_month: (nutrition.meals_logged as number) ?? 0,
      overdue_vaccines: ((vaccinations.overdue as unknown[]) ?? []).length,
      due_soon_vaccines: ((vaccinations.due_soon as unknown[]) ?? []).length,
      last_vet_visit: (lastVisit?.date as string) ?? null,
      pending_follow_ups: ((veterinary.pending_follow_ups as unknown[]) ?? []).length,
      insight_count: graph.insights.length,
      top_insight: topInsight?.message ?? null,
    };
  });
}
