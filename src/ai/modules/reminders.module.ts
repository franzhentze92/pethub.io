import {
  completePetReminder,
  createPetReminder,
  deletePetReminder,
  fetchPetReminders,
  PET_REMINDER_TYPE_LABELS,
  updatePetReminder,
  type PetReminderType,
} from '@/lib/petReminders';
import type { AiExecutionContext, AiModuleDefinition } from '../types';
import { matchPetByName, resolvePets } from '../helpers/petResolver';

const REMINDER_TYPES: PetReminderType[] = [
  'feeding',
  'exercise',
  'vet',
  'play',
  'medication',
  'grooming',
  'custom',
];

function normalizeReminderType(raw?: string): PetReminderType {
  const value = (raw ?? 'custom').toLowerCase().trim();
  const map: Record<string, PetReminderType> = {
    alimentacion: 'feeding',
    alimentación: 'feeding',
    comida: 'feeding',
    feeding: 'feeding',
    ejercicio: 'exercise',
    exercise: 'exercise',
    veterinario: 'vet',
    veterinaria: 'vet',
    vet: 'vet',
    juego: 'play',
    play: 'play',
    medicamento: 'medication',
    medicina: 'medication',
    medication: 'medication',
    aseo: 'grooming',
    grooming: 'grooming',
    baño: 'grooming',
    custom: 'custom',
    personalizado: 'custom',
  };
  const resolved = map[value];
  return resolved && REMINDER_TYPES.includes(resolved) ? resolved : 'custom';
}

