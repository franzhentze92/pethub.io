import { format, addDays } from 'date-fns';
import type { AiExecutionContext, AiModuleDefinition } from '../types';
import {
  findServiceByQuery,
  getAvailableSlotsForService,
  searchAvailabilityNextDays,
} from '../helpers/bookingAvailability';
import { resolveServiceBookingCart } from '../helpers/cartActions';

export const bookingsModule: AiModuleDefinition = {
  id: 'bookings',
  name: 'Reservas',
  description: 'Disponibilidad y reserva de servicios del marketplace',
  basePath: '/marketplace/services',
  tools: [
    {
      name: 'bookings_search_availability',
      description:
        'Consulta horarios disponibles para reservar un SERVICIO del marketplace (grooming, veterinaria, entrenamiento, etc.). Usar cuando pregunte cuándo puede agendar, horarios libres, disponibilidad de citas.',
      keywords: [
        'disponibilidad',
        'horarios disponibles',
        'cuándo puedo agendar',
        'cuando puedo agendar',
        'cita disponible',
        'reservar para',
        'agendar para',
        'qué horarios hay',
        'que horarios hay',
      ],
      parameters: {
        type: 'object',
        properties: {
          service_name: { type: 'string', description: 'Nombre del servicio a reservar' },
          date: { type: 'string', description: 'Fecha YYYY-MM-DD. Opcional — busca próximos 7 días si falta.' },
          days: { type: 'number', description: 'Días a buscar si no hay fecha (default 7)' },
        },
        required: ['service_name'],
        additionalProperties: false,
      },
      execute: async (
        params: { service_name: string; date?: string; days?: number },
        _ctx: AiExecutionContext,
      ) => {
        const service = await findServiceByQuery(params.service_name);
        if (!service) {
          return {
            error: 'NOT_FOUND',
            message: `No encontré el servicio "${params.service_name}" en el marketplace.`,
          };
        }

        if (params.date) {
          const slots = await getAvailableSlotsForService(service, params.date);
          return {
            service: {
              name: service.service_name,
              provider: service.providers?.business_name,
              price: service.price,
              currency: service.currency,
              duration_minutes: service.duration_minutes,
            },
            date: params.date,
            slots,
            actionPath: '/marketplace/services',
          };
        }

        const days = Math.min(params.days ?? 7, 14);
        const schedule = await searchAvailabilityNextDays(service, format(new Date(), 'yyyy-MM-dd'), days);

        return {
          service: {
            name: service.service_name,
            provider: service.providers?.business_name,
            price: service.price,
            currency: service.currency,
          },
          days_searched: days,
          availability: schedule,
          actionPath: '/marketplace/services',
        };
      },
    },
    {
      name: 'bookings_add_to_cart',
      description:
        'Agrega una reserva de servicio al carrito con fecha y hora. Requiere confirmación. Usar cuando el usuario quiera reservar/agendar un servicio con fecha y hora concretas.',
      keywords: [
        'reservar',
        'agendar cita',
        'agendar servicio',
        'quiero la cita',
        'ponlo en el carrito',
        'añadir al carrito',
        'agregar al carrito',
      ],
      parameters: {
        type: 'object',
        properties: {
          service_name: { type: 'string', description: 'Nombre del servicio' },
          date: { type: 'string', description: 'Fecha YYYY-MM-DD' },
          time: { type: 'string', description: 'Hora HH:MM (24h)' },
          notes: { type: 'string', description: 'Notas opcionales' },
        },
        required: ['service_name', 'date', 'time'],
        additionalProperties: false,
      },
      execute: async (
        params: { service_name: string; date: string; time: string; notes?: string },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) {
          return { error: 'AUTH_REQUIRED', message: 'Debes iniciar sesión para reservar.' };
        }

        const result = await resolveServiceBookingCart(params, ctx);
        if ('error' in result) {
          return { error: 'BOOKING_FAILED', message: result.error };
        }

        return {
          success: true,
          cart_action: { action: 'add', item: result.cartItem },
          message: `Reserva lista para agregar al carrito.`,
        };
      },
    },
  ],
};
