import { supabase } from '@/lib/supabase';
import type { AiExecutionContext, AiModuleDefinition } from '../types';
import { resolvePets } from '../helpers/petResolver';

const EXERCISE_TYPES = [
  'walk',
  'run',
  'play',
  'swimming',
  'agility',
  'training',
  'fetch',
  'hiking',
  'tug',
  'hide',
  'obstacle',
  'other',
] as const;

type ExerciseType = (typeof EXERCISE_TYPES)[number];

const EXERCISE_LABELS: Record<ExerciseType, string> = {
  walk: 'Caminata',
  run: 'Carrera',
  play: 'Juego',
  swimming: 'Natación',
  agility: 'Agilidad',
  training: 'Entrenamiento',
  fetch: 'Buscar pelota',
  hiking: 'Senderismo',
  tug: 'Tirar de la cuerda',
  hide: 'Buscar y encontrar',
  obstacle: 'Carrera de obstáculos',
  other: 'Otro',
};

const CALORIE_RATES: Record<ExerciseType, number> = {
  walk: 2,
  run: 8,
  play: 4,
  swimming: 6,
  agility: 7,
  training: 5,
  fetch: 3,
  hiking: 5,
  tug: 4,
  hide: 3,
  obstacle: 6,
  other: 3,
};

function normalizeExerciseType(raw?: string): ExerciseType {
  const v = (raw ?? '').toLowerCase().trim();
  const map: Record<string, ExerciseType> = {
    walk: 'walk',
    walking: 'walk',
    caminata: 'walk',
    paseo: 'walk',
    run: 'run',
    running: 'run',
    carrera: 'run',
    correr: 'run',
    play: 'play',
    playing: 'play',
    juego: 'play',
    swimming: 'swimming',
    natacion: 'swimming',
    natación: 'swimming',
    agility: 'agility',
    agilidad: 'agility',
    training: 'training',
    entrenamiento: 'training',
    fetch: 'fetch',
    hiking: 'hiking',
    senderismo: 'hiking',
    tug: 'tug',
    hide: 'hide',
    obstacle: 'obstacle',
    other: 'other',
    otro: 'other',
  };
  return map[v] ?? (EXERCISE_TYPES.includes(v as ExerciseType) ? (v as ExerciseType) : 'other');
}

function normalizeIntensity(raw?: string): 'low' | 'medium' | 'high' {
  const v = (raw ?? 'medium').toLowerCase();
  if (v === 'low' || v === 'baja' || v === 'bajo') return 'low';
  if (v === 'high' || v === 'alta' || v === 'alto') return 'high';
  return 'medium';
}

function estimateCalories(
  exerciseType: ExerciseType,
  durationMinutes: number,
  intensity: 'low' | 'medium' | 'high',
  weightKg?: number | null,
): number {
  const base = CALORIE_RATES[exerciseType] ?? 3;
  const mult = intensity === 'low' ? 0.7 : intensity === 'high' ? 1.3 : 1;
  const weightFactor = weightKg ? Math.sqrt(Number(weightKg) / 20) : 1;
  return Math.round(base * durationMinutes * mult * weightFactor);
}