export const remindersModule: AiModuleDefinition = {
  id: 'reminders',
  name: 'Recordatorios',
  description: 'Recordatorios manuales para mascotas (medicamentos, citas, juego, aseo, etc.)',
  basePath: '/recordatorios',
  tools: [
    {
      name: 'reminders_list_mine',
      description: 'Lista recordatorios activos del usuario con fecha, tipo y mascota.',
      keywords: [
        'recordatorios',
        'recordatorio',
        'mis recordatorios',
        'qué tengo pendiente',
        'que tengo pendiente',
        'agenda',
        'calendario',
      ],
      parameters: {
        type: 'object',
        properties: {
          include_completed: { type: 'boolean', description: 'Incluir completados' },
          limit: { type: 'number', description: 'Máximo de resultados' },
        },
        additionalProperties: false,
      },
      execute: async (
        params: { include_completed?: boolean; limit?: number },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) return { error: 'Usuario no autenticado', reminders: [] };

        const rows = await fetchPetReminders(ctx.userId);
        const filtered = rows.filter((row) => params.include_completed || !row.is_completed);
        const limit = params.limit ?? 15;

        return {
          total: filtered.length,
          reminders: filtered.slice(0, limit).map((row) => ({
            id: row.id,
            title: row.title,
            type: row.reminder_type,
            type_label: PET_REMINDER_TYPE_LABELS[row.reminder_type as PetReminderType] ?? row.reminder_type,
            pet_name: row.pets?.name ?? 'Mascota',
            scheduled_date: row.scheduled_date,
            scheduled_time: row.scheduled_time,
            priority: row.priority,
            completed: row.is_completed,
          })),
        };
      },
    },
    {
      name: 'reminders_create',
      description:
        'Crea un recordatorio manual para una mascota. Usar cuando el usuario pida recordar medicamento, cita, baño, juego, etc.',
      keywords: [
        'crear recordatorio',
        'crea recordatorio',
        'recordarme',
        'recuérdame',
        'recuerdame',
        'programar recordatorio',
        'agendar recordatorio',
        'poner recordatorio',
      ],
      parameters: {
        type: 'object',
        properties: {
          pet_name: { type: 'string', description: 'Nombre de la mascota' },
          title: { type: 'string', description: 'Título del recordatorio' },
          reminder_type: {
            type: 'string',
            description: 'Tipo: feeding, exercise, vet, play, medication, grooming, custom',
          },
          scheduled_date: { type: 'string', description: 'Fecha YYYY-MM-DD o "hoy"/"mañana"' },
          scheduled_time: { type: 'string', description: 'Hora HH:MM (opcional)' },
          description: { type: 'string', description: 'Descripción adicional' },
          frequency: { type: 'string', description: 'once, daily, weekly, monthly' },
          priority: { type: 'string', description: 'low, medium, high, urgent' },
        },
        required: ['title', 'scheduled_date'],
        additionalProperties: false,
      },
      execute: async (
        params: {
          pet_name?: string;
          title: string;
          reminder_type?: string;
          scheduled_date: string;
          scheduled_time?: string;
          description?: string;
          frequency?: string;
          priority?: string;
        },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) return { error: 'Usuario no autenticado' };

        const petResult = await resolvePets(ctx, params.pet_name);
        if ('error' in petResult) {
          if (petResult.error === 'NO_PETS') {
            return {
              error: 'NO_PETS',
              message: 'Primero debes registrar una mascota en PetHub.',
              actionPath: '/pet-creation',
            };
          }
          return {
            error: petResult.error,
            message: petResult.message ?? 'Indica para qué mascota es el recordatorio.',
            pets: petResult.pets,
          };
        }

        const pet = petResult.pets[0];
        let date = params.scheduled_date.trim();
        if (date === 'hoy') date = new Date().toISOString().split('T')[0];
        if (date === 'mañana' || date === 'manana') {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          date = tomorrow.toISOString().split('T')[0];
        }

        const row = await createPetReminder({
          pet_id: pet.id,
          owner_id: ctx.userId,
          reminder_type: normalizeReminderType(params.reminder_type),
          title: params.title.trim(),
          description: params.description?.trim(),
          scheduled_date: date,
          scheduled_time: params.scheduled_time?.trim(),
          frequency: (params.frequency as 'once' | 'daily' | 'weekly' | 'monthly') ?? 'once',
          priority: (params.priority as 'low' | 'medium' | 'high' | 'urgent') ?? 'medium',
        });

        return {
          success: true,
          reminder_id: row.id,
          pet_name: pet.name,
          title: row.title,
          scheduled_date: row.scheduled_date,
          message: `Recordatorio "${row.title}" creado para ${pet.name}.`,
        };
      },
    },
    {
      name: 'reminders_update',
      description: 'Edita un recordatorio existente por título o ID.',
      keywords: ['editar recordatorio', 'modificar recordatorio', 'cambiar recordatorio', 'actualizar recordatorio'],
      parameters: {
        type: 'object',
        properties: {
          reminder_id: { type: 'string', description: 'ID del recordatorio' },
          title_query: { type: 'string', description: 'Título parcial para buscar el recordatorio' },
          new_title: { type: 'string' },
          new_description: { type: 'string' },
          scheduled_date: { type: 'string' },
          scheduled_time: { type: 'string' },
          reminder_type: { type: 'string' },
          priority: { type: 'string' },
        },
        additionalProperties: false,
      },
      execute: async (
        params: {
          reminder_id?: string;
          title_query?: string;
          new_title?: string;
          new_description?: string;
          scheduled_date?: string;
          scheduled_time?: string;
          reminder_type?: string;
          priority?: string;
        },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) return { error: 'Usuario no autenticado' };

        const rows = await fetchPetReminders(ctx.userId);
        const active = rows.filter((row) => !row.is_completed);
        const target =
          (params.reminder_id
            ? active.find((row) => row.id === params.reminder_id)
            : undefined) ??
          (params.title_query
            ? active.find((row) =>
                row.title.toLowerCase().includes(params.title_query!.toLowerCase().trim()),
              )
            : undefined);

        if (!target) {
          return {
            error: 'NOT_FOUND',
            message: 'No encontré ese recordatorio. Indica el título o crea uno nuevo.',
          };
        }

        const updated = await updatePetReminder(target.id, {
          ...(params.new_title ? { title: params.new_title.trim() } : {}),
          ...(params.new_description !== undefined ? { description: params.new_description.trim() } : {}),
          ...(params.scheduled_date ? { scheduled_date: params.scheduled_date } : {}),
          ...(params.scheduled_time !== undefined ? { scheduled_time: params.scheduled_time } : {}),
          ...(params.reminder_type ? { reminder_type: normalizeReminderType(params.reminder_type) } : {}),
          ...(params.priority
            ? { priority: params.priority as 'low' | 'medium' | 'high' | 'urgent' }
            : {}),
        });

        return {
          success: true,
          reminder_id: updated.id,
          title: updated.title,
          scheduled_date: updated.scheduled_date,
          message: `Recordatorio actualizado: "${updated.title}".`,
        };
      },
    },
    {
      name: 'reminders_complete',
      description: 'Marca un recordatorio como completado.',
      keywords: ['completar recordatorio', 'marcar recordatorio', 'ya hice', 'listo el recordatorio'],
      parameters: {
        type: 'object',
        properties: {
          reminder_id: { type: 'string' },
          title_query: { type: 'string', description: 'Título parcial del recordatorio' },
        },
        additionalProperties: false,
      },
      execute: async (
        params: { reminder_id?: string; title_query?: string },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) return { error: 'Usuario no autenticado' };

        const rows = await fetchPetReminders(ctx.userId);
        const active = rows.filter((row) => !row.is_completed);
        const target =
          (params.reminder_id
            ? active.find((row) => row.id === params.reminder_id)
            : undefined) ??
          (params.title_query
            ? active.find((row) =>
                row.title.toLowerCase().includes(params.title_query!.toLowerCase().trim()),
              )
            : undefined);

        if (!target) {
          return { error: 'NOT_FOUND', message: 'No encontré un recordatorio pendiente con ese nombre.' };
        }

        await completePetReminder(target.id);
        return {
          success: true,
          title: target.title,
          message: `Recordatorio "${target.title}" marcado como completado.`,
        };
      },
    },
    {
      name: 'reminders_delete',
      description: 'Elimina un recordatorio manual.',
      keywords: ['eliminar recordatorio', 'borrar recordatorio', 'quitar recordatorio'],
      parameters: {
        type: 'object',
        properties: {
          reminder_id: { type: 'string' },
          title_query: { type: 'string' },
        },
        additionalProperties: false,
      },
      execute: async (
        params: { reminder_id?: string; title_query?: string },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) return { error: 'Usuario no autenticado' };

        const rows = await fetchPetReminders(ctx.userId);
        const target =
          (params.reminder_id
            ? rows.find((row) => row.id === params.reminder_id)
            : undefined) ??
          (params.title_query
            ? rows.find((row) =>
                row.title.toLowerCase().includes(params.title_query!.toLowerCase().trim()),
              )
            : undefined);

        if (!target) {
          return { error: 'NOT_FOUND', message: 'No encontré ese recordatorio.' };
        }

        await deletePetReminder(target.id);
        return {
          success: true,
          title: target.title,
          message: `Recordatorio "${target.title}" eliminado.`,
        };
      },
    },
  ],
};
