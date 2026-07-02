import { supabase } from '@/lib/supabase';
import type { AiExecutionContext, AiModuleDefinition } from '../types';

export const settingsModule: AiModuleDefinition = {
  id: 'settings',
  name: 'Ajustes y Perfil',
  description: 'Datos personales del usuario: nombre, teléfono y dirección',
  basePath: '/ajustes',
  tools: [
    {
      name: 'profile_get_mine',
      description: 'Consulta el perfil del usuario autenticado.',
      keywords: ['mi perfil', 'mis datos', 'mi información', 'mi telefono', 'mi teléfono', 'mi dirección'],
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      execute: async (_params, ctx: AiExecutionContext) => {
        if (!ctx.userId) return { error: 'Usuario no autenticado' };

        const { data, error } = await supabase
          .from('user_profiles')
          .select('full_name, phone, address, avatar_url')
          .eq('user_id', ctx.userId)
          .maybeSingle();

        if (error) throw error;
        return {
          full_name: data?.full_name ?? null,
          phone: data?.phone ?? null,
          address: data?.address ?? null,
          has_avatar: Boolean(data?.avatar_url),
        };
      },
    },
    {
      name: 'profile_update',
      description: 'Actualiza nombre, teléfono o dirección del perfil del usuario.',
      keywords: [
        'actualizar perfil',
        'editar perfil',
        'cambiar teléfono',
        'cambiar dirección',
        'actualizar mis datos',
        'modificar perfil',
      ],
      parameters: {
        type: 'object',
        properties: {
          full_name: { type: 'string' },
          phone: { type: 'string' },
          address: { type: 'string' },
        },
        additionalProperties: false,
      },
      execute: async (
        params: { full_name?: string; phone?: string; address?: string },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) return { error: 'Usuario no autenticado' };

        const updates: Record<string, string> = {};
        if (params.full_name?.trim()) updates.full_name = params.full_name.trim();
        if (params.phone?.trim()) updates.phone = params.phone.trim();
        if (params.address?.trim()) updates.address = params.address.trim();

        if (Object.keys(updates).length === 0) {
          return {
            error: 'FIELDS_REQUIRED',
            message: 'Indica qué quieres actualizar: nombre, teléfono o dirección.',
          };
        }

        const { data, error } = await supabase
          .from('user_profiles')
          .update(updates)
          .eq('user_id', ctx.userId)
          .select('full_name, phone, address')
          .single();

        if (error) throw error;

        return {
          success: true,
          profile: data,
          message: 'Perfil actualizado correctamente.',
        };
      },
    },
  ],
};
