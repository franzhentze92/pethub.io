import { supabase } from '@/lib/supabase';
import type { AiExecutionContext, AiModuleDefinition } from '../types';
import { resolvePets } from '../helpers/petResolver';
import {
  deletePetBuddyFact,
  loadPetBuddyFacts,
  savePetBuddyFact,
} from '../helpers/petBuddyMemory';

export const memoryModule: AiModuleDefinition = {
  id: 'memory',
  name: 'Memoria',
  description: 'Hechos y preferencias recordados a largo plazo sobre mascotas y el usuario',
  tools: [
    {
      name: 'memory_list_facts',
      description:
        'Lista hechos que PetBuddy recuerda sobre el usuario y sus mascotas (alergias, preferencias, notas). Usar cuando pregunte qué recuerdas, qué sabes de mi mascota, o memoria guardada.',
      keywords: [
        'qué recuerdas',
        'que recuerdas',
        'memoria guardada',
        'hechos guardados',
        'qué sabes de',
        'que sabes de',
        'lista de recuerdos',
      ],
      parameters: {
        type: 'object',
        properties: {
          pet_name: {
            type: 'string',
            description: 'Filtrar por mascota. Opcional.',
          },
        },
        additionalProperties: false,
      },
      execute: async (params: { pet_name?: string }, ctx: AiExecutionContext) => {
        if (!ctx.userId) {
          return { error: 'AUTH_REQUIRED', message: 'Debes iniciar sesión.' };
        }

        let facts = await loadPetBuddyFacts(ctx.userId);

        if (params.pet_name) {
          const petResult = await resolvePets(ctx, params.pet_name);
          if ('error' in petResult && petResult.error !== 'PET_NOT_FOUND') {
            if (petResult.error === 'NO_PETS') {
              return { facts: [], message: 'No tienes mascotas registradas.' };
            }
          } else if (!('error' in petResult) && petResult.pets.length === 1) {
            const petId = petResult.pets[0].id;
            facts = facts.filter((f) => f.pet_id === petId || f.pet_id === null);
          }
        }

        return { facts, total: facts.length };
      },
    },
    {
      name: 'memory_save_fact',
      description:
        'Guarda un hecho en la memoria a largo plazo de PetBuddy. Usar cuando el usuario diga "recuerda que", "no olvides", o quiera guardar una preferencia, alergia o nota sobre su mascota.',
      keywords: [
        'recuerda que',
        'recuerda',
        'no olvides',
        'guarda que',
        'anota que',
        'memoriza',
      ],
      parameters: {
        type: 'object',
        properties: {
          fact_text: {
            type: 'string',
            description: 'El hecho a recordar, en español.',
          },
          pet_name: {
            type: 'string',
            description: 'Mascota relacionada. Opcional.',
          },
          category: {
            type: 'string',
            description: 'general | allergy | preference | medical | behavior | note',
          },
        },
        required: ['fact_text'],
        additionalProperties: false,
      },
      execute: async (
        params: { fact_text: string; pet_name?: string; category?: string },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) {
          return { error: 'AUTH_REQUIRED', message: 'Debes iniciar sesión.' };
        }

        let petId: string | null = null;
        let petName: string | null = null;

        if (params.pet_name) {
          const petResult = await resolvePets(ctx, params.pet_name);
          if (!('error' in petResult) && petResult.pets.length === 1) {
            petId = petResult.pets[0].id;
            petName = petResult.pets[0].name;
          }
        }

        const validCategories = new Set([
          'general',
          'allergy',
          'preference',
          'medical',
          'behavior',
          'note',
        ]);
        const category = validCategories.has(params.category ?? '')
          ? params.category!
          : 'general';

        const result = await savePetBuddyFact(ctx.userId, params.fact_text, { petId, category });
        if (!result.success) {
          return { error: 'SAVE_FAILED', message: result.error ?? 'No pude guardar el hecho.' };
        }

        return {
          success: true,
          fact_id: result.id,
          pet_name: petName,
          fact_text: params.fact_text,
          category,
        };
      },
    },
    {
      name: 'memory_delete_fact',
      description:
        'Elimina un hecho de la memoria. Usar cuando el usuario diga "olvida que", "borra el recuerdo de", o quiera eliminar algo guardado.',
      keywords: ['olvida que', 'borra el recuerdo', 'elimina el hecho', 'quita de memoria'],
      parameters: {
        type: 'object',
        properties: {
          fact_text: {
            type: 'string',
            description: 'Texto o parte del hecho a eliminar (búsqueda parcial).',
          },
        },
        required: ['fact_text'],
        additionalProperties: false,
      },
      execute: async (params: { fact_text: string }, ctx: AiExecutionContext) => {
        if (!ctx.userId) {
          return { error: 'AUTH_REQUIRED', message: 'Debes iniciar sesión.' };
        }

        const facts = await loadPetBuddyFacts(ctx.userId);
        const needle = params.fact_text.toLowerCase();
        const match = facts.find((f) => f.fact_text.toLowerCase().includes(needle));

        if (!match) {
          return {
            error: 'NOT_FOUND',
            message: 'No encontré un hecho que coincida con eso en mi memoria.',
          };
        }

        const deleted = await deletePetBuddyFact(ctx.userId, match.id);
        if (!deleted) {
          return { error: 'DELETE_FAILED', message: 'No pude eliminar el hecho.' };
        }

        return { success: true, deleted_fact: match.fact_text };
      },
    },
  ],
};
