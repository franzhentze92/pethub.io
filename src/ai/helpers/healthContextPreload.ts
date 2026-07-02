import { format, subDays } from 'date-fns';
import { supabase } from '@/lib/supabase';
import {
  computeVaccinationStatus,
} from '@/lib/vaccinationCatalog';
import type { AiExecutionContext } from '../types';
import { loadUserPets } from './petResolver';

const HEALTH_PATHS = new Set(['/health-journal', '/veterinaria', '/recordatorios']);

export function shouldPreloadHealthContext(ctx: AiExecutionContext): boolean {
  return Boolean(ctx.userId && ctx.currentPath && HEALTH_PATHS.has(ctx.currentPath));
}

/**
 * Lightweight health snapshot injected into the system prompt when the user
 * is on a health-related page — avoids extra tool calls for common context.
 */
export async function preloadHealthContext(ctx: AiExecutionContext): Promise<string | undefined> {
  if (!shouldPreloadHealthContext(ctx) || !ctx.userId) return undefined;

  try {
    const pets = await loadUserPets(ctx);
    if (pets.length === 0) return undefined;

    const petIds = pets.map((p) => p.id);
    const since7 = format(subDays(new Date(), 7), 'yyyy-MM-dd');
    const monthStart = format(new Date(), 'yyyy-MM-01');

    const [vetRes, vaccRes, nutritionRes, exerciseRes, remindersRes] = await Promise.all([
      supabase
        .from('veterinary_sessions')
        .select('pet_id, date, appointment_type')
        .eq('owner_id', ctx.userId)
        .in('pet_id', petIds)
        .order('date', { ascending: false })
        .limit(petIds.length * 2),
      supabase
        .from('pet_vaccinations')
        .select('pet_id, vaccine_name, next_due_date')
        .eq('owner_id', ctx.userId)
        .in('pet_id', petIds),
      supabase
        .from('nutrition_sessions')
        .select('pet_id')
        .eq('owner_id', ctx.userId)
        .in('pet_id', petIds)
        .gte('date', monthStart),
      supabase
        .from('exercise_sessions')
        .select('pet_id, duration_minutes')
        .eq('owner_id', ctx.userId)
        .in('pet_id', petIds)
        .gte('date', since7),
      supabase
        .from('pet_reminders')
        .select('pet_id, title, scheduled_date')
        .eq('owner_id', ctx.userId)
        .in('pet_id', petIds)
        .eq('is_active', true)
        .eq('is_completed', false)
        .gte('scheduled_date', format(new Date(), 'yyyy-MM-dd'))
        .order('scheduled_date', { ascending: true })
        .limit(5),
    ]);

    const lines: string[] = ['CONTEXTO DE SALUD PRE-CARGADO (página actual):'];

    for (const pet of pets) {
      const petLines: string[] = [`• **${pet.name}**`];

      const lastVet = (vetRes.data ?? []).find((v) => v.pet_id === pet.id);
      if (lastVet) {
        petLines.push(`  Última visita vet: ${lastVet.date}`);
      } else {
        petLines.push('  Sin visitas veterinarias registradas');
      }

      const petVaccines = (vaccRes.data ?? []).filter((v) => v.pet_id === pet.id);
      const overdue = petVaccines.filter(
        (v) => v.next_due_date && computeVaccinationStatus(v.next_due_date) === 'overdue',
      );
      const dueSoon = petVaccines.filter(
        (v) => v.next_due_date && computeVaccinationStatus(v.next_due_date) === 'due_soon',
      );
      if (overdue.length > 0) {
        petLines.push(`  Vacunas vencidas: ${overdue.map((v) => v.vaccine_name).join(', ')}`);
      } else if (dueSoon.length > 0) {
        petLines.push(`  Vacunas próximas: ${dueSoon.map((v) => v.vaccine_name).join(', ')}`);
      }

      const mealsThisMonth = (nutritionRes.data ?? []).filter((n) => n.pet_id === pet.id).length;
      petLines.push(`  Comidas registradas este mes: ${mealsThisMonth}`);

      const exerciseRows = (exerciseRes.data ?? []).filter((e) => e.pet_id === pet.id);
      const exerciseMinutes = exerciseRows.reduce((s, e) => s + (e.duration_minutes ?? 0), 0);
      petLines.push(
        `  Ejercicio últimos 7 días: ${exerciseRows.length} sesiones, ${exerciseMinutes} min`,
      );

      lines.push(petLines.join('\n'));
    }

    const upcoming = remindersRes.data ?? [];
    if (upcoming.length > 0) {
      const petNameById = new Map(pets.map((p) => [p.id, p.name]));
      lines.push(
        'Próximos recordatorios:\n' +
          upcoming
            .map((r) => {
              const name = petNameById.get(r.pet_id) ?? 'Mascota';
              return `• ${name}: ${r.title} (${r.scheduled_date})`;
            })
            .join('\n'),
      );
    }

    lines.push(
      'Usa pet_health_summary para análisis integral, pet_timeline para cronología, pet_insights para patrones y pets_compare para comparar mascotas.',
    );

    return lines.join('\n');
  } catch (err) {
    console.warn('[PetBuddy] health context preload failed:', err);
    return undefined;
  }
}

export async function enrichContextWithHealthPreload(
  ctx: AiExecutionContext,
): Promise<AiExecutionContext> {
  if (!shouldPreloadHealthContext(ctx) || ctx.preloadedHealthContext) return ctx;
  const preloadedHealthContext = await preloadHealthContext(ctx);
  if (!preloadedHealthContext) return ctx;
  return { ...ctx, preloadedHealthContext };
}
