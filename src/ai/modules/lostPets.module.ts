import { supabase } from '@/lib/supabase';
import { getPrimaryPetImageUrl } from '@/utils/petImages';
import type { AiExecutionContext, AiModuleDefinition } from '../types';
import { resolvePets } from '../helpers/petResolver';

interface LostPetSearchParams {
  query?: string;
  location?: string;
  species?: string;
  limit?: number;
}

export const lostPetsModule: AiModuleDefinition = {
  id: 'lost_pets',
  name: 'Mascotas Perdidas',
  description: 'Reportes de mascotas perdidas, ubicación y contacto',
  basePath: '/mascotas-perdidas',
  tools: [
    {
      name: 'lost_pets_list',
      description: 'Lista mascotas reportadas como perdidas con ubicación, especie y descripción.',
      keywords: [
        'perdido', 'perdida', 'perdidos', 'perdidas', 'extraviado', 'extraviada', 'desaparecido',
        'mascota perdida', 'perro perdido', 'gato perdido', 'donde', 'ubicación', 'ubicacion',
      ],
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Buscar por nombre o descripción' },
          location: { type: 'string', description: 'Filtrar por ciudad o zona' },
          species: { type: 'string', description: 'Especie' },
          limit: { type: 'number', description: 'Máximo de resultados' },
        },
        additionalProperties: false,
      },
      execute: async (params: LostPetSearchParams) => {
        const limit = params.limit ?? 15;
        let query = supabase
          .from('lost_pets')
          .select('id, name, species, breed, color, last_location, last_seen, description, contact_phone, status')
          .eq('status', 'lost')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (params.location) {
          query = query.ilike('last_location', `%${params.location}%`);
        }
        if (params.species) {
          query = query.ilike('species', `%${params.species}%`);
        }
        if (params.query) {
          const q = params.query.trim();
          query = query.or(
            `name.ilike.%${q}%,description.ilike.%${q}%,breed.ilike.%${q}%,last_location.ilike.%${q}%`
          );
        }

        const { data, error } = await query;
        if (error) throw error;

        return {
          total: data?.length ?? 0,
          lostPets: (data ?? []).map((p) => ({
            name: p.name,
            species: p.species,
            breed: p.breed,
            color: p.color,
            location: p.last_location,
            lastSeen: p.last_seen,
            description: p.description,
            contact: p.contact_phone,
          })),
        };
      },
    },
    {
      name: 'lost_pets_count',
      description: 'Cuenta cuántas mascotas están reportadas como perdidas.',
      keywords: ['cuantas perdidas', 'cuántas perdidas', 'total perdidos', 'hay mascotas perdidas'],
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      execute: async () => {
        const { count, error } = await supabase
          .from('lost_pets')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'lost');
        if (error) throw error;
        return { total: count ?? 0 };
      },
    },
    {
      name: 'lost_pets_list_mine',
      description: 'Lista reportes de mascotas perdidas del usuario.',
      keywords: ['mis reportes perdidos', 'mis mascotas perdidas', 'mis reportes'],
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      execute: async (_params, ctx: AiExecutionContext) => {
        if (!ctx.userId) return { error: 'Usuario no autenticado', reports: [] };

        const { data, error } = await supabase
          .from('lost_pets')
          .select('id, name, species, status, last_location, last_seen')
          .eq('owner_id', ctx.userId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return {
          total: data?.length ?? 0,
          reports: (data ?? []).map((row) => ({
            id: row.id,
            name: row.name,
            species: row.species,
            status: row.status,
            location: row.last_location,
            last_seen: row.last_seen,
          })),
        };
      },
    },
    {
      name: 'lost_pets_report',
      description:
        'Reporta una mascota del usuario como perdida. Requiere ubicación y teléfono de contacto.',
      keywords: [
        'reportar perdida',
        'reportar mascota perdida',
        'perdió mi mascota',
        'perdio mi mascota',
        'extraviado',
        'desapareció',
        'desaparecio',
      ],
      parameters: {
        type: 'object',
        properties: {
          pet_name: { type: 'string' },
          last_location: { type: 'string', description: 'Zona o dirección donde se perdió' },
          last_seen: { type: 'string', description: 'Fecha YYYY-MM-DD o "hoy"' },
          contact_phone: { type: 'string' },
          description: { type: 'string' },
          reward: { type: 'number' },
        },
        required: ['last_location', 'contact_phone'],
        additionalProperties: false,
      },
      execute: async (
        params: {
          pet_name?: string;
          last_location: string;
          last_seen?: string;
          contact_phone: string;
          description?: string;
          reward?: number;
        },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) return { error: 'Usuario no autenticado' };

        const petResult = await resolvePets(ctx, params.pet_name);
        if ('error' in petResult) {
          return {
            error: petResult.error,
            message: petResult.message ?? 'Indica qué mascota se perdió.',
            pets: petResult.pets,
          };
        }

        const petRow = (
          await supabase
            .from('pets')
            .select('id, name, species, breed, age, image_url, pet_images(image_url, display_order)')
            .eq('id', petResult.pets[0].id)
            .single()
        ).data;

        if (!petRow) return { error: 'PET_NOT_FOUND', message: 'No encontré la mascota.' };

        let lastSeen = params.last_seen?.trim() || new Date().toISOString().split('T')[0];
        if (lastSeen === 'hoy') lastSeen = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
          .from('lost_pets')
          .insert({
            owner_id: ctx.userId,
            pet_id: petRow.id,
            name: petRow.name,
            species: petRow.species,
            breed: petRow.breed,
            age: petRow.age,
            last_seen: lastSeen,
            last_location: params.last_location.trim(),
            description: params.description?.trim() || null,
            contact_phone: params.contact_phone.trim(),
            reward: params.reward ?? null,
            image_url: getPrimaryPetImageUrl(petRow),
            status: 'lost',
          })
          .select('id, name')
          .single();

        if (error) throw error;

        return {
          success: true,
          report_id: data.id,
          pet_name: data.name,
          message: `Reporte de ${data.name} como perdida publicado. Otros usuarios podrán verlo en Mascotas Perdidas.`,
          actionPath: '/mascotas-perdidas',
        };
      },
    },
    {
      name: 'lost_pets_mark_found',
      description: 'Marca un reporte propio como encontrado.',
      keywords: ['encontré mi mascota', 'encontre mi mascota', 'ya apareció', 'marcar como encontrada'],
      parameters: {
        type: 'object',
        properties: {
          report_id: { type: 'string' },
          pet_name: { type: 'string' },
        },
        additionalProperties: false,
      },
      execute: async (params: { report_id?: string; pet_name?: string }, ctx: AiExecutionContext) => {
        if (!ctx.userId) return { error: 'Usuario no autenticado' };

        let query = supabase
          .from('lost_pets')
          .select('id, name, status')
          .eq('owner_id', ctx.userId)
          .eq('status', 'lost');

        if (params.report_id) {
          query = query.eq('id', params.report_id);
        } else if (params.pet_name?.trim()) {
          query = query.ilike('name', `%${params.pet_name.trim()}%`);
        } else {
          return { error: 'IDENTIFIER_REQUIRED', message: 'Indica qué mascota encontraste.' };
        }

        const { data: reports, error: fetchError } = await query.limit(1);
        if (fetchError) throw fetchError;
        const report = reports?.[0];
        if (!report) {
          return { error: 'NOT_FOUND', message: 'No encontré un reporte activo con esos datos.' };
        }

        const { error } = await supabase
          .from('lost_pets')
          .update({ status: 'found' })
          .eq('id', report.id)
          .eq('owner_id', ctx.userId);

        if (error) throw error;

        return {
          success: true,
          pet_name: report.name,
          message: `¡Genial! Reporte de ${report.name} marcado como encontrado.`,
          actionPath: '/mascotas-perdidas',
        };
      },
    },
  ],
};