export const exerciseModule: AiModuleDefinition = {
  id: 'exercise',
  name: 'Ejercicio',
  description: 'Registrar y consultar sesiones de ejercicio de las mascotas del usuario',
  basePath: '/trazabilidad',
  tools: [
    {
      name: 'exercise_register_session',
      description:
        'Registra sesiones de ejercicio en la base de datos. Usar SIEMPRE que el usuario pida guardar/registrar una actividad física. Requiere tipo y duración en minutos. Mascota opcional si solo hay una. Para varias mascotas usa pet_name="todos" o nombres separados por coma (ej. "Atis, Max").',
      keywords: [
        'registrar ejercicio',
        'registra ejercicio',
        'guardar ejercicio',
        'anotar ejercicio',
        'sesión de ejercicio',
        'actividad física',
        'paseo',
        'caminata',
        'registrar actividad',
        'registra actividad',
      ],
      parameters: {
        type: 'object',
        properties: {
          pet_name: {
            type: 'string',
            description: 'Nombre de la mascota, varias separadas por coma, o "todos" para todas',
          },
          exercise_type: {
            type: 'string',
            description:
              'Tipo: walk, run, play, swimming, agility, training, fetch, hiking, tug, hide, obstacle, other',
          },
          duration_minutes: { type: 'number', description: 'Duración en minutos (entero > 0)' },
          intensity: { type: 'string', description: 'low, medium o high (default medium)' },
          date: { type: 'string', description: 'Fecha YYYY-MM-DD (default hoy)' },
          notes: { type: 'string', description: 'Notas opcionales' },
        },
        required: ['exercise_type', 'duration_minutes'],
        additionalProperties: false,
      },
      execute: async (
        params: {
          pet_name?: string;
          exercise_type: string;
          duration_minutes: number;
          intensity?: string;
          date?: string;
          notes?: string;
        },
        ctx: AiExecutionContext,
      ) => {
        const duration = Math.round(Number(params.duration_minutes));
        if (!Number.isFinite(duration) || duration <= 0) {
          return { error: 'INVALID_DURATION', message: 'La duración debe ser un número de minutos mayor a 0.' };
        }

        const petResult = await resolvePets(ctx, params.pet_name);
        if ('error' in petResult) {
          if (petResult.error === 'NO_PETS') {
            return {
              error: 'NO_PETS',
              message: 'Primero debes registrar una mascota en PetHub.',
              actionPath: '/pet-creation',
            };
          }
          if (petResult.error === 'PET_REQUIRED') {
            return {
              error: 'PET_REQUIRED',
              message: `¿Para cuál mascota es el ejercicio? Tienes: ${petResult.pets?.join(', ')}. Di "todos" o "mis tres mascotas" para registrar a todas.`,
              pets: petResult.pets,
            };
          }
          return {
            error: 'PET_NOT_FOUND',
            message: petResult.message ?? `No encontré esa mascota. Las tuyas son: ${petResult.pets?.join(', ')}`,
            pets: petResult.pets,
          };
        }

        const exerciseType = normalizeExerciseType(params.exercise_type);
        const intensity = normalizeIntensity(params.intensity);
        const date =
          params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
            ? params.date
            : new Date().toISOString().split('T')[0];

        const sessions: Array<Record<string, unknown>> = [];
        const errors: string[] = [];

        for (const pet of petResult.pets) {
          const calories = estimateCalories(exerciseType, duration, intensity, pet.weight);

          const { data, error } = await supabase
            .from('exercise_sessions')
            .insert({
              pet_id: pet.id,
              owner_id: ctx.userId,
              exercise_type: exerciseType,
              duration_minutes: duration,
              intensity,
              date,
              notes: params.notes?.trim() || null,
              calories_burned: calories,
            })
            .select('id, date, duration_minutes, calories_burned')
            .single();

          if (error) {
            errors.push(`${pet.name}: ${error.message}`);
            continue;
          }

          sessions.push({
            id: data.id,
            pet_name: pet.name,
            exercise_type: exerciseType,
            exercise_label: EXERCISE_LABELS[exerciseType],
            duration_minutes: duration,
            intensity,
            date,
            calories_burned: calories,
            notes: params.notes ?? null,
          });
        }

        if (sessions.length === 0) {
          return {
            error: 'REGISTER_FAILED',
            message: errors.join(' ') || 'No se pudo registrar la sesión de ejercicio.',
          };
        }

        return {
          success: true,
          session: sessions.length === 1 ? sessions[0] : undefined,
          sessions,
          partial_errors: errors.length > 0 ? errors : undefined,
        };
      },
    },
    {
      name: 'exercise_list_recent',
      description: 'Lista las sesiones de ejercicio recientes del usuario.',
      keywords: [
        'historial ejercicio',
        'mis ejercicios',
        'sesiones de ejercicio',
        'actividades registradas',
        'qué ejercicio',
      ],
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Máximo de sesiones (default 5)' },
          pet_name: { type: 'string', description: 'Filtrar por nombre de mascota' },
        },
        additionalProperties: false,
      },
      execute: async (params: { limit?: number; pet_name?: string }, ctx: AiExecutionContext) => {
        if (!ctx.userId) {
          return { error: 'Usuario no autenticado', sessions: [] };
        }

        const limit = params.limit ?? 5;
        const { data, error } = await supabase
          .from('exercise_sessions')
          .select('id, exercise_type, duration_minutes, intensity, date, calories_burned, notes, pets(name)')
          .eq('owner_id', ctx.userId)
          .order('date', { ascending: false })
          .limit(Math.min(limit, 20));

        if (error) throw error;

        let sessions = (data ?? []).map((row) => ({
          id: row.id,
          pet_name: (row.pets as { name?: string } | null)?.name ?? 'Mascota',
          exercise_type: row.exercise_type,
          exercise_label: EXERCISE_LABELS[normalizeExerciseType(row.exercise_type)],
          duration_minutes: row.duration_minutes,
          intensity: row.intensity,
          date: row.date,
          calories_burned: row.calories_burned,
          notes: row.notes,
        }));

        if (params.pet_name?.trim()) {
          const needle = params.pet_name.trim().toLowerCase();
          sessions = sessions.filter((s) => s.pet_name.toLowerCase().includes(needle));
        }

        return { total: sessions.length, sessions };
      },
    },
  ],
};
