import { differenceInDays, format, parseISO, subDays } from 'date-fns';
import { supabase } from '@/lib/supabase';
import type { PetDataGraph } from './petDataGraph';

export type PetInsightSeverity = 'high' | 'medium' | 'low' | 'info';
export type PetInsightCategory =
  | 'nutrition'
  | 'exercise'
  | 'veterinary'
  | 'vaccination'
  | 'reminder'
  | 'correlation'
  | 'document';

export interface PetInsight {
  id: string;
  category: PetInsightCategory;
  severity: PetInsightSeverity;
  message: string;
  recommendation?: string;
}

function nutritionDroppedAfterVetVisit(
  petId: string,
  ownerId: string,
  lastVetDate: string,
): Promise<{ before: number; after: number } | null> {
  const vetDate = parseISO(lastVetDate);
  const beforeStart = format(subDays(vetDate, 7), 'yyyy-MM-dd');
  const beforeEnd = lastVetDate;
  const afterStart = lastVetDate;
  const afterEnd = format(subDays(vetDate, -7), 'yyyy-MM-dd');

  return Promise.all([
    supabase
      .from('nutrition_sessions')
      .select('total_calories')
      .eq('owner_id', ownerId)
      .eq('pet_id', petId)
      .gte('date', beforeStart)
      .lt('date', beforeEnd),
    supabase
      .from('nutrition_sessions')
      .select('total_calories')
      .eq('owner_id', ownerId)
      .eq('pet_id', petId)
      .gte('date', afterStart)
      .lte('date', afterEnd),
  ]).then(([beforeRes, afterRes]) => {
    const sum = (rows: { total_calories: number | null }[] | null) =>
      (rows ?? []).reduce((s, r) => s + (Number(r.total_calories) || 0), 0);
    const before = sum(beforeRes.data);
    const after = sum(afterRes.data);
    if (before === 0 && after === 0) return null;
    return { before, after };
  });
}

function hasReminderForVaccine(
  reminders: Array<Record<string, unknown>>,
  vaccineName: string,
): boolean {
  const lower = vaccineName.toLowerCase();
  return reminders.some((r) => {
    const title = String(r.title ?? '').toLowerCase();
    const type = String(r.type ?? '').toLowerCase();
    return type === 'vet' || title.includes('vacuna') || title.includes(lower);
  });
}

