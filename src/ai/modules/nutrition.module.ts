import { supabase } from '@/lib/supabase';
import { FeedingScheduleService } from '@/services/FeedingScheduleService';
import { deduplicateScheduledMeals } from '@/utils/feedingScheduleAutomation';
import type { AiExecutionContext, AiModuleDefinition } from '../types';
import {
  extractDateFromText,
  inferMealTypeFromTime,
  normalizeTimesInput,
} from '../helpers/nutritionSchedule';
import {
  buildNutritionSessionInsertRow,
  defaultFeedingTime,
  foodDisplayLabel,
  matchFoodByName,
  mealTypeLabel,
  normalizeMealType,
  type PetFoodRecord,
} from '@/utils/nutritionSession';
import { resolvePets } from '../helpers/petResolver';
import {
  analyzePetDietProfile,
  lookupFoodNutritionProfile,
} from '../helpers/nutritionFoodProfile';

type FoodRow = PetFoodRecord & { id: string; species?: string };

async function loadAvailableFoods(): Promise<FoodRow[]> {
  const { data, error } = await supabase
    .from('pet_foods')
    .select('*')
    .eq('is_available', true)
    .order('brand')
    .order('name');

  if (error) throw error;
  return (data ?? []) as FoodRow[];
}

function normalizeSpecies(species: string): string {
  return species.trim().toLowerCase();
}

function foodsForSpecies(foods: FoodRow[], species: string): FoodRow[] {
  const needle = normalizeSpecies(species);
  const matches = foods.filter((f) => normalizeSpecies(f.species ?? '') === needle);
  return matches.length > 0 ? matches : foods;
}

async function resolveFood(
  species: string,
  foodName?: string,
): Promise<FoodRow | { error: string; foods?: string[] }> {
  const allFoods = await loadAvailableFoods();

  if (allFoods.length === 0) {
    return { error: 'NO_FOODS' };
  }

  const preferredFoods = foodsForSpecies(allFoods, species);

  if (!foodName?.trim()) {
    if (preferredFoods.length === 1) return preferredFoods[0];
    return {
      error: 'FOOD_REQUIRED',
      foods: preferredFoods.slice(0, 12).map(foodDisplayLabel),
    };
  }

  const match =
    matchFoodByName(preferredFoods, foodName) ?? matchFoodByName(allFoods, foodName);

  if (!match) {
    return {
      error: 'FOOD_NOT_FOUND',
      foods: preferredFoods.slice(0, 12).map(foodDisplayLabel),
    };
  }

  return match;
}

