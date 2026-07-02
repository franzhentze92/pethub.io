import {
  format,
  parseISO,
  subMonths,
  startOfMonth,
  differenceInDays,
  eachDayOfInterval,
  subDays,
  isValid,
} from 'date-fns';
import { es } from 'date-fns/locale/es';
import { landingChartColors } from '@/lib/landingTheme';

export type JourneyEventType = 'product' | 'service' | 'veterinary' | 'exercise' | 'nutrition';

export interface JourneyEvent {
  id: string;
  type: JourneyEventType;
  title: string;
  description: string;
  date: string;
  cost: number;
  currency: string;
}

export interface JourneyStats {
  totalProducts: number;
  totalServices: number;
  totalVeterinaryVisits: number;
  totalExerciseSessions: number;
  totalNutritionSessions: number;
  totalCost: number;
  productsCost: number;
  servicesCost: number;
  veterinaryCost: number;
}

export interface ExpenseSlice {
  name: string;
  value: number;
  color: string;
  pct: number;
}

export interface MonthlySpending {
  month: string;
  monthKey: string;
  productos: number;
  servicios: number;
  veterinaria: number;
  total: number;
}

export interface ActivityDay {
  date: string;
  day: string;
  count: number;
  intensity: number;
}

export interface JourneyInsight {
  id: string;
  icon: 'trend' | 'heart' | 'spark' | 'alert' | 'star';
  title: string;
  description: string;
  accent: 'aqua' | 'mint' | 'mango' | 'tropical';
}

export interface CarePillar {
  id: string;
  label: string;
  active: boolean;
  count: number;
  color: string;
}

function safeParseDate(dateStr: string): Date | null {
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

export function computeExpenseBreakdown(stats: JourneyStats): ExpenseSlice[] {
  const slices: ExpenseSlice[] = [
    { name: 'Productos', value: stats.productsCost, color: landingChartColors.aqua, pct: 0 },
    { name: 'Servicios', value: stats.servicesCost, color: landingChartColors.mint, pct: 0 },
    { name: 'Veterinaria', value: stats.veterinaryCost, color: landingChartColors.mango, pct: 0 },
  ].filter((s) => s.value > 0);

  const total = slices.reduce((sum, s) => sum + s.value, 0);
  return slices.map((s) => ({
    ...s,
    pct: total > 0 ? Math.round((s.value / total) * 100) : 0,
  }));
}

export function computeMonthlySpending(events: JourneyEvent[], months = 6): MonthlySpending[] {
  const now = new Date();
  const buckets: MonthlySpending[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i));
    const monthKey = format(monthStart, 'yyyy-MM');
    buckets.push({
      month: format(monthStart, 'MMM', { locale: es }),
      monthKey,
      productos: 0,
      servicios: 0,
      veterinaria: 0,
      total: 0,
    });
  }

  events.forEach((event) => {
    if (event.cost <= 0) return;
    const d = safeParseDate(event.date);
    if (!d) return;
    const key = format(d, 'yyyy-MM');
    const bucket = buckets.find((b) => b.monthKey === key);
    if (!bucket) return;

    if (event.type === 'product') bucket.productos += event.cost;
    else if (event.type === 'service') bucket.servicios += event.cost;
    else if (event.type === 'veterinary') bucket.veterinaria += event.cost;

    bucket.total = bucket.productos + bucket.servicios + bucket.veterinaria;
  });

  return buckets;
}