/** Rule-based insight detectors across nutrition, exercise, vet and documents. */
export async function generatePetInsights(
  graph: PetDataGraph,
  ownerId: string,
): Promise<PetInsight[]> {
  const insights: PetInsight[] = [];
  const petName = graph.pet.name;
  const health = graph.health;
  const nutrition = health.nutrition as Record<string, unknown>;
  const calories = nutrition.calories as Record<string, unknown> | undefined;
  const exercise = health.exercise as Record<string, unknown>;
  const veterinary = health.veterinary as Record<string, unknown>;
  const vaccinations = health.vaccinations as Record<string, unknown>;
  const reminders = health.upcoming_reminders;
  const lastVisit = veterinary.last_visit as Record<string, unknown> | null;
  const comparison = graph.trends_30d.comparison;

  const calCompliance = calories?.compliance_pct as number | null;
  if (calCompliance != null && calCompliance < 70) {
    insights.push({
      id: 'low_calorie_compliance',
      category: 'nutrition',
      severity: calCompliance < 50 ? 'high' : 'medium',
      message: `La ingesta calórica de **${petName}** está al ${calCompliance}% del objetivo este mes.`,
      recommendation: 'Revisa si faltan comidas por registrar o ajusta el horario de alimentación.',
    });
  }

  if (calCompliance != null && calCompliance > 130) {
    insights.push({
      id: 'high_calorie_compliance',
      category: 'nutrition',
      severity: 'medium',
      message: `**${petName}** supera el objetivo calórico (${calCompliance}% este mes).`,
      recommendation: 'Considera revisar porciones o aumentar actividad física.',
    });
  }

  const exerciseMinutes = (exercise.total_minutes as number) ?? 0;
  const exerciseSessions = (exercise.sessions_count as number) ?? 0;
  if (exerciseSessions === 0 && graph.period_days >= 7) {
    insights.push({
      id: 'no_exercise',
      category: 'exercise',
      severity: 'medium',
      message: `**${petName}** no tiene ejercicio registrado en los últimos ${graph.period_days} días.`,
      recommendation: 'Registra paseos o actividad para un mejor seguimiento.',
    });
  } else if (exerciseMinutes > 0 && exerciseMinutes < 60 && graph.period_days >= 7) {
    insights.push({
      id: 'low_exercise',
      category: 'exercise',
      severity: 'low',
      message: `**${petName}** acumula solo ${exerciseMinutes} min de ejercicio en ${graph.period_days} días (objetivo semanal: 150 min).`,
      recommendation: 'Intenta aumentar la frecuencia de paseos o juegos.',
    });
  }

  if (
    comparison.exercise_change_pct != null &&
    comparison.exercise_change_pct < -40 &&
    comparison.exercise_minutes_previous_week > 30
  ) {
    insights.push({
      id: 'exercise_drop',
      category: 'exercise',
      severity: 'medium',
      message: `El ejercicio de **${petName}** bajó ${Math.abs(comparison.exercise_change_pct)}% respecto a la semana anterior.`,
      recommendation: '¿Hubo algún cambio de rutina? Vale la pena retomar la actividad.',
    });
  }

  if (
    comparison.calories_change_pct != null &&
    comparison.calories_change_pct < -40 &&
    comparison.calories_previous_week > 500
  ) {
    insights.push({
      id: 'nutrition_week_drop',
      category: 'nutrition',
      severity: 'medium',
      message: `Las calorías registradas de **${petName}** bajaron ${Math.abs(comparison.calories_change_pct)}% esta semana vs la anterior.`,
      recommendation: 'Verifica si hay comidas sin registrar o cambios en el apetito.',
    });
  }

  const overdue = (vaccinations.overdue as Array<Record<string, unknown>>) ?? [];
  for (const v of overdue) {
    const vaccineName = String(v.vaccine_name ?? 'vacuna');
    if (!hasReminderForVaccine(reminders, vaccineName)) {
      insights.push({
        id: `vaccine_overdue_no_reminder_${vaccineName.replace(/\s+/g, '_')}`,
        category: 'vaccination',
        severity: 'high',
        message: `**${petName}** tiene la vacuna **${vaccine_name}** vencida y no hay recordatorio programado.`,
        recommendation: 'Agenda una cita veterinaria y crea un recordatorio en PetHub.',
      });
    } else {
      insights.push({
        id: `vaccine_overdue_${vaccineName.replace(/\s+/g, '_')}`,
        category: 'vaccination',
        severity: 'high',
        message: `**${petName}** tiene la vacuna **${vaccineName}** vencida.`,
        recommendation: 'Programa la aplicación con tu veterinario.',
      });
    }
  }

  const dueSoon = (vaccinations.due_soon as Array<Record<string, unknown>>) ?? [];
  if (dueSoon.length > 0 && overdue.length === 0) {
    insights.push({
      id: 'vaccines_due_soon',
      category: 'vaccination',
      severity: 'low',
      message: `**${petName}** tiene vacunas próximas: ${dueSoon.map((v) => v.vaccine_name).join(', ')}.`,
      recommendation: 'Anticípate y agenda la cita antes de que venzan.',
    });
  }

  const pendingFollowUps = (veterinary.pending_follow_ups as unknown[]) ?? [];
  if (pendingFollowUps.length > 0) {
    insights.push({
      id: 'pending_vet_followup',
      category: 'veterinary',
      severity: 'medium',
      message: `**${petName}** tiene ${pendingFollowUps.length} seguimiento(s) veterinario(s) pendiente(s).`,
      recommendation: 'Revisa las fechas de seguimiento en el historial veterinario.',
    });
  }

  const recentVisits = (veterinary.recent_visits as Array<Record<string, unknown>>) ?? [];
  const diagnosisCounts = new Map<string, number>();
  const sixMonthsAgo = subDays(new Date(), 180);
  for (const visit of recentVisits) {
    const diag = String(visit.diagnosis ?? '').trim().toLowerCase();
    const visitDate = visit.date ? parseISO(String(visit.date)) : null;
    if (!diag || !visitDate || visitDate < sixMonthsAgo) continue;
    diagnosisCounts.set(diag, (diagnosisCounts.get(diag) ?? 0) + 1);
  }
  for (const [diag, count] of diagnosisCounts) {
    if (count >= 2) {
      insights.push({
        id: `recurring_diagnosis_${diag.slice(0, 20)}`,
        category: 'veterinary',
        severity: 'medium',
        message: `**${petName}** tuvo ${count} visitas por "${diag}" en los últimos 6 meses.`,
        recommendation: 'Podría valer la pena consultar con un especialista o revisar el tratamiento.',
      });
    }
  }

  if (lastVisit?.date) {
    const drop = await nutritionDroppedAfterVetVisit(
      graph.pet.id,
      ownerId,
      String(lastVisit.date),
    );
    if (drop && drop.before > 0 && drop.after < drop.before * 0.6) {
      const pctDrop = Math.round((1 - drop.after / drop.before) * 100);
      insights.push({
        id: 'nutrition_drop_after_vet',
        category: 'correlation',
        severity: 'medium',
        message: `Tras la visita del ${lastVisit.date}, la ingesta de **${petName}** bajó ~${pctDrop}% en la semana siguiente.`,
        recommendation:
          'Es común tras procedimientos o medicación. Monitorea el apetito; consulta al vet si persiste.',
      });
    }
  }

  const hasActiveSchedules = Boolean(nutrition.has_active_schedules);
  const mealsLogged = (nutrition.meals_logged as number) ?? 0;
  if (hasActiveSchedules && mealsLogged === 0) {
    insights.push({
      id: 'schedules_no_meals',
      category: 'nutrition',
      severity: 'low',
      message: `**${petName}** tiene horarios de alimentación activos pero ninguna comida registrada este mes.`,
      recommendation: 'Registra las comidas o revisa si los horarios automáticos están funcionando.',
    });
  }

  for (const doc of graph.documents) {
    if (doc.parse_status !== 'completed') continue;
    const docLabel = doc.document_type === 'invoice' ? 'factura' : 'resultados de laboratorio';
    const hasVetReminder = reminders.some(
      (r) => String(r.type) === 'vet' || String(r.title).toLowerCase().includes('seguimiento'),
    );
    if (!hasVetReminder && doc.parsed_at) {
      const daysSince = differenceInDays(new Date(), parseISO(doc.parsed_at));
      if (daysSince <= 30) {
        insights.push({
          id: `document_no_followup_${doc.session_id}`,
          category: 'document',
          severity: 'low',
          message: `Se analizó una ${docLabel} de **${petName}** hace ${daysSince} días sin recordatorio de seguimiento.`,
          recommendation: doc.summary
            ? `Resumen del documento: ${doc.summary.slice(0, 120)}${doc.summary.length > 120 ? '…' : ''}`
            : 'Considera crear un recordatorio veterinario si hay pendientes.',
        });
      }
    }
  }

  const severityOrder: Record<PetInsightSeverity, number> = {
    high: 0,
    medium: 1,
    low: 2,
    info: 3,
  };

  return insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