export const nutritionModule: AiModuleDefinition = {
  id: 'nutrition',
  name: 'Nutrición',
  description: 'Registrar comidas, crear horarios recurrentes y consultar alimentación de las mascotas',
  basePath: '/feeding-schedules',
  tools: [
    {
      name: 'nutrition_list_foods',
      description:
        'Lista alimentos del catálogo pet_foods para registrar comidas. Usar cuando el usuario pregunte qué opciones hay, qué alimentos hay, o pida ver el catálogo de comida. NO uses marketplace_search_products para esto.',
      keywords: [
        'opciones de alimento',
        'qué alimentos',
        'que alimentos',
        'opciones hay',
        'qué opciones hay',
        'que opciones hay',
        'catálogo de comida',
        'catalogo de comida',
        'alimentos disponibles',
        'lista de alimentos',
      ],
      parameters: {
        type: 'object',
        properties: {
          species: { type: 'string', description: 'dog o cat (opcional)' },
          limit: { type: 'number' },
        },
        additionalProperties: false,
      },
      execute: async (params: { species?: string; limit?: number }) => {
        const allFoods = await loadAvailableFoods();
        const limit = Math.min(params.limit ?? 12, 20);
        let foods = allFoods;

        if (params.species?.trim()) {
          foods = foodsForSpecies(allFoods, params.species);
        }

        return {
          total: foods.length,
          foods: foods.slice(0, limit).map((f) => ({
            label: foodDisplayLabel(f),
            species: f.species,
            food_type: f.food_type,
          })),
        };
      },
    },
    {
      name: 'nutrition_register_meal',
      description:
        'Registra una comida en nutrition_sessions. Usar cuando el usuario pida anotar/registrar alimentación. Requiere alimento y gramos; mascota si hay varias. Para todas las mascotas usa pet_name="todos".',
      keywords: [
        'registrar comida',
        'registra comida',
        'anotar alimentación',
        'registrar alimentación',
        'registrar alimento',
        'comida manual',
        'le di de comer',
        'alimenté',
      ],
      parameters: {
        type: 'object',
        properties: {
          pet_name: {
            type: 'string',
            description: 'Nombre de la mascota, varias separadas por coma, o "todos" para todas',
          },
          food_name: { type: 'string', description: 'Nombre del alimento del catálogo pet_foods' },
          quantity_grams: { type: 'number', description: 'Cantidad en gramos' },
          meal_type: { type: 'string', description: 'breakfast, lunch, dinner o snack' },
          feeding_time: { type: 'string', description: 'Hora HH:MM (opcional)' },
          date: { type: 'string', description: 'Fecha YYYY-MM-DD (opcional)' },
          notes: { type: 'string', description: 'Notas opcionales' },
        },
        required: ['quantity_grams'],
        additionalProperties: false,
      },
      execute: async (
        params: {
          pet_name?: string;
          food_name?: string;
          quantity_grams: number;
          meal_type?: string;
          date?: string;
          feeding_time?: string;
          notes?: string;
        },
        ctx: AiExecutionContext,
      ) => {
        const quantity = Number(params.quantity_grams);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          return { error: 'INVALID_QUANTITY', message: 'La cantidad debe ser mayor a 0 gramos.' };
        }

        const petResult = await resolvePets(ctx, params.pet_name);
        if ('error' in petResult) {
          if (petResult.error === 'NO_PETS') {
            return {
              error: 'NO_PETS',
              message: 'Primero registra una mascota en PetHub.',
              actionPath: '/pet-creation',
            };
          }
          if (petResult.error === 'PET_REQUIRED') {
            return {
              error: 'PET_REQUIRED',
              message: `¿Para cuál mascota? Tienes: ${petResult.pets?.join(', ')}. Di "todos" o "mis tres mascotas" para registrar a todas.`,
              pets: petResult.pets,
            };
          }
          return {
            error: 'PET_NOT_FOUND',
            message: petResult.message ?? `No encontré esa mascota. Las tuyas son: ${petResult.pets?.join(', ')}`,
            pets: petResult.pets,
          };
        }

        if (!params.food_name?.trim()) {
          const samplePet = petResult.pets[0];
          const foodResult = await resolveFood(samplePet.species);
          if ('error' in foodResult) {
            if (foodResult.error === 'NO_FOODS') {
              return { error: 'NO_FOODS', message: 'No hay alimentos en el catálogo. Usa la pestaña Manual en Nutrición.' };
            }
            return {
              error: 'FOOD_REQUIRED',
              message: `¿Qué alimento? Opciones: ${foodResult.foods?.join(', ')}`,
              foods: foodResult.foods,
            };
          }
        }

        const mealType = normalizeMealType(params.meal_type);
        const date =
          params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
            ? params.date
            : new Date().toISOString().split('T')[0];
        const feedingTime =
          params.feeding_time && /^\d{2}:\d{2}/.test(params.feeding_time)
            ? params.feeding_time.slice(0, 5)
            : defaultFeedingTime();

        const sessions: Array<Record<string, unknown>> = [];
        const errors: string[] = [];

        for (const pet of petResult.pets) {
          const foodResult = await resolveFood(pet.species, params.food_name);
          if ('error' in foodResult) {
            if (foodResult.error === 'FOOD_NOT_FOUND') {
              errors.push(
                `${pet.name}: no encontré "${params.food_name}". Opciones: ${foodResult.foods?.slice(0, 6).join(', ')}`,
              );
            } else if (foodResult.error === 'FOOD_REQUIRED') {
              errors.push(`${pet.name}: falta el alimento.`);
            } else {
              errors.push(`${pet.name}: no hay alimentos en el catálogo.`);
            }
            continue;
          }

          const payload = buildNutritionSessionInsertRow({
            petId: pet.id,
            ownerId: ctx.userId!,
            food: foodResult,
            quantityGrams: quantity,
            date,
            feedingTime,
            mealType,
            notes: params.notes,
          });

          const { data, error } = await supabase
            .from('nutrition_sessions')
            .insert(payload)
            .select('id, date, total_calories, food_name, quantity_grams')
            .single();

          if (error) {
            errors.push(`${pet.name}: ${error.message}`);
            continue;
          }

          sessions.push({
            id: data.id,
            pet_name: pet.name,
            food_name: data.food_name,
            quantity_grams: quantity,
            meal_type: mealType,
            meal_label: mealTypeLabel(mealType),
            date,
            feeding_time: feedingTime,
            total_calories: data.total_calories,
          });
        }

        if (sessions.length === 0) {
          return {
            error: 'REGISTER_FAILED',
            message: errors.join(' '),
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
      name: 'nutrition_create_schedule',
      description:
        'Crea un horario recurrente en pet_feeding_schedules con comidas automáticas. Usar cuando el usuario pida programar horarios, comidas recurrentes o automáticas (ej. todos los días a las 7am y 7pm). Requiere horas (times) y mascota si hay varias; alimento y gramos si no hay uno por defecto.',
      keywords: [
        'horario recurrente',
        'horario automático',
        'horario automatico',
        'programar comidas',
        'comidas automáticas',
        'comidas automaticas',
        'crear horario',
        'configurar horario',
        'cada día',
        'todos los días',
      ],
      parameters: {
        type: 'object',
        properties: {
          pet_name: {
            type: 'string',
            description: 'Nombre de la mascota o "todos" para crear un horario por cada mascota',
          },
          schedule_name: { type: 'string', description: 'Nombre del horario (opcional)' },
          times: {
            type: 'array',
            items: { type: 'string' },
            description: 'Horas en formato HH:MM o con am/pm, ej. ["07:00","19:00"]',
          },
          food_name: { type: 'string', description: 'Alimento del catálogo pet_foods' },
          quantity_grams: { type: 'number', description: 'Gramos por comida (default 100)' },
          days_of_week: {
            type: 'array',
            items: { type: 'number' },
            description: 'Días 1=lunes … 7=domingo. Default todos los días.',
          },
          auto_generate_meals: {
            type: 'boolean',
            description: 'Generar comidas automáticas en el calendario (default true)',
          },
          send_notifications: { type: 'boolean', description: 'Enviar recordatorios (default true)' },
          notes: { type: 'string', description: 'Notas opcionales' },
        },
        required: ['times'],
        additionalProperties: false,
      },
      execute: async (
        params: {
          pet_name?: string;
          schedule_name?: string;
          times: string[];
          food_name?: string;
          quantity_grams?: number;
          days_of_week?: number[];
          auto_generate_meals?: boolean;
          send_notifications?: boolean;
          notes?: string;
        },
        ctx: AiExecutionContext,
      ) => {
        const times = normalizeTimesInput(params.times);
        if (times.length === 0) {
          return {
            error: 'TIMES_REQUIRED',
            message: 'Necesito al menos una hora, por ejemplo 7:00 am y 7:00 pm.',
          };
        }

        const quantity = Number(params.quantity_grams ?? 100);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          return { error: 'INVALID_QUANTITY', message: 'La cantidad debe ser mayor a 0 gramos.' };
        }

        const petResult = await resolvePets(ctx, params.pet_name);
        if ('error' in petResult) {
          if (petResult.error === 'NO_PETS') {
            return {
              error: 'NO_PETS',
              message: 'Primero registra una mascota en PetHub.',
              actionPath: '/pet-creation',
            };
          }
          if (petResult.error === 'PET_REQUIRED') {
            return {
              error: 'PET_REQUIRED',
              message: `¿Para cuál mascota? Tienes: ${petResult.pets?.join(', ')}. Di "todos" para crear un horario para cada una.`,
              pets: petResult.pets,
            };
          }
          return {
            error: 'PET_NOT_FOUND',
            message: petResult.message ?? `No encontré esa mascota. Las tuyas son: ${petResult.pets?.join(', ')}`,
            pets: petResult.pets,
          };
        }

        const daysOfWeek =
          params.days_of_week?.length && params.days_of_week.every((d) => d >= 1 && d <= 7)
            ? [...new Set(params.days_of_week)].sort()
            : [1, 2, 3, 4, 5, 6, 7];

        const startDate = new Date().toISOString().split('T')[0];
        const autoGenerate = params.auto_generate_meals !== false;
        const sendNotifications = params.send_notifications !== false;
        const created: Array<Record<string, unknown>> = [];
        const errors: string[] = [];

        for (const pet of petResult.pets) {
          const foodResult = await resolveFood(pet.species, params.food_name);
          if ('error' in foodResult) {
            if (foodResult.error === 'FOOD_REQUIRED') {
              errors.push(
                `${pet.name}: ¿qué alimento? Opciones: ${foodResult.foods?.slice(0, 6).join(', ')}`,
              );
            } else if (foodResult.error === 'FOOD_NOT_FOUND') {
              errors.push(
                `${pet.name}: no encontré "${params.food_name}". Opciones: ${foodResult.foods?.slice(0, 6).join(', ')}`,
              );
            } else {
              errors.push(`${pet.name}: no hay alimentos en el catálogo.`);
            }
            continue;
          }

          const feedingTimes = times.map((time) => ({
            time,
            meal_type: inferMealTypeFromTime(time),
            food_id: foodResult.id,
            quantity_grams: quantity,
          }));

          const scheduleName =
            params.schedule_name?.trim() ||
            (petResult.pets.length > 1 ? `Comidas ${pet.name}` : 'Horario de comidas');

          try {
            const schedule = await FeedingScheduleService.createFeedingSchedule({
              owner_id: ctx.userId!,
              pet_id: pet.id,
              schedule_name: scheduleName,
              is_active: true,
              feeding_times: feedingTimes,
              days_of_week: daysOfWeek,
              start_date: startDate,
              auto_generate_meals: autoGenerate,
              send_notifications: sendNotifications,
              notification_minutes_before: 15,
              auto_complete_enabled: false,
              auto_complete_minutes_after: 30,
              notes: params.notes,
            });

            let mealsGenerated = 0;
            if (autoGenerate) {
              const end = new Date();
              end.setDate(end.getDate() + 6);
              mealsGenerated = await FeedingScheduleService.generateMealsForDateRange(
                startDate,
                end.toISOString().split('T')[0],
              );
            }

            created.push({
              id: schedule.id,
              pet_name: pet.name,
              schedule_name: scheduleName,
              times: times.join(', '),
              food_name: foodDisplayLabel(foodResult),
              quantity_grams: quantity,
              days_of_week: daysOfWeek,
              auto_generate_meals: autoGenerate,
              meals_generated: mealsGenerated,
            });
          } catch (err) {
            errors.push(
              `${pet.name}: ${err instanceof Error ? err.message : 'no se pudo crear el horario'}`,
            );
          }
        }

        if (created.length === 0) {
          return {
            error: 'SCHEDULE_FAILED',
            message: errors.join(' '),
          };
        }

        return {
          success: true,
          schedule: created.length === 1 ? created[0] : undefined,
          schedules: created,
          partial_errors: errors.length > 0 ? errors : undefined,
        };
      },
    },
    {
      name: 'nutrition_list_scheduled',
      description:
        'Lista comidas PROGRAMADAS futuras (automated_meals con status scheduled), NO el historial ya registrado. Usar cuando pregunten por comidas programadas, próximos días, calendario de alimentación, qué viene, horario de comidas futuras. NO uses nutrition_list_recent para esto.',
      keywords: [
        'comidas programadas',
        'comida programada',
        'próximos días',
        'proximos dias',
        'próxima semana',
        'proxima semana',
        'calendario de comidas',
        'comidas futuras',
        'comidas que vienen',
        'horario de comidas',
        'qué viene',
        'que viene',
        'programadas de',
      ],
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Días hacia adelante desde hoy (default 7)',
          },
          pet_name: { type: 'string', description: 'Filtrar por mascota' },
          include_schedules: {
            type: 'boolean',
            description: 'Incluir resumen de horarios recurrentes activos (default true)',
          },
        },
        additionalProperties: false,
      },
      execute: async (
        params: { days?: number; pet_name?: string; include_schedules?: boolean },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) return { error: 'Usuario no autenticado', meals: [] };

        const days = Math.min(30, Math.max(1, Math.round(params.days ?? 7)));
        let petId: string | undefined;

        if (params.pet_name?.trim()) {
          const petResult = await resolvePets(ctx, params.pet_name);
          if ('error' in petResult) {
            return {
              error: petResult.error,
              message:
                petResult.error === 'PET_NOT_FOUND'
                  ? petResult.message
                  : `¿De cuál mascota? Tienes: ${petResult.pets?.join(', ')}`,
              pets: petResult.pets,
            };
          }
          if (petResult.pets.length === 1) petId = petResult.pets[0].id;
        }

        const rawMeals = await FeedingScheduleService.getScheduledMealsInRange(
          ctx.userId,
          days,
          petId,
        );

        let meals = rawMeals.map((row) => {
          const food = row.pet_foods as { name?: string; brand?: string } | null;
          const foodLabel = food?.brand ? `${food.brand} - ${food.name}` : food?.name ?? 'Alimento';
          return {
            id: row.id,
            pet_name: (row.pets as { name?: string } | null)?.name ?? 'Mascota',
            scheduled_date: row.scheduled_date,
            scheduled_time: String(row.scheduled_time).slice(0, 5),
            meal_label: mealTypeLabel(row.meal_type),
            food_name: foodLabel,
            quantity_grams: row.quantity_grams,
            schedule_name:
              (row.pet_feeding_schedules as { schedule_name?: string } | null)?.schedule_name ??
              'Horario',
            status: row.status,
          };
        });

        if (params.pet_name?.trim() && !petId) {
          const needle = params.pet_name.trim().toLowerCase();
          meals = meals.filter((m) => m.pet_name.toLowerCase().includes(needle));
        }

        const byPet: Record<string, typeof meals> = {};
        for (const meal of meals) {
          if (!byPet[meal.pet_name]) byPet[meal.pet_name] = [];
          byPet[meal.pet_name].push(meal);
        }

        const byDate: Record<string, typeof meals> = {};
        for (const meal of meals) {
          if (!byDate[meal.scheduled_date]) byDate[meal.scheduled_date] = [];
          byDate[meal.scheduled_date].push(meal);
        }

        let schedules: Array<Record<string, unknown>> = [];
        if (params.include_schedules !== false) {
          const allSchedules = await FeedingScheduleService.getFeedingSchedules(ctx.userId);
          schedules = allSchedules
            .filter((s) => s.is_active)
            .filter((s) => !petId || s.pet_id === petId)
            .map((s) => ({
              id: s.id,
              schedule_name: s.schedule_name,
              pet_id: s.pet_id,
              times: (s.feeding_times || []).map((t) => t.time).join(', '),
              days_of_week: s.days_of_week,
              auto_generate_meals: s.auto_generate_meals,
            }));
        }

        return {
          days,
          total: meals.length,
          meals,
          by_pet: Object.fromEntries(
            Object.entries(byPet).map(([pet, items]) => [pet, { count: items.length, meals: items }]),
          ),
          by_date: Object.fromEntries(
            Object.entries(byDate).map(([date, items]) => [date, { count: items.length, meals: items }]),
          ),
          schedules,
        };
      },
    },
    {
      name: 'nutrition_deduplicate_scheduled',
      description:
        'Elimina comidas programadas duplicadas (misma mascota, fecha, hora y tipo de comida). Usar cuando el usuario reporte duplicados en el calendario de comidas.',
      keywords: [
        'duplicadas',
        'duplicados',
        'eliminar duplicados',
        'quitar duplicados',
        'comidas repetidas',
        'limpiar comidas',
      ],
      parameters: {
        type: 'object',
        properties: {
          pet_name: { type: 'string', description: 'Opcional: solo revisar una mascota' },
        },
        additionalProperties: false,
      },
      execute: async (params: { pet_name?: string }, ctx: AiExecutionContext) => {
        if (!ctx.userId) return { error: 'Usuario no autenticado' };

        const result = await deduplicateScheduledMeals(ctx.userId);
        return {
          success: true,
          removed: result.removed,
          kept: result.kept,
          message:
            result.removed > 0
              ? `Eliminé ${result.removed} comida(s) programada(s) duplicada(s).`
              : 'No encontré comidas programadas duplicadas.',
        };
      },
    },
    {
      name: 'nutrition_complete_scheduled',
      description:
        'Marca comidas PROGRAMADAS del calendario (automated_meals) como completadas. Usar cuando el usuario pida marcar/completar comidas programadas, del calendario, de un día concreto o todas las listadas. NO uses nutrition_register_meal para esto — ese es solo para registrar comida manual nueva.',
      keywords: [
        'marcar comidas',
        'marca comidas',
        'completar comidas',
        'completadas',
        'marcar como completadas',
        'marca como completadas',
        'marcar programadas',
        'completar programadas',
        'marcar todas las comidas',
        'marca todas',
      ],
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Fecha YYYY-MM-DD o extraída del mensaje (ej. 30 de junio 2026)' },
          days: {
            type: 'number',
            description: 'Completar comidas programadas en los próximos N días desde hoy (default 7 si dice "todas" sin fecha)',
          },
          pet_name: { type: 'string', description: 'Filtrar por mascota o "todos"' },
        },
        additionalProperties: false,
      },
      execute: async (
        params: { date?: string; days?: number; pet_name?: string },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) return { error: 'Usuario no autenticado' };

        let petId: string | undefined;
        if (params.pet_name?.trim() && params.pet_name.trim().toLowerCase() !== 'todos') {
          const petResult = await resolvePets(ctx, params.pet_name);
          if ('error' in petResult) {
            return {
              error: petResult.error,
              message:
                petResult.error === 'PET_NOT_FOUND'
                  ? petResult.message
                  : `¿De cuál mascota? Tienes: ${petResult.pets?.join(', ')}`,
              pets: petResult.pets,
            };
          }
          if (petResult.pets.length === 1) petId = petResult.pets[0].id;
        }

        const date =
          params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
            ? params.date
            : undefined;
        const days = params.days != null ? Math.min(30, Math.max(1, Math.round(params.days))) : undefined;

        const filters: {
          date?: string;
          petId?: string;
          daysAhead?: number;
        } = {};

        if (petId) filters.petId = petId;
        if (date) {
          filters.date = date;
        } else {
          filters.daysAhead = days ?? 7;
        }

        const result = await FeedingScheduleService.completeScheduledMeals(ctx.userId, filters);

        if (result.completed === 0) {
          const dateLabel = date
            ? date.split('-').reverse().join('/').replace(/^(\d+)\/(\d+)\/(\d+)$/, '$1/$2/$3')
            : `los próximos ${filters.daysAhead} días`;
          return {
            success: false,
            error: 'NO_MEALS',
            message: `No encontré comidas programadas pendientes para ${dateLabel}.`,
            completed: 0,
          };
        }

        const byPet: Record<string, number> = {};
        for (const meal of result.meals) {
          byPet[meal.pet_name] = (byPet[meal.pet_name] ?? 0) + 1;
        }

        return {
          success: true,
          completed: result.completed,
          date,
          days: filters.daysAhead,
          by_pet: byPet,
          meals: result.meals,
          partial_errors: result.errors.length > 0 ? result.errors : undefined,
        };
      },
    },
    {
      name: 'nutrition_list_recent',
      description:
        'Lista el historial de alimentación YA REGISTRADA en nutrition_sessions (pasado). Usar solo para qué comió, historial, últimas horas/días. NO usar para comidas programadas futuras — usa nutrition_list_scheduled.',
      keywords: [
        'historial nutrición',
        'mis comidas',
        'alimentación registrada',
        'qué comió',
        'registros de comida',
        'últimas horas',
        'ultimas horas',
        '72 horas',
      ],
      parameters: {
        type: 'object',
        properties: {
          hours: {
            type: 'number',
            description: 'Ventana en horas hacia atrás (ej. 72 para últimas 72 horas, 24 para hoy)',
          },
          since_date: { type: 'string', description: 'Fecha mínima YYYY-MM-DD (alternativa a hours)' },
          limit: { type: 'number', description: 'Máximo de registros (default 50 con hours, 15 sin)' },
          pet_name: { type: 'string' },
        },
        additionalProperties: false,
      },
      execute: async (
        params: { hours?: number; since_date?: string; limit?: number; pet_name?: string },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) return { error: 'Usuario no autenticado', sessions: [] };

        const hours =
          params.hours != null
            ? Math.min(720, Math.max(1, Math.round(Number(params.hours))))
            : undefined;
        const limit = Math.min(params.limit ?? (hours ? 100 : 15), 100);

        let query = supabase
          .from('nutrition_sessions')
          .select(
            'id, date, feeding_time, meal_type, food_name, quantity_grams, total_calories, total_protein, total_fat, total_carbs, total_fiber, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, fiber_per_100g, created_at, pets(name)',
          )
          .eq('owner_id', ctx.userId);

        if (hours) {
          const since = new Date(Date.now() - hours * 60 * 60 * 1000);
          query = query.gte('created_at', since.toISOString());
        } else if (params.since_date && /^\d{4}-\d{2}-\d{2}$/.test(params.since_date)) {
          query = query.gte('date', params.since_date);
        }

        const { data, error } = await query
          .order('date', { ascending: false })
          .order('feeding_time', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;

        let sessions = (data ?? []).map((row) => ({
          id: row.id,
          pet_name: (row.pets as { name?: string } | null)?.name ?? 'Mascota',
          date: row.date,
          feeding_time: row.feeding_time ? String(row.feeding_time).slice(0, 5) : null,
          meal_label: mealTypeLabel(row.meal_type),
          food_name: row.food_name,
          quantity_grams: row.quantity_grams,
          total_calories: row.total_calories,
          created_at: row.created_at,
        }));

        if (params.pet_name?.trim()) {
          const needle = params.pet_name.trim().toLowerCase();
          sessions = sessions.filter((s) => s.pet_name.toLowerCase().includes(needle));
        }

        const byPet: Record<string, typeof sessions> = {};
        for (const session of sessions) {
          if (!byPet[session.pet_name]) byPet[session.pet_name] = [];
          byPet[session.pet_name].push(session);
        }

        return {
          period_hours: hours,
          since_date: params.since_date,
          total: sessions.length,
          truncated: (data ?? []).length >= limit,
          limit,
          sessions,
          by_pet: Object.fromEntries(
            Object.entries(byPet).map(([pet, items]) => [pet, { count: items.length, meals: items }]),
          ),
        };
      },
    },
    {
      name: 'nutrition_get_food_profile',
      description:
        'Perfil nutricional COMPLETO de un alimento del catálogo pet_foods: macros, vitaminas (A,D,E,K,B1-B12,C) y minerales (Ca,P,Mg,Fe,Zn,Cu,Mn,Se,Na,K,I) por 100g, más data_source. OBLIGATORIO para grasa/proteína/micros de Royal Canin, Pedigree, etc. NO uses marketplace_search_products.',
      keywords: [
        'grasa del alimento',
        'proteína del alimento',
        'perfil nutricional',
        'contenido de grasa',
        'royal canin',
        'macros del alimento',
        'análisis del alimento',
      ],
      parameters: {
        type: 'object',
        properties: {
          food_query: {
            type: 'string',
            description: 'Nombre del alimento, ej. "Royal Canin Medium Adult" o "Royal Canin - Adulto Razas Medianas"',
          },
          species: { type: 'string', description: 'Dog o Cat (opcional)' },
        },
        required: ['food_query'],
        additionalProperties: false,
      },
      execute: async (params: { food_query: string; species?: string }) => {
        const result = await lookupFoodNutritionProfile(params.food_query, params.species);
        if (!result.found) {
          return {
            error: 'FOOD_NOT_FOUND',
            message: `No encontré "${params.food_query}" en el catálogo nutricional.`,
            candidates: result.candidates,
          };
        }
        return { success: true, profile: result.profile, catalog_size: result.catalog_size, sync_status: result.sync_status };
      },
    },
    {
      name: 'nutrition_analyze_diet',
      description:
        'Analiza la dieta de una mascota: comidas + perfil nutricional completo + ingesta vs necesidad estimada. Si detecta déficits (grasa, proteína, omega, etc.), incluye marketplace_recommendations con productos ACTIVOS en tienda (alimentos altos en grasa, suplementos omega) y servicios veterinarios. Ofrece cart_add_item para concretar compra.',
      keywords: [
        'analiza su dieta',
        'analizar dieta',
        'suficiente grasa',
        'perfil nutricional de',
        'qué está comiendo',
        'lo que ha ingerido',
        'recomendación nutricional',
      ],
      parameters: {
        type: 'object',
        properties: {
          pet_name: { type: 'string', description: 'Nombre de la mascota' },
          days: { type: 'number', description: 'Días hacia atrás (default 30)' },
        },
        additionalProperties: false,
      },
      execute: async (
        params: { pet_name?: string; days?: number },
        ctx: AiExecutionContext,
      ) => analyzePetDietProfile(ctx, params),
    },
  ],
};
