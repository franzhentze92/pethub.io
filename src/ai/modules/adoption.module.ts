import { supabase } from '@/lib/supabase';
import type { AiModuleDefinition, AiExecutionContext } from '../types';

interface AdoptionSearchParams {
  species?: string;
  breed?: string;
  sex?: string;
  query?: string;
  limit?: number;
}

const sexMap: Record<string, string> = {
  macho: 'M',
  machos: 'M',
  masculino: 'M',
  male: 'M',
  m: 'M',
  hembra: 'F',
  hembras: 'F',
  femenino: 'F',
  female: 'F',
  f: 'F',
};

function resolveSex(value?: string): string | undefined {
  if (!value) return undefined;
  const key = value.toLowerCase().trim();
  return sexMap[key] ?? value;
}

import { normalizeSpeciesToSpanish } from '@/utils/petLabels';

function resolveSpecies(value?: string): string | undefined {
  if (!value) return undefined;
  return normalizeSpeciesToSpanish(value);
}

export const adoptionModule: AiModuleDefinition = {
  id: 'adoption',
  name: 'Adopción',
  description: 'Mascotas disponibles para adopción, razas, albergues',
  basePath: '/adopcion',
  tools: [
    {
      name: 'adoption_list_pets',
      description: 'Lista mascotas disponibles para adopción con nombre, raza, especie, edad y albergue.',
      keywords: [
        'adoptar', 'adopción', 'adopcion', 'adopta', 'adoptarlo', 'adoptarla', 'me interesa',
        'mascota en adopcion', 'perros en adopcion', 'gatos en adopcion', 'razas', 'raza',
        'albergue', 'refugio', 'disponible', 'macho', 'machos', 'hembra', 'hembras',
      ],
      parameters: {
        type: 'object',
        properties: {
          species: { type: 'string', description: 'Especie: perro, gato, etc.' },
          breed: { type: 'string', description: 'Raza a filtrar' },
          sex: { type: 'string', description: 'Sexo: macho (M) o hembra (F)' },
          query: { type: 'string', description: 'Búsqueda por nombre o descripción' },
          limit: { type: 'number', description: 'Máximo de resultados' },
        },
        additionalProperties: false,
      },
      execute: async (params: AdoptionSearchParams) => {
        const limit = params.limit ?? 15;
        let query = supabase
          .from('adoption_pets')
          .select('id, name, species, breed, sex, age, size, color, adoption_fee, location, description, shelters(name, location)')
          .eq('status', 'available')
          .order('created_at', { ascending: false })
          .limit(limit);

        const species = resolveSpecies(params.species);
        if (species) {
          query = query.eq('species', species);
        }
        if (params.breed) {
          query = query.ilike('breed', `%${params.breed}%`);
        }
        const sex = resolveSex(params.sex);
        if (sex) {
          query = query.eq('sex', sex);
        }
        if (params.query) {
          const q = params.query.trim();
          query = query.or(`name.ilike.%${q}%,breed.ilike.%${q}%,description.ilike.%${q}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        const pets = data ?? [];
        const breeds = [...new Set(pets.map((p) => p.breed).filter(Boolean))];

        return {
          total: pets.length,
          breeds,
          speciesBreakdown: pets.reduce<Record<string, number>>((acc, p) => {
            const key = p.species ?? 'Desconocido';
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
          }, {}),
          pets: pets.map((p) => ({
            name: p.name,
            species: p.species,
            breed: p.breed,
            age: p.age,
            sex: p.sex,
            size: p.size,
            fee: p.adoption_fee,
            location: p.location ?? (p.shelters as { location?: string })?.location,
            shelter: (p.shelters as { name?: string })?.name,
          })),
        };
      },
    },
    {
      name: 'adoption_count_available',
      description: 'Cuenta cuántas mascotas hay disponibles para adopción, desglosado por especie.',
      keywords: ['cuantos perros', 'cuántos perros', 'cuantos gatos', 'cuántas mascotas', 'total adopcion'],
      parameters: {
        type: 'object',
        properties: {
          species: { type: 'string', description: 'Filtrar por especie' },
        },
        additionalProperties: false,
      },
      execute: async (params: { species?: string }) => {
        let query = supabase
          .from('adoption_pets')
          .select('species')
          .eq('status', 'available');

        const species = resolveSpecies(params.species);
        if (species) {
          query = query.eq('species', species);
        }

        const { data, error } = await query;
        if (error) throw error;

        const breakdown = (data ?? []).reduce<Record<string, number>>((acc, p) => {
          const key = p.species ?? 'Otro';
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        }, {});

        return { total: data?.length ?? 0, bySpecies: breakdown };
      },
    },
    {
      name: 'adoption_apply',
      description:
        'Envía solicitud de adopción para una mascota en adopción. Usar cuando el usuario quiera adoptar.',
      keywords: [
        'adoptar',
        'solicitar adopción',
        'solicitud de adopción',
        'quiero adoptarlo',
        'quiero adoptarla',
        'aplicar adopción',
      ],
      parameters: {
        type: 'object',
        properties: {
          pet_name: { type: 'string', description: 'Nombre de la mascota en adopción' },
          adoption_pet_id: { type: 'string', description: 'ID de adoption_pets' },
          message: { type: 'string', description: 'Mensaje para el albergue' },
        },
        additionalProperties: false,
      },
      execute: async (
        params: { pet_name?: string; adoption_pet_id?: string; message?: string },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) {
          return {
            error: 'AUTH_REQUIRED',
            message: 'Debes iniciar sesión para solicitar una adopción.',
          };
        }

        let adoptionPetId = params.adoption_pet_id;
        let petName = params.pet_name;

        if (!adoptionPetId && params.pet_name?.trim()) {
          const { data: matches, error } = await supabase
            .from('adoption_pets')
            .select('id, name, owner_id')
            .eq('status', 'available')
            .ilike('name', `%${params.pet_name.trim()}%`)
            .limit(5);
          if (error) throw error;
          if (!matches?.length) {
            return {
              error: 'NOT_FOUND',
              message: `No encontré mascota en adopción llamada "${params.pet_name}".`,
            };
          }
          adoptionPetId = matches[0].id;
          petName = matches[0].name;
          if (matches[0].owner_id === ctx.userId) {
            return { error: 'OWN_PET', message: 'No puedes adoptar tu propia mascota.' };
          }
        }

        if (!adoptionPetId) {
          return {
            error: 'PET_REQUIRED',
            message: 'Indica el nombre de la mascota que quieres adoptar.',
          };
        }

        const { data: existing } = await supabase
          .from('adoption_applications')
          .select('id')
          .eq('pet_id', adoptionPetId)
          .eq('applicant_id', ctx.userId)
          .maybeSingle();

        if (existing) {
          return {
            error: 'DUPLICATE',
            message: 'Ya enviaste una solicitud de adopción para esta mascota.',
          };
        }

        const { error: insertError } = await supabase.from('adoption_applications').insert({
          pet_id: adoptionPetId,
          applicant_id: ctx.userId,
          status: 'pending',
          message: params.message?.trim() || 'Solicitud de adopción enviada desde PetBuddy',
        });

        if (insertError) throw insertError;

        return {
          success: true,
          pet_name: petName,
          message: `Solicitud de adopción enviada${petName ? ` para ${petName}` : ''}. Te contactaremos pronto.`,
          actionPath: '/adopcion',
        };
      },
    },
    {
      name: 'adoption_list_my_applications',
      description: 'Lista las solicitudes de adopción enviadas por el usuario.',
      keywords: ['mis solicitudes de adopción', 'mis adopciones', 'estado de mi adopción'],
      parameters: { type: 'object', properties: { limit: { type: 'number' } }, additionalProperties: false },
      execute: async (params: { limit?: number }, ctx: AiExecutionContext) => {
        if (!ctx.userId) return { error: 'Usuario no autenticado', applications: [] };

        const limit = params.limit ?? 10;
        const { data, error } = await supabase
          .from('adoption_applications')
          .select('id, status, message, created_at, adoption_pets(name, species, breed)')
          .eq('applicant_id', ctx.userId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;

        return {
          total: data?.length ?? 0,
          applications: (data ?? []).map((app) => ({
            pet_name: (app.adoption_pets as { name?: string } | null)?.name ?? 'Mascota',
            status: app.status,
            message: app.message,
            date: app.created_at,
          })),
        };
      },
    },
  ],
};
