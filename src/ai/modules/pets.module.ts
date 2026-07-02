import { supabase } from '@/lib/supabase';
import type { AiModuleDefinition, AiExecutionContext } from '../types';
import { loadUserPets, matchPetByName, resolvePets } from '../helpers/petResolver';

import { normalizeSpeciesToSpanish, SPECIES_ES } from '@/utils/petLabels';

function resolveSpecies(raw?: string): string {
  return normalizeSpeciesToSpanish(raw, SPECIES_ES.PERRO);
}

export const petsModule: AiModuleDefinition = {
  id: 'pets',
  name: 'Mis Mascotas',
  description: 'Mascotas registradas del usuario: listar, crear y editar',
  basePath: '/ajustes',
  tools: [
    {
      name: 'pets_list_mine',
      description: 'Lista las mascotas del usuario autenticado.',
      keywords: ['mis mascotas', 'mis perros', 'mis gatos', 'mi mascota', 'tengo mascotas'],
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      execute: async (_params, ctx: AiExecutionContext) => {
        if (!ctx.userId) {
          return { error: 'Usuario no autenticado', pets: [] };
        }

        const { data, error } = await supabase
          .from('pets')
          .select('id, name, species, breed, age, weight')
          .eq('owner_id', ctx.userId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return {
          total: data?.length ?? 0,
          pets: (data ?? []).map((p) => ({
            name: p.name,
            species: p.species,
            breed: p.breed,
            age: p.age,
            weight: p.weight,
          })),
        };
      },
    },
    {
      name: 'pets_create',
      description:
        'Registra una nueva mascota del usuario. Usar cuando pida agregar/crear/registrar una mascota.',
      keywords: [
        'crear mascota',
        'crea mascota',
        'agregar mascota',
        'agrega mascota',
        'registrar mascota',
        'nueva mascota',
        'nuevo perro',
        'nuevo gato',
      ],
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nombre de la mascota' },
          species: { type: 'string', description: 'perro, gato, etc.' },
          breed: { type: 'string' },
          age: { type: 'number', description: 'Edad en años' },
          weight: { type: 'number', description: 'Peso en kg' },
          microchip: { type: 'string' },
          available_for_breeding: { type: 'boolean' },
        },
        required: ['name'],
        additionalProperties: false,
      },
      execute: async (
        params: {
          name: string;
          species?: string;
          breed?: string;
          age?: number;
          weight?: number;
          microchip?: string;
          available_for_breeding?: boolean;
        },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) return { error: 'Usuario no autenticado' };

        const { data, error } = await supabase
          .from('pets')
          .insert({
            owner_id: ctx.userId,
            name: params.name.trim(),
            species: resolveSpecies(params.species),
            breed: params.breed?.trim() || null,
            age: params.age ?? null,
            weight: params.weight ?? null,
            microchip: params.microchip?.trim() || null,
            available_for_breeding: params.available_for_breeding ?? false,
          })
          .select('id, name, species, breed, age, weight')
          .single();

        if (error) throw error;

        return {
          success: true,
          pet: data,
          message: `Mascota ${data.name} registrada. Puedes completar fotos en Ajustes.`,
          actionPath: '/ajustes',
        };
      },
    },
    {
      name: 'pets_update',
      description: 'Edita datos de una mascota existente del usuario (nombre, raza, edad, peso, cría).',
      keywords: [
        'editar mascota',
        'edita mascota',
        'actualizar mascota',
        'modificar mascota',
        'cambiar raza',
        'cambiar peso',
        'cambiar edad',
      ],
      parameters: {
        type: 'object',
        properties: {
          pet_name: { type: 'string', description: 'Mascota a editar' },
          name: { type: 'string' },
          species: { type: 'string' },
          breed: { type: 'string' },
          age: { type: 'number' },
          weight: { type: 'number' },
          microchip: { type: 'string' },
          available_for_breeding: { type: 'boolean' },
        },
        required: ['pet_name'],
        additionalProperties: false,
      },
      execute: async (
        params: {
          pet_name: string;
          name?: string;
          species?: string;
          breed?: string;
          age?: number;
          weight?: number;
          microchip?: string;
          available_for_breeding?: boolean;
        },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) return { error: 'Usuario no autenticado' };

        const pets = await loadUserPets(ctx);
        const pet = matchPetByName(pets, params.pet_name);
        if (!pet) {
          return {
            error: 'PET_NOT_FOUND',
            message: `No encontré a ${params.pet_name}. Tus mascotas: ${pets.map((p) => p.name).join(', ') || 'ninguna'}.`,
            pets: pets.map((p) => p.name),
          };
        }

        const updates: Record<string, unknown> = {};
        if (params.name?.trim()) updates.name = params.name.trim();
        if (params.species) updates.species = resolveSpecies(params.species);
        if (params.breed !== undefined) updates.breed = params.breed?.trim() || null;
        if (params.age !== undefined) updates.age = params.age;
        if (params.weight !== undefined) updates.weight = params.weight;
        if (params.microchip !== undefined) updates.microchip = params.microchip?.trim() || null;
        if (params.available_for_breeding !== undefined) {
          updates.available_for_breeding = params.available_for_breeding;
        }

        if (Object.keys(updates).length === 0) {
          return {
            error: 'FIELDS_REQUIRED',
            message: 'Indica qué campo quieres cambiar: raza, edad, peso, etc.',
          };
        }

        const { data, error } = await supabase
          .from('pets')
          .update(updates)
          .eq('id', pet.id)
          .eq('owner_id', ctx.userId)
          .select('id, name, species, breed, age, weight, available_for_breeding')
          .single();

        if (error) throw error;

        return {
          success: true,
          pet: data,
          message: `Datos de ${data.name} actualizados.`,
        };
      },
    },
  ],
};

