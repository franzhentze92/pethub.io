import { format, subDays } from 'date-fns';
import { supabase } from '@/lib/supabase';

export interface WeeklyTrendBucket {
  week_label: string;
  week_start: string;
  meals_count: number;
  calories_total: number;
  exercise_sessions: number;
  exercise_minutes: number;
}

export interface PetHealthTrends {
  period_days: number;
  nutrition_weekly: WeeklyTrendBucket[];
  exercise_weekly: WeeklyTrendBucket[];
  comparison: {
    calories_current_week: number;
    calories_previous_week: number;
    calories_change_pct: number | null;
    exercise_minutes_current_week: number;
    exercise_minutes_previous_week: number;
    exercise_change_pct: number | null;
  };
}

function weekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return format(d, 'yyyy-MM-dd');
}

function weekLabel(weekStartDate: string): string {
  const [y, m, d] = weekStartDate.split('-').map(Number);
  return format(new Date(y, m - 1, d), 'd MMM');
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export async function buildPetHealthTrends(
  petId: string,
  ownerId: string,
  daysBack = 30,
): Promise<PetHealthTrends> {
  const sinceDate = format(subDays(new Date(), daysBack), 'yyyy-MM-dd');

  const [nutritionRes, exerciseRes] = await Promise.all([
    supabase
      .from('nutrition_sessions')
      .select('date, total_calories')
      .eq('owner_id', ownerId)
      .eq('pet_id', petId)
      .gte('date', sinceDate),
    supabase
      .from('exercise_sessions')
      .select('date, duration_minutes')
      .eq('owner_id', ownerId)
      .eq('pet_id', petId)
      .gte('date', sinceDate),
  ]);

  const weekMap = new Map<
    string,
    { meals: number; calories: number; exerciseSessions: number; exerciseMinutes: number }
  >();

  const ensureWeek = (dateStr: string) => {
    const start = weekStart(new Date(dateStr));
    if (!weekMap.has(start)) {
      weekMap.set(start, { meals: 0, calories: 0, exerciseSessions: 0, exerciseMinutes: 0 });
    }
    return start;
  };

  for (const row of nutritionRes.data ?? []) {
    const start = ensureWeek(row.date);
    const bucket = weekMap.get(start)!;
    bucket.meals += 1;
    bucket.calories += Math.round(Number(row.total_calories) || 0);
  }

  for (const row of exerciseRes.data ?? []) {
    const start = ensureWeek(row.date);
    const bucket = weekMap.get(start)!;
    bucket.exerciseSessions += 1;
    bucket.exerciseMinutes += Number(row.duration_minutes) || 0;
  }

  const sortedWeeks = [...weekMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const weekly: WeeklyTrendBucket[] = sortedWeeks.map(([start, data]) => ({
    week_label: weekLabel(start),
    week_start: start,
    meals_count: data.meals,
    calories_total: data.calories,
    exercise_sessions: data.exerciseSessions,
    exercise_minutes: data.exerciseMinutes,
  }));

  const currentWeekStart = weekStart(new Date());
  const previousWeekStart = weekStart(subDays(new Date(), 7));

  const current = weekMap.get(currentWeekStart) ?? {
    meals: 0,
    calories: 0,
    exerciseSessions: 0,
    exerciseMinutes: 0,
  };
  const previous = weekMap.get(previousWeekStart) ?? {
    meals: 0,
    calories: 0,
    exerciseSessions: 0,
    exerciseMinutes: 0,
  };

  return {
    period_days: daysBack,
    nutrition_weekly: weekly.map((w) => ({
      ...w,
      exercise_sessions: w.exercise_sessions,
      exercise_minutes: w.exercise_minutes,
    })),
    exercise_weekly: weekly,
    comparison: {
      calories_current_week: current.calories,
      calories_previous_week: previous.calories,
      calories_change_pct: pctChange(current.calories, previous.calories),
      exercise_minutes_current_week: current.exerciseMinutes,
      exercise_minutes_previous_week: previous.exerciseMinutes,
      exercise_change_pct: pctChange(current.exerciseMinutes, previous.exerciseMinutes),
    },
  };
}