export function computeActivityByType(events: JourneyEvent[]) {
  const counts: Record<JourneyEventType, number> = {
    product: 0,
    service: 0,
    veterinary: 0,
    exercise: 0,
    nutrition: 0,
  };

  events.forEach((e) => {
    counts[e.type] += 1;
  });

  const labels: Record<JourneyEventType, string> = {
    product: 'Productos',
    service: 'Servicios',
    veterinary: 'Veterinaria',
    exercise: 'Ejercicio',
    nutrition: 'Nutrición',
  };

  const colors: Record<JourneyEventType, string> = {
    product: landingChartColors.aqua,
    service: landingChartColors.mint,
    veterinary: landingChartColors.mango,
    exercise: landingChartColors.tropical,
    nutrition: '#94a3b8',
  };

  return (Object.keys(counts) as JourneyEventType[])
    .map((type) => ({
      type,
      name: labels[type],
      count: counts[type],
      color: colors[type],
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function computeActivityPulse(events: JourneyEvent[], days = 30): ActivityDay[] {
  const today = new Date();
  const interval = eachDayOfInterval({ start: subDays(today, days - 1), end: today });

  const countByDay = new Map<string, number>();
  events.forEach((event) => {
    const d = safeParseDate(event.date);
    if (!d) return;
    const key = format(d, 'yyyy-MM-dd');
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
  });

  const maxCount = Math.max(1, ...Array.from(countByDay.values()));

  return interval.map((day) => {
    const key = format(day, 'yyyy-MM-dd');
    const count = countByDay.get(key) ?? 0;
    return {
      date: key,
      day: format(day, 'd'),
      count,
      intensity: count / maxCount,
    };
  });
}

export function computeJourneyScore(stats: JourneyStats, events: JourneyEvent[]): number {
  const pillars = [
    stats.totalProducts > 0,
    stats.totalServices > 0,
    stats.totalVeterinaryVisits > 0,
    stats.totalExerciseSessions > 0,
    stats.totalNutritionSessions > 0,
  ];
  let score = pillars.filter(Boolean).length * 12;

  const recentCount = events.filter((e) => {
    const d = safeParseDate(e.date);
    return d && differenceInDays(new Date(), d) <= 30;
  }).length;
  score += Math.min(recentCount * 2, 20);

  const uniqueMonths = new Set(
    events
      .map((e) => safeParseDate(e.date))
      .filter(Boolean)
      .map((d) => format(d!, 'yyyy-MM')),
  );
  score += Math.min(uniqueMonths.size * 5, 20);

  return Math.min(Math.round(score), 100);
}

export function computeCarePillars(stats: JourneyStats): CarePillar[] {
  return [
    { id: 'products', label: 'Compras', active: stats.totalProducts > 0, count: stats.totalProducts, color: landingChartColors.aqua },
    { id: 'services', label: 'Servicios', active: stats.totalServices > 0, count: stats.totalServices, color: landingChartColors.mint },
    { id: 'vet', label: 'Salud', active: stats.totalVeterinaryVisits > 0, count: stats.totalVeterinaryVisits, color: landingChartColors.mango },
    { id: 'exercise', label: 'Ejercicio', active: stats.totalExerciseSessions > 0, count: stats.totalExerciseSessions, color: landingChartColors.tropical },
    { id: 'nutrition', label: 'Nutrición', active: stats.totalNutritionSessions > 0, count: stats.totalNutritionSessions, color: '#94a3b8' },
  ];
}

export function computeInsights(
  stats: JourneyStats,
  events: JourneyEvent[],
  petName: string,
): JourneyInsight[] {
  const insights: JourneyInsight[] = [];
  const breakdown = computeExpenseBreakdown(stats);

  if (breakdown.length > 0) {
    const top = breakdown.reduce((a, b) => (a.value > b.value ? a : b));
    insights.push({
      id: 'top-spend',
      icon: 'trend',
      title: `${top.pct}% en ${top.name.toLowerCase()}`,
      description: `La mayor parte de tu inversión en ${petName} está en ${top.name.toLowerCase()}.`,
      accent: 'aqua',
    });
  }

  const vetEvents = events.filter((e) => e.type === 'veterinary');
  if (vetEvents.length > 0) {
    const lastVet = vetEvents.reduce((latest, e) => {
      const d = safeParseDate(e.date);
      const ld = safeParseDate(latest.date);
      if (!d || !ld) return latest;
      return d > ld ? e : latest;
    });
    const daysSince = differenceInDays(new Date(), safeParseDate(lastVet.date) ?? new Date());
    if (daysSince > 180) {
      insights.push({
        id: 'vet-reminder',
        icon: 'alert',
        title: 'Revisa su salud',
        description: `Han pasado ${daysSince} días desde la última visita veterinaria de ${petName}.`,
        accent: 'mango',
      });
    } else if (daysSince <= 30) {
      insights.push({
        id: 'vet-recent',
        icon: 'heart',
        title: 'Salud al día',
        description: `${petName} tuvo control veterinario hace ${daysSince === 0 ? 'hoy' : `${daysSince} días`}.`,
        accent: 'mint',
      });
    }
  } else if (events.length > 0) {
    insights.push({
      id: 'no-vet',
      icon: 'alert',
      title: 'Sin visitas vet.',
      description: `Registra la primera visita veterinaria de ${petName} para completar su historial.`,
      accent: 'mango',
    });
  }

  if (stats.totalExerciseSessions >= 3) {
    insights.push({
      id: 'exercise-streak',
      icon: 'spark',
      title: '¡Muy activo!',
      description: `${stats.totalExerciseSessions} sesiones de ejercicio registradas. ${petName} mantiene buena energía.`,
      accent: 'tropical',
    });
  }

  const activityByType = computeActivityByType(events);
  if (activityByType.length >= 3) {
    insights.push({
      id: 'diverse',
      icon: 'star',
      title: 'Journey completo',
      description: `Actividad en ${activityByType.length} áreas distintas: un perfil de cuidado equilibrado.`,
      accent: 'mint',
    });
  }

  const monthly = computeMonthlySpending(events);
  const eventCountByMonth = new Map<string, number>();
  events.forEach((e) => {
    const d = safeParseDate(e.date);
    if (!d) return;
    const key = format(d, 'yyyy-MM');
    eventCountByMonth.set(key, (eventCountByMonth.get(key) ?? 0) + 1);
  });

  let busiestMonthKey = '';
  let busiestEvents = 0;
  eventCountByMonth.forEach((count, key) => {
    if (count > busiestEvents) {
      busiestEvents = count;
      busiestMonthKey = key;
    }
  });
  const busiest = monthly.find((m) => m.monthKey === busiestMonthKey);

  if (busiestEvents >= 2 && busiest) {
    insights.push({
      id: 'busiest-month',
      icon: 'spark',
      title: `Mes pico: ${busiest.month}`,
      description: `${busiestEvents} actividades registradas ese mes — tu periodo más activo reciente.`,
      accent: 'aqua',
    });
  }

  if (insights.length === 0 && events.length === 0) {
    insights.push({
      id: 'get-started',
      icon: 'star',
      title: 'Comienza el journey',
      description: `Registra compras, visitas al vet o sesiones de ejercicio para desbloquear insights de ${petName}.`,
      accent: 'aqua',
    });
  }

  return insights.slice(0, 4);
}

export function getScoreLabel(score: number): { label: string; emoji: string } {
  if (score >= 80) return { label: 'Excelente', emoji: '🌟' };
  if (score >= 60) return { label: 'Muy bien', emoji: '😊' };
  if (score >= 40) return { label: 'En progreso', emoji: '🌱' };
  if (score >= 20) return { label: 'Iniciando', emoji: '🐾' };
  return { label: 'Nuevo', emoji: '✨' };
}

/** Estado inicial real — sin datos de ejemplo */
export const EMPTY_JOURNEY_STATS: JourneyStats = {
  totalProducts: 0,
  totalServices: 0,
  totalVeterinaryVisits: 0,
  totalExerciseSessions: 0,
  totalNutritionSessions: 0,
  totalCost: 0,
  productsCost: 0,
  servicesCost: 0,
  veterinaryCost: 0,
};