export const sheltersModule: AiModuleDefinition = {
  id: 'shelters',
  name: 'Albergues',
  description: 'Albergues y refugios registrados en la plataforma',
  basePath: '/adopcion',
  tools: [
    {
      name: 'shelters_list',
      description: 'Lista albergues con nombre, ubicación y contacto.',
      keywords: ['albergue', 'albergues', 'refugio', 'refugios', 'shelter'],
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Buscar por nombre o ubicación' },
          limit: { type: 'number', description: 'Máximo de resultados' },
        },
        additionalProperties: false,
      },
      execute: async (params: { query?: string; limit?: number }) => {
        const limit = params.limit ?? 10;
        let query = supabase
          .from('shelters')
          .select('id, name, location, phone, email, description')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (params.query) {
          const q = params.query.trim();
          query = query.or(`name.ilike.%${q}%,location.ilike.%${q}%,description.ilike.%${q}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        return {
          total: data?.length ?? 0,
          shelters: (data ?? []).map((s) => ({
            name: s.name,
            location: s.location,
            phone: s.phone,
            email: s.email,
          })),
        };
      },
    },
  ],
};

export const ordersModule: AiModuleDefinition = {
  id: 'orders',
  name: 'Órdenes',
  description: 'Historial de pedidos y reservas del usuario',
  basePath: '/client-orders',
  tools: [
    {
      name: 'orders_list_mine',
      description: 'Lista pedidos recientes del usuario con estado y total.',
      keywords: ['mis ordenes', 'mis órdenes', 'pedidos', 'compras', 'historial', 'reservas'],
      parameters: { type: 'object', properties: { limit: { type: 'number', description: 'Máximo' } }, additionalProperties: false },
      execute: async (params: { limit?: number }, ctx: AiExecutionContext) => {
        if (!ctx.userId) {
          return { error: 'Usuario no autenticado', orders: [] };
        }

        const limit = params.limit ?? 5;
        const { data, error } = await supabase
          .from('orders')
          .select('id, order_number, status, grand_total, currency, created_at, order_items(item_name, quantity, total_price)')
          .eq('client_id', ctx.userId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;

        return {
          total: data?.length ?? 0,
          orders: (data ?? []).map((o) => ({
            number: o.order_number,
            status: o.status,
            total: o.grand_total,
            currency: o.currency,
            date: o.created_at,
            items: (o.order_items as { item_name: string; quantity: number }[])?.map((i) => i.item_name),
          })),
        };
      },
    },
    {
      name: 'orders_track',
      description:
        'Rastrea el estado de un pedido o las citas de servicio vinculadas. Usar cuando pregunte dónde está mi pedido, seguimiento, estado de la orden o reserva.',
      keywords: [
        'rastrear',
        'seguimiento',
        'estado del pedido',
        'estado de mi pedido',
        'dónde está mi pedido',
        'donde esta mi pedido',
        'estado de la orden',
        'seguir mi pedido',
        'mi reserva',
      ],
      parameters: {
        type: 'object',
        properties: {
          order_number: { type: 'string', description: 'Número de pedido (opcional — usa el más reciente activo)' },
        },
        additionalProperties: false,
      },
      execute: async (params: { order_number?: string }, ctx: AiExecutionContext) => {
        if (!ctx.userId) {
          return { error: 'AUTH_REQUIRED', message: 'Debes iniciar sesión para rastrear pedidos.' };
        }

        const orderSelect =
          'id, order_number, status, grand_total, currency, created_at, updated_at, order_items(id, item_name, quantity, item_type, total_price)';

        let order: Record<string, unknown> | null = null;
        if (params.order_number?.trim()) {
          const { data, error } = await supabase
            .from('orders')
            .select(orderSelect)
            .eq('client_id', ctx.userId)
            .ilike('order_number', `%${params.order_number.trim()}%`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (error) throw error;
          order = data as Record<string, unknown> | null;
        } else {
          const { data, error } = await supabase
            .from('orders')
            .select(orderSelect)
            .eq('client_id', ctx.userId)
            .not('status', 'in', '("completed","cancelled","delivered")')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (error) throw error;
          order = (data as Record<string, unknown> | null) ?? null;
          if (!order) {
            const { data: latest, error: latestErr } = await supabase
              .from('orders')
              .select(orderSelect)
              .eq('client_id', ctx.userId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (latestErr) throw latestErr;
            order = latest as Record<string, unknown> | null;
          }
        }

        if (!order) {
          return {
            error: 'NOT_FOUND',
            message: params.order_number
              ? `No encontré el pedido "${params.order_number}".`
              : 'No tienes pedidos para rastrear.',
            actionPath: '/client-orders',
          };
        }

        const orderId = order.id as string;
        const { data: appointments, error: apptError } = await supabase
          .from('service_appointments')
          .select(
            'appointment_date, appointment_time, status, total_price, currency, provider_services(service_name)',
          )
          .eq('client_id', ctx.userId)
          .eq('order_id', orderId)
          .order('appointment_date', { ascending: true });
        if (apptError) throw apptError;

        const items = (order.order_items as Array<Record<string, unknown>>) ?? [];

        return {
          order: {
            number: order.order_number,
            status: order.status,
            total: order.grand_total,
            currency: order.currency,
            created_at: order.created_at,
            updated_at: order.updated_at,
            items: items.map((i) => ({
              name: i.item_name,
              quantity: i.quantity,
              type: i.item_type,
              total: i.total_price,
            })),
          },
          service_appointments: (appointments ?? []).map((a) => ({
            date: a.appointment_date,
            time: a.appointment_time ? String(a.appointment_time).slice(0, 5) : null,
            service: (a.provider_services as { service_name?: string } | null)?.service_name,
            status: a.status,
            price: a.total_price,
            currency: a.currency,
          })),
          actionPath: '/client-orders',
        };
      },
    },
  ],
};

export const breedingModule: AiModuleDefinition = {
  id: 'breeding',
  name: 'Parejas',
  description: 'Mascotas disponibles para cruza, activar cría y enviar solicitudes de pareja',
  basePath: '/parejas',
  tools: [
    {
      name: 'breeding_count_available',
      description: 'Cuenta mascotas disponibles para parejas/cruza.',
      keywords: ['parejas', 'cruza', 'reproduccion', 'reproducción', 'macho', 'hembra', 'tinder'],
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      execute: async () => {
        const { count, error } = await supabase
          .from('pets')
          .select('id', { count: 'exact', head: true })
          .eq('available_for_breeding', true);
        if (error) {
          // Column may not exist on all deployments
          return { total: 0, note: 'Datos de parejas no disponibles' };
        }
        return { total: count ?? 0 };
      },
    },
    {
      name: 'breeding_list_available',
      description: 'Lista mascotas de otros usuarios disponibles para parejas/cruza.',
      keywords: ['parejas disponibles', 'mascotas para cruza', 'buscar pareja', 'ver parejas', 'cruza disponible'],
      parameters: {
        type: 'object',
        properties: {
          species: { type: 'string' },
          limit: { type: 'number' },
        },
        additionalProperties: false,
      },
      execute: async (params: { species?: string; limit?: number }, ctx: AiExecutionContext) => {
        if (!ctx.userId) return { error: 'Usuario no autenticado', pets: [] };

        const limit = params.limit ?? 10;
        let query = supabase
          .from('pets')
          .select('id, name, species, breed, age, owner_id')
          .eq('available_for_breeding', true)
          .neq('owner_id', ctx.userId)
          .limit(limit);

        const species = resolveSpecies(params.species);
        if (params.species) query = query.eq('species', species);

        const { data, error } = await query;
        if (error) {
          return { total: 0, pets: [], note: 'Datos de parejas no disponibles' };
        }

        return {
          total: data?.length ?? 0,
          pets: (data ?? []).map((p) => ({
            name: p.name,
            species: p.species,
            breed: p.breed,
            age: p.age,
          })),
        };
      },
    },
    {
      name: 'breeding_enable_pet',
      description: 'Marca una mascota del usuario como disponible para reproducción/parejas.',
      keywords: [
        'activar cruza',
        'disponible para parejas',
        'buscar pareja para',
        'poner en parejas',
        'habilitar reproducción',
      ],
      parameters: {
        type: 'object',
        properties: {
          pet_name: { type: 'string' },
          available: { type: 'boolean', description: 'true para activar, false para desactivar' },
        },
        required: ['pet_name'],
        additionalProperties: false,
      },
      execute: async (
        params: { pet_name: string; available?: boolean },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) return { error: 'Usuario no autenticado' };

        const pets = await loadUserPets(ctx);
        const pet = matchPetByName(pets, params.pet_name);
        if (!pet) {
          return {
            error: 'PET_NOT_FOUND',
            message: `No encontré a ${params.pet_name}.`,
            pets: pets.map((p) => p.name),
          };
        }

        const available = params.available !== false;
        const { error } = await supabase
          .from('pets')
          .update({ available_for_breeding: available })
          .eq('id', pet.id)
          .eq('owner_id', ctx.userId);

        if (error) throw error;

        return {
          success: true,
          pet_name: pet.name,
          available_for_breeding: available,
          message: available
            ? `${pet.name} ahora está disponible para parejas.`
            : `${pet.name} ya no está disponible para parejas.`,
        };
      },
    },
    {
      name: 'breeding_send_request',
      description:
        'Envía solicitud de pareja/cruza desde una mascota del usuario hacia otra mascota disponible.',
      keywords: [
        'enviar solicitud de pareja',
        'solicitud de amor',
        'quiero cruza con',
        'emparejar con',
        'match de pareja',
      ],
      parameters: {
        type: 'object',
        properties: {
          my_pet_name: { type: 'string', description: 'Tu mascota' },
          target_pet_name: { type: 'string', description: 'Mascota objetivo' },
        },
        required: ['target_pet_name'],
        additionalProperties: false,
      },
      execute: async (
        params: { my_pet_name?: string; target_pet_name: string },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) return { error: 'Usuario no autenticado' };

        const breedingPets = (
          await supabase
            .from('pets')
            .select('id, name, owner_id, available_for_breeding')
            .eq('owner_id', ctx.userId)
        ).data?.filter((p) => p.available_for_breeding) ?? [];

        if (breedingPets.length === 0) {
          return {
            error: 'NO_BREEDING_PETS',
            message: 'Primero activa al menos una mascota para parejas.',
            actionPath: '/parejas',
          };
        }

        const myPet =
          (params.my_pet_name
            ? breedingPets.find((p) => p.name.toLowerCase() === params.my_pet_name!.toLowerCase().trim())
            : undefined) ?? (breedingPets.length === 1 ? breedingPets[0] : undefined);

        if (!myPet) {
          return {
            error: 'MY_PET_REQUIRED',
            message: `¿Con cuál de tus mascotas envías la solicitud? Disponibles: ${breedingPets.map((p) => p.name).join(', ')}.`,
            pets: breedingPets.map((p) => p.name),
          };
        }

        const { data: targets, error: targetError } = await supabase
          .from('pets')
          .select('id, name, owner_id, available_for_breeding')
          .eq('available_for_breeding', true)
          .neq('owner_id', ctx.userId)
          .ilike('name', `%${params.target_pet_name.trim()}%`)
          .limit(5);

        if (targetError) throw targetError;
        const target = targets?.[0];
        if (!target) {
          return {
            error: 'TARGET_NOT_FOUND',
            message: `No encontré una mascota disponible llamada "${params.target_pet_name}".`,
          };
        }

        const { error } = await supabase.from('breeding_matches').insert({
          pet_id: myPet.id,
          potential_partner_id: target.id,
          owner_id: ctx.userId,
          partner_owner_id: target.owner_id,
          status: 'pending',
        });

        if (error) {
          if (error.code === '23505') {
            return {
              error: 'DUPLICATE',
              message: `Ya enviaste una solicitud de pareja a ${target.name}.`,
            };
          }
          throw error;
        }

        return {
          success: true,
          my_pet: myPet.name,
          target_pet: target.name,
          message: `Solicitud de pareja enviada de ${myPet.name} a ${target.name}.`,
          actionPath: '/parejas',
        };
      },
    },
  ],
};
