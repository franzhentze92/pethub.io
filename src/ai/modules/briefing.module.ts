import { format, addDays } from 'date-fns';
import { supabase } from '@/lib/supabase';
import type { AiExecutionContext, AiModuleDefinition } from '../types';
import { loadUserPets } from '../helpers/petResolver';
import { buildPetDataGraph } from '../helpers/petDataGraph';

export const briefingModule: AiModuleDefinition = {
  id: 'briefing',
  name: 'Briefing diario',
  description: 'Resumen proactivo del día: salud, citas, pedidos y alertas',
  tools: [
    {
      name: 'pet_briefing',
      description:
        'Genera un briefing diario personalizado: salud de mascotas, insights, citas de servicios próximas, pedidos recientes y recordatorios. Usar cuando pregunte "qué tengo hoy", "resumen del día", "briefing", "qué debo saber hoy", "mi día con mis mascotas".',
      keywords: [
        'briefing',
        'resumen del día',
        'resumen del dia',
        'qué tengo hoy',
        'que tengo hoy',
        'qué debo saber hoy',
        'que debo saber hoy',
        'mi día',
        'mi dia',
        'hoy con mis mascotas',
        'plan del día',
        'plan del dia',
      ],
      parameters: {
        type: 'object',
        properties: {
          days_ahead: {
            type: 'number',
            description: 'Días hacia adelante para citas y recordatorios (default 7)',
          },
        },
        additionalProperties: false,
      },
      execute: async (params: { days_ahead?: number }, ctx: AiExecutionContext) => {
        if (!ctx.userId) {
          return { error: 'AUTH_REQUIRED', message: 'Debes iniciar sesión.' };
        }

        const daysAhead = Math.min(Math.max(params.days_ahead ?? 7, 1), 30);
        const today = format(new Date(), 'yyyy-MM-dd');
        const until = format(addDays(new Date(), daysAhead), 'yyyy-MM-dd');

        const pets = await loadUserPets(ctx);
        if (pets.length === 0) {
          return {
            error: 'NO_PETS',
            message: 'No tienes mascotas registradas. Agrega una en Ajustes para tu briefing.',
            actionPath: '/ajustes',
          };
        }

        const [graphs, appointmentsRes, ordersRes, remindersRes] = await Promise.all([
          Promise.all(
            pets.map((pet) =>
              buildPetDataGraph(
                { id: pet.id, name: pet.name, species: pet.species, weight: pet.weight },
                ctx.userId!,
                { daysBack: 7, includeTimeline: false, includeInsights: true },
              ),
            ),
          ),
          supabase
            .from('service_appointments')
            .select(
              'appointment_date, appointment_time, status, total_price, currency, provider_services(service_name)',
            )
            .eq('client_id', ctx.userId)
            .gte('appointment_date', today)
            .lte('appointment_date', until)
            .in('status', ['pending', 'confirmed'])
            .order('appointment_date', { ascending: true })
            .limit(10),
          supabase
            .from('orders')
            .select('order_number, status, grand_total, currency, created_at')
            .eq('client_id', ctx.userId)
            .order('created_at', { ascending: false })
            .limit(3),
          supabase
            .from('pet_reminders')
            .select('title, scheduled_date, scheduled_time, pet_id, pets(name)')
            .eq('owner_id', ctx.userId)
            .eq('is_active', true)
            .eq('is_completed', false)
            .gte('scheduled_date', today)
            .lte('scheduled_date', until)
            .order('scheduled_date', { ascending: true })
            .limit(8),
        ]);

        const petSections = graphs.map((graph) => {
          const topInsights = graph.insights.slice(0, 3);
          const exercise = graph.health.exercise as Record<string, unknown>;
          const nutrition = graph.health.nutrition as Record<string, unknown>;
          return {
            pet_name: graph.pet.name,
            exercise_minutes_7d: exercise.total_minutes ?? 0,
            meals_this_month: nutrition.meals_logged ?? 0,
            insights: topInsights.map((i) => ({
              severity: i.severity,
              message: i.message,
            })),
            insight_count: graph.insights.length,
          };
        });

        const appointments = (appointmentsRes.data ?? []).map((a) => ({
          date: a.appointment_date,
          time: a.appointment_time ? String(a.appointment_time).slice(0, 5) : null,
          service: (a.provider_services as { service_name?: string } | null)?.service_name,
          status: a.status,
          price: a.total_price,
          currency: a.currency,
        }));

        const orders = (ordersRes.data ?? []).map((o) => ({
          number: o.order_number,
          status: o.status,
          total: o.grand_total,
          currency: o.currency,
          date: o.created_at,
        }));

        const reminders = (remindersRes.data ?? []).map((r) => ({
          title: r.title,
          date: r.scheduled_date,
          time: r.scheduled_time ? String(r.scheduled_time).slice(0, 5) : null,
          pet: (r.pets as { name?: string } | null)?.name,
        }));

        const totalAlerts = petSections.reduce((s, p) => s + p.insight_count, 0);

        return {
          date: today,
          days_ahead: daysAhead,
          pets: petSections,
          upcoming_appointments: appointments,
          recent_orders: orders,
          upcoming_reminders: reminders,
          total_alerts: totalAlerts,
          disclaimer: 'Briefing basado en datos de PetHub. No sustituye consejo veterinario.',
          actionPath: '/health-journal',
        };
      },
    },
  ],
};
