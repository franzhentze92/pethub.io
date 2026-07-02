import { supabase } from '@/lib/supabase';
import type { AiExecutionContext, AiModuleDefinition } from '../types';
import { resolvePets } from '../helpers/petResolver';
import {
  buildPetDataGraph,
  comparePets,
  graphToHealthSummary,
} from '../helpers/petDataGraph';

export const healthModule: AiModuleDefinition = {
  id: 'health',
  name: 'Salud integral',
  description:
    'Resumen de salud y bienestar de las mascotas del usuario: nutrición vs objetivo, ejercicio, veterinaria, vacunas, insights y comparación',
  basePath: '/health-journal',
  tools: [
    {
      name: 'pet_health_summary',
      description:
        'Genera un resumen integral de salud de UNA o VARIAS mascotas REGISTRADAS del usuario (NO mascotas en adopción). Usar cuando pregunte por salud, bienestar, cómo está su mascota, análisis general, estado de salud, recomendaciones, nutrición vs objetivo, ejercicio, citas veterinarias o vacunas. Combina nutrición, ejercicio, veterinaria, recordatorios y tendencias.',
      keywords: [
        'salud',
        'salud de',
        'cómo está',
        'como esta',
        'como está',
        'bienestar',
        'análisis de salud',
        'analisis de salud',
        'resumen de salud',
        'estado de salud',
        'estado general',
        'cómo va',
        'como va',
        'recomendaciones',
        'cuidado integral',
        'salud integral',
        'revisión general',
        'revision general',
        'chequeo',
        'evaluación',
        'evaluacion',
      ],
      parameters: {
        type: 'object',
        properties: {
          pet_name: {
            type: 'string',
            description:
              'Nombre de la mascota del usuario. Opcional si solo tiene una. Usa "todos" para todas sus mascotas.',
          },
          days_back: {
            type: 'number',
            description: 'Días hacia atrás para ejercicio y actividad (default 7)',
          },
        },
        additionalProperties: false,
      },
      execute: async (
        params: { pet_name?: string; days_back?: number },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) {
          return {
            error: 'AUTH_REQUIRED',
            message: 'Debes iniciar sesión para consultar la salud de tus mascotas.',
          };
        }

        const petResult = await resolvePets(ctx, params.pet_name);
        if ('error' in petResult) {
          if (petResult.error === 'NO_PETS') {
            return {
              error: 'NO_PETS',
              message:
                'No tienes mascotas registradas en PetHub. Agrega una en Ajustes para ver su salud.',
              actionPath: '/ajustes',
            };
          }
          if (petResult.error === 'PET_REQUIRED') {
            return {
              error: 'PET_REQUIRED',
              message: `¿De cuál mascota quieres el resumen de salud? Tienes: ${petResult.pets?.join(', ')}.`,
              pets: petResult.pets,
            };
          }
          return {
            error: 'PET_NOT_FOUND',
            message: petResult.message ?? 'No encontré esa mascota.',
            pets: petResult.pets,
          };
        }

        const daysBack = Math.min(Math.max(params.days_back ?? 7, 1), 90);

        const { data: fullPets, error: petsError } = await supabase
          .from('pets')
          .select('id, name, species, weight, age')
          .eq('owner_id', ctx.userId)
          .in(
            'id',
            petResult.pets.map((p) => p.id),
          );

        if (petsError) throw petsError;

        const summaries = await Promise.all(
          (fullPets ?? []).map(async (pet) => {
            const graph = await buildPetDataGraph(pet, ctx.userId!, {
              daysBack,
              includeTimeline: false,
              includeInsights: false,
            });
            return graphToHealthSummary(graph);
          }),
        );

        return {
          pets: summaries,
          disclaimer:
            'Resumen basado en datos registrados en PetHub. No sustituye consejo veterinario profesional.',
          actionPath: '/health-journal',
        };
      },
    },
    {
      name: 'pet_timeline',
      description:
        'Línea de tiempo cronológica de eventos de UNA o VARIAS mascotas REGISTRADAS del usuario. Combina comidas, ejercicio, visitas veterinarias, vacunas, recordatorios y documentos analizados. Usar cuando pregunte por cronología, línea de tiempo, qué pasó, historial de eventos, actividad reciente o todo lo ocurrido en un período.',
      keywords: [
        'línea de tiempo',
        'linea de tiempo',
        'cronología',
        'cronologia',
        'historial completo',
        'qué pasó',
        'que paso',
        'qué ha pasado',
        'que ha pasado',
        'eventos recientes',
        'actividad reciente',
        'resumen temporal',
        'últimos eventos',
        'ultimos eventos',
        'todo lo que pasó',
        'todo lo que paso',
      ],
      parameters: {
        type: 'object',
        properties: {
          pet_name: {
            type: 'string',
            description:
              'Nombre de la mascota. Opcional si solo tiene una. Usa "todos" para todas sus mascotas.',
          },
          days_back: {
            type: 'number',
            description: 'Días hacia atrás (default 30, máximo 90)',
          },
          limit: {
            type: 'number',
            description: 'Máximo de eventos a devolver (default 40)',
          },
        },
        additionalProperties: false,
      },
      execute: async (
        params: { pet_name?: string; days_back?: number; limit?: number },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) {
          return {
            error: 'AUTH_REQUIRED',
            message: 'Debes iniciar sesión para ver la línea de tiempo de tus mascotas.',
          };
        }

        const petResult = await resolvePets(ctx, params.pet_name);
        if ('error' in petResult) {
          if (petResult.error === 'NO_PETS') {
            return {
              error: 'NO_PETS',
              message:
                'No tienes mascotas registradas en PetHub. Agrega una en Ajustes para ver su historial.',
              actionPath: '/ajustes',
            };
          }
          if (petResult.error === 'PET_REQUIRED') {
            return {
              error: 'PET_REQUIRED',
              message: `¿De cuál mascota quieres la línea de tiempo? Tienes: ${petResult.pets?.join(', ')}.`,
              pets: petResult.pets,
            };
          }
          return {
            error: 'PET_NOT_FOUND',
            message: petResult.message ?? 'No encontré esa mascota.',
            pets: petResult.pets,
          };
        }

        const daysBack = Math.min(Math.max(params.days_back ?? 30, 1), 90);
        const limit = Math.min(Math.max(params.limit ?? 40, 5), 100);

        const graphs = await Promise.all(
          petResult.pets.map((pet) =>
            buildPetDataGraph(
              { id: pet.id, name: pet.name, species: '', weight: null },
              ctx.userId!,
              { daysBack, timelineLimit: limit, includeInsights: false },
            ),
          ),
        );

        const events = graphs
          .flatMap((g) => g.timeline)
          .sort((a, b) => {
            const aKey = a.datetime ?? `${a.date}T00:00:00`;
            const bKey = b.datetime ?? `${b.date}T00:00:00`;
            return bKey.localeCompare(aKey);
          })
          .slice(0, limit);

        return {
          period_days: daysBack,
          pets: petResult.pets.map((p) => p.name),
          events,
          total_events: events.length,
          actionPath: '/health-journal',
        };
      },
    },
    {
      name: 'pet_insights',
      description:
        'Analiza patrones y correlaciones en los datos de salud de mascotas REGISTRADAS del usuario. Detecta: baja ingesta tras visita vet, ejercicio insuficiente, vacunas vencidas sin recordatorio, diagnósticos recurrentes, caídas semanales de nutrición/ejercicio, documentos sin seguimiento. Usar cuando pregunte por insights, patrones, alertas, qué debería revisar, recomendaciones inteligentes o correlaciones.',
      keywords: [
        'insights',
        'patrones',
        'alertas',
        'qué debería revisar',
        'que deberia revisar',
        'recomendaciones inteligentes',
        'correlaciones',
        'correlación',
        'correlacion',
        'análisis inteligente',
        'analisis inteligente',
        'qué notas',
        'que notas',
        'algo que deba saber',
        'problemas detectados',
        'advertencias',
      ],
      parameters: {
        type: 'object',
        properties: {
          pet_name: {
            type: 'string',
            description:
              'Nombre de la mascota. Opcional si solo tiene una. Usa "todos" para todas.',
          },
          days_back: {
            type: 'number',
            description: 'Días de contexto para el análisis (default 30)',
          },
        },
        additionalProperties: false,
      },
      execute: async (
        params: { pet_name?: string; days_back?: number },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) {
          return {
            error: 'AUTH_REQUIRED',
            message: 'Debes iniciar sesión para ver insights de tus mascotas.',
          };
        }

        const petResult = await resolvePets(ctx, params.pet_name);
        if ('error' in petResult) {
          if (petResult.error === 'NO_PETS') {
            return {
              error: 'NO_PETS',
              message: 'No tienes mascotas registradas en PetHub.',
              actionPath: '/ajustes',
            };
          }
          if (petResult.error === 'PET_REQUIRED') {
            return {
              error: 'PET_REQUIRED',
              message: `¿De cuál mascota quieres insights? Tienes: ${petResult.pets?.join(', ')}.`,
              pets: petResult.pets,
            };
          }
          return {
            error: 'PET_NOT_FOUND',
            message: petResult.message ?? 'No encontré esa mascota.',
            pets: petResult.pets,
          };
        }

        const daysBack = Math.min(Math.max(params.days_back ?? 30, 7), 90);

        const { data: fullPets, error: petsError } = await supabase
          .from('pets')
          .select('id, name, species, weight, age')
          .eq('owner_id', ctx.userId)
          .in(
            'id',
            petResult.pets.map((p) => p.id),
          );

        if (petsError) throw petsError;

        const results = await Promise.all(
          (fullPets ?? []).map(async (pet) => {
            const graph = await buildPetDataGraph(pet, ctx.userId!, {
              daysBack,
              includeTimeline: false,
              includeInsights: true,
            });
            return {
              pet_name: pet.name,
              insights: graph.insights,
              documents_analyzed: graph.documents.length,
            };
          }),
        );

        const totalInsights = results.reduce((s, r) => s + r.insights.length, 0);

        return {
          pets: results,
          total_insights: totalInsights,
          disclaimer:
            'Insights basados en datos registrados. No sustituyen evaluación veterinaria profesional.',
          actionPath: '/health-journal',
        };
      },
    },
    {
      name: 'pets_compare',
      description:
        'Compara métricas de salud entre VARIAS mascotas REGISTRADAS del usuario: nutrición, ejercicio, vacunas, visitas vet e insights. Usar cuando pregunte comparar mascotas, cuál está mejor, diferencias entre perros/gatos, quién tiene más ejercicio o quién necesita más atención.',
      keywords: [
        'comparar mascotas',
        'comparar mis mascotas',
        'comparación',
        'comparacion',
        'cuál está mejor',
        'cual esta mejor',
        'diferencias entre',
        'quién tiene más',
        'quien tiene mas',
        'quién necesita',
        'quien necesita',
        'entre mis mascotas',
        'mis mascotas comparadas',
      ],
      parameters: {
        type: 'object',
        properties: {
          pet_name: {
            type: 'string',
            description: 'Opcional. Usa "todos" para comparar todas las mascotas del usuario.',
          },
        },
        additionalProperties: false,
      },
      execute: async (params: { pet_name?: string }, ctx: AiExecutionContext) => {
        if (!ctx.userId) {
          return {
            error: 'AUTH_REQUIRED',
            message: 'Debes iniciar sesión para comparar tus mascotas.',
          };
        }

        const petResult = await resolvePets(ctx, params.pet_name ?? 'todos');
        if ('error' in petResult) {
          if (petResult.error === 'NO_PETS') {
            return {
              error: 'NO_PETS',
              message: 'No tienes mascotas registradas en PetHub.',
              actionPath: '/ajustes',
            };
          }
          return {
            error: 'PET_NOT_FOUND',
            message: petResult.message ?? 'No encontré esa mascota.',
            pets: petResult.pets,
          };
        }

        if (petResult.pets.length < 2) {
          return {
            error: 'NEED_MULTIPLE_PETS',
            message:
              'Necesitas al menos 2 mascotas registradas para hacer una comparación. ¿Quieres un resumen de salud individual?',
            pets: petResult.pets.map((p) => p.name),
          };
        }

        const { data: fullPets, error: petsError } = await supabase
          .from('pets')
          .select('id, name, species, weight, age')
          .eq('owner_id', ctx.userId)
          .in(
            'id',
            petResult.pets.map((p) => p.id),
          );

        if (petsError) throw petsError;

        const comparison = await comparePets(fullPets ?? [], ctx.userId);

        const mostExercise = [...comparison].sort(
          (a, b) => b.exercise_minutes_7d - a.exercise_minutes_7d,
        )[0];
        const mostAlerts = [...comparison].sort((a, b) => b.insight_count - a.insight_count)[0];

        return {
          comparison,
          highlights: {
            most_exercise: mostExercise?.pet_name ?? null,
            most_insights: mostAlerts?.pet_name ?? null,
          },
          disclaimer:
            'Comparación basada en datos registrados en PetHub. No sustituye consejo veterinario.',
          actionPath: '/health-journal',
        };
      },
    },
  ],
};
