import { supabase } from '@/lib/supabase';
import { subDays, differenceInDays, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';

export interface PetStatus {
  health: StatusBar;
  nutrition: StatusBar;
  energy: StatusBar;
  hygiene: StatusBar;
  wellbeing: StatusBar;
}

export interface StatusBar {
  value: number; // 0-100
  status: 'excellent' | 'good' | 'warning' | 'critical';
  label: string;
  message: string;
  lastUpdate?: string;
  daysSinceLastUpdate?: number;
}

export interface StatusRecommendation {
  type: 'health' | 'nutrition' | 'energy' | 'hygiene' | 'wellbeing';
  message: string;
  action: string;
  marketplaceLink?: string;
  priority: 'low' | 'medium' | 'high';
}

/**
 * Calculate pet status based on real data from database
 */
export class PetStatusService {
  /**
   * Calculate all status bars for a pet
   */
  static async calculatePetStatus(petId: string): Promise<PetStatus> {
    const [health, nutrition, energy, hygiene, wellbeing] = await Promise.all([
      this.calculateHealthStatus(petId),
      this.calculateNutritionStatus(petId),
      this.calculateEnergyStatus(petId),
      this.calculateHygieneStatus(petId),
      this.calculateWellbeingStatus(petId)
    ]);

    return { health, nutrition, energy, hygiene, wellbeing };
  }

  /**
   * Calculate Health Status based on:
   * - Recent vet visits (within 90 days = good)
   * - Vaccinations up to date
   * - Medication compliance
   */
  static async calculateHealthStatus(petId: string): Promise<StatusBar> {
    const now = new Date();
    const ninetyDaysAgo = subDays(now, 90);
    const oneYearAgo = subDays(now, 365);

    // Get recent veterinary sessions
    const { data: vetSessions } = await supabase
      .from('veterinary_sessions')
      .select('date, appointment_type')
      .eq('pet_id', petId)
      .order('date', { ascending: false })
      .limit(10);

    // Get health records (vaccinations, checkups)
    const { data: healthRecords } = await supabase
      .from('health_records')
      .select('date, visit_type')
      .eq('pet_id', petId)
      .order('date', { ascending: false })
      .limit(10);

    const allHealthEvents = [
      ...(vetSessions || []).map(v => ({ date: v.date, type: v.appointment_type })),
      ...(healthRecords || []).map(h => ({ date: h.date, type: h.visit_type }))
    ].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

    const lastHealthEvent = allHealthEvents[0];
    const daysSinceLastVisit = lastHealthEvent 
      ? differenceInDays(now, parseISO(lastHealthEvent.date))
      : 999;

    let value = 100;
    let status: StatusBar['status'] = 'excellent';
    let label = 'Saludable';
    let message = 'Todo está perfecto';

    if (daysSinceLastVisit > 365) {
      value = 30;
      status = 'critical';
      label = 'Riesgo';
      message = 'No hay registros de salud en más de un año';
    } else if (daysSinceLastVisit > 180) {
      value = 50;
      status = 'warning';
      label = 'Atención';
      message = 'Última visita hace más de 6 meses';
    } else if (daysSinceLastVisit > 90) {
      value = 70;
      status = 'warning';
      label = 'Atención';
      message = 'Última visita hace más de 3 meses';
    } else if (daysSinceLastVisit > 30) {
      value = 85;
      status = 'good';
      label = 'Bien';
      message = 'Salud al día';
    }

    // Check vaccination status from structured records
    const { data: petVaccinations } = await supabase
      .from('pet_vaccinations')
      .select('administered_at, next_due_date, reminder_completed_at')
      .eq('pet_id', petId)
      .order('administered_at', { ascending: false })
      .limit(20);

    const today = startOfDay(new Date());
    const overdueVaccinations = (petVaccinations ?? []).filter((v) => {
      if (!v.next_due_date || v.reminder_completed_at) return false;
      return isBefore(parseISO(v.next_due_date), today);
    });

    const recentVaccinations = (petVaccinations ?? []).filter((v) =>
      isAfter(parseISO(v.administered_at), ninetyDaysAgo),
    );

    if (overdueVaccinations.length > 0) {
      value = Math.max(40, value - overdueVaccinations.length * 15);
      status = 'warning';
      label = 'Atención';
      message = 'Hay vacunas vencidas en el calendario';
    } else if (recentVaccinations.length === 0 && daysSinceLastVisit < 180) {
      value = Math.max(60, value - 10);
      if (value < 70) status = 'warning';
      message = 'Considera revisar el calendario de vacunación';
    }

    return {
      value: Math.max(0, Math.min(100, value)),
      status,
      label,
      message,
      lastUpdate: lastHealthEvent?.date,
      daysSinceLastUpdate: daysSinceLastVisit
    };
  }

  /**
   * Calculate Nutrition Status based on:
   * - Recent meal records
   * - Feeding schedule compliance
   * - Regularity of meals
   */
  static async calculateNutritionStatus(petId: string): Promise<StatusBar> {
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);
    const thirtyDaysAgo = subDays(now, 30);

    // Get recent nutrition sessions
    const { data: nutritionSessions } = await supabase
      .from('nutrition_sessions')
      .select('date, total_calories, quantity_grams')
      .eq('pet_id', petId)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    // Get active feeding schedules
    const { data: feedingSchedules } = await supabase
      .from('pet_feeding_schedules')
      .select('times_per_day, is_active')
      .eq('pet_id', petId)
      .eq('is_active', true);

    const recentMeals = nutritionSessions || [];
    const last7DaysMeals = recentMeals.filter(m => 
      isAfter(parseISO(m.date), sevenDaysAgo)
    );

    const expectedMealsPerWeek = (feedingSchedules?.reduce((sum, s) => sum + s.times_per_day, 0) || 2) * 7;
    const actualMealsThisWeek = last7DaysMeals.length;
    const complianceRate = expectedMealsPerWeek > 0 
      ? (actualMealsThisWeek / expectedMealsPerWeek) * 100 
      : actualMealsThisWeek > 0 ? 50 : 0;

    const lastMeal = recentMeals[0];
    const daysSinceLastMeal = lastMeal 
      ? differenceInDays(now, parseISO(lastMeal.date))
      : 999;

    let value = 100;
    let status: StatusBar['status'] = 'excellent';
    let label = 'Bien alimentado';
    let message = 'Nutrición óptima';

    if (daysSinceLastMeal > 3) {
      value = 30;
      status = 'critical';
      label = 'Falta alimentación';
      message = 'No hay registros de comida en varios días';
    } else if (daysSinceLastMeal > 1) {
      value = 60;
      status = 'warning';
      label = 'Ajustar dieta';
      message = 'Última comida hace más de un día';
    } else if (complianceRate < 50) {
      value = 65;
      status = 'warning';
      label = 'Ajustar dieta';
      message = 'Baja frecuencia de comidas registradas';
    } else if (complianceRate < 80) {
      value = 80;
      status = 'good';
      label = 'Bien alimentado';
      message = 'Buena regularidad en las comidas';
    }

    // Degradation: if no meals in last 24 hours, reduce value
    if (daysSinceLastMeal >= 1) {
      value = Math.max(30, value - (daysSinceLastMeal * 10));
      if (value < 50) status = 'critical';
      if (value < 70) status = 'warning';
    }

    return {
      value: Math.max(0, Math.min(100, value)),
      status,
      label,
      message,
      lastUpdate: lastMeal?.date,
      daysSinceLastUpdate: daysSinceLastMeal
    };
  }

  /**
   * Calculate Energy Status based on:
   * - Recent exercise sessions
   * - Adventure logs
   * - Activity frequency
   */
  static async calculateEnergyStatus(petId: string): Promise<StatusBar> {
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);
    const thirtyDaysAgo = subDays(now, 30);

    // Get exercise sessions
    const { data: exerciseSessions } = await supabase
      .from('exercise_sessions')
      .select('session_date, duration_minutes, calories_burned')
      .eq('pet_id', petId)
      .gte('session_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('session_date', { ascending: false });

    // Get adventure logs (if table exists)
    let adventures: any[] = [];
    try {
      const { data } = await supabase
        .from('adventure_logs')
        .select('adventure_date, duration_minutes, calories_burned')
        .eq('pet_id', petId)
        .gte('adventure_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('adventure_date', { ascending: false });
      adventures = data || [];
    } catch (error) {
      // Table might not exist, continue with exercise sessions only
      console.log('adventure_logs table not found, using exercise_sessions only');
    }

    const allActivities = [
      ...(exerciseSessions || []).map(e => ({ 
        date: e.session_date, 
        duration: e.duration_minutes || 0,
        calories: e.calories_burned || 0
      })),
      ...adventures.map(a => ({ 
        date: a.adventure_date, 
        duration: a.duration_minutes || 0,
        calories: a.calories_burned || 0
      }))
    ].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

    const last7DaysActivities = allActivities.filter(a => 
      isAfter(parseISO(a.date), sevenDaysAgo)
    );

    const totalMinutesThisWeek = last7DaysActivities.reduce((sum, a) => sum + a.duration, 0);
    const lastActivity = allActivities[0];
    const daysSinceLastActivity = lastActivity 
      ? differenceInDays(now, parseISO(lastActivity.date))
      : 999;

    // Recommended: at least 150 minutes per week for dogs
    const recommendedWeeklyMinutes = 150;
    const activityScore = Math.min(100, (totalMinutesThisWeek / recommendedWeeklyMinutes) * 100);

    let value = activityScore;
    let status: StatusBar['status'] = 'excellent';
    let label = 'Activo';
    let message = 'Excelente nivel de actividad';

    if (daysSinceLastActivity > 7) {
      value = Math.max(20, value - 30);
      status = 'critical';
      label = 'Sedentario';
      message = 'Sin actividad registrada en más de una semana';
    } else if (daysSinceLastActivity > 3) {
      value = Math.max(40, value - 20);
      status = 'warning';
      label = 'Bajo nivel';
      message = 'Última actividad hace varios días';
    } else if (activityScore < 50) {
      status = 'warning';
      label = 'Bajo nivel';
      message = 'Poca actividad esta semana';
    } else if (activityScore < 80) {
      status = 'good';
      label = 'Activo';
      message = 'Buena actividad semanal';
    }

    // Degradation: reduce value if no activity in last 24 hours
    if (daysSinceLastActivity >= 1) {
      value = Math.max(20, value - (daysSinceLastActivity * 5));
      if (value < 40) status = 'critical';
      if (value < 60) status = 'warning';
    }

    return {
      value: Math.max(0, Math.min(100, value)),
      status,
      label,
      message,
      lastUpdate: lastActivity?.date,
      daysSinceLastUpdate: daysSinceLastActivity
    };
  }

  /**
   * Calculate Hygiene Status based on:
   * - Grooming reminders completed
   * - Service bookings (grooming services)
   * - Time since last grooming
   */
  static async calculateHygieneStatus(petId: string): Promise<StatusBar> {
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const sixtyDaysAgo = subDays(now, 60);

    // Get completed grooming reminders
    const { data: groomingReminders } = await supabase
      .from('pet_reminders')
      .select('due_date, is_completed, scheduled_date')
      .eq('pet_id', petId)
      .eq('reminder_type', 'grooming')
      .eq('is_completed', true)
      .order('due_date', { ascending: false })
      .limit(10);

    // Get service bookings for grooming (if service_bookings table exists)
    let groomingServices: any[] = [];
    try {
      const { data: bookings } = await supabase
        .from('service_bookings')
        .select('service_date, status')
        .eq('pet_id', petId)
        .in('status', ['completed', 'confirmed'])
        .order('service_date', { ascending: false })
        .limit(10);

      // Filter for grooming services (would need to join with provider_services)
      // For now, we'll use reminders as primary source
      groomingServices = bookings || [];
    } catch (error) {
      // Table might not exist, continue with reminders only
    }

    const allGroomingEvents = [
      ...(groomingReminders || []).map(r => ({ 
        date: r.due_date || r.scheduled_date,
        type: 'reminder'
      })),
      ...groomingServices.map(s => ({ 
        date: s.service_date,
        type: 'service'
      }))
    ].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

    const lastGrooming = allGroomingEvents[0];
    const daysSinceLastGrooming = lastGrooming 
      ? differenceInDays(now, parseISO(lastGrooming.date))
      : 999;

    let value = 100;
    let status: StatusBar['status'] = 'excellent';
    let label = 'Limpio';
    let message = 'Higiene al día';

    if (daysSinceLastGrooming > 60) {
      value = 30;
      status = 'critical';
      label = 'Muy atrasado';
      message = 'Sin grooming en más de 2 meses';
    } else if (daysSinceLastGrooming > 30) {
      value = 50;
      status = 'warning';
      label = 'Necesita grooming';
      message = 'Último grooming hace más de un mes';
    } else if (daysSinceLastGrooming > 14) {
      value = 70;
      status = 'warning';
      label = 'Necesita grooming';
      message = 'Considera agendar un grooming';
    } else if (daysSinceLastGrooming > 7) {
      value = 85;
      status = 'good';
      label = 'Limpio';
      message = 'Higiene en buen estado';
    }

    // Degradation: reduce value over time
    if (daysSinceLastGrooming >= 7) {
      value = Math.max(30, value - (daysSinceLastGrooming * 2));
      if (value < 50) status = 'critical';
      if (value < 70) status = 'warning';
    }

    return {
      value: Math.max(0, Math.min(100, value)),
      status,
      label,
      message,
      lastUpdate: lastGrooming?.date,
      daysSinceLastUpdate: daysSinceLastGrooming
    };
  }

  /**
   * Calculate Wellbeing Status based on:
   * - Overall activity consistency
   * - Combination of other metrics
   * - Recent interactions
   */
  static async calculateWellbeingStatus(petId: string): Promise<StatusBar> {
    // Get all other statuses
    const [health, nutrition, energy, hygiene] = await Promise.all([
      this.calculateHealthStatus(petId),
      this.calculateNutritionStatus(petId),
      this.calculateEnergyStatus(petId),
      this.calculateHygieneStatus(petId)
    ]);

    // Calculate weighted average
    const weights = { health: 0.3, nutrition: 0.25, energy: 0.25, hygiene: 0.2 };
    const value = Math.round(
      health.value * weights.health +
      nutrition.value * weights.nutrition +
      energy.value * weights.energy +
      hygiene.value * weights.hygiene
    );

    let status: StatusBar['status'] = 'excellent';
    let label = 'Feliz';
    let message = 'Todo está perfecto';

    if (value < 40) {
      status = 'critical';
      label = 'Descuidado';
      message = 'Necesita atención en varias áreas';
    } else if (value < 60) {
      status = 'warning';
      label = 'Aburrido';
      message = 'Algunas áreas necesitan atención';
    } else if (value < 80) {
      status = 'good';
      label = 'Contento';
      message = 'Bienestar general bueno';
    }

    return {
      value: Math.max(0, Math.min(100, value)),
      status,
      label,
      message
    };
  }

  /**
   * Get recommendations based on status
   */
  static getRecommendations(status: PetStatus): StatusRecommendation[] {
    const recommendations: StatusRecommendation[] = [];

    if (status.health.status === 'critical' || status.health.status === 'warning') {
      recommendations.push({
        type: 'health',
        message: status.health.message,
        action: 'Agendar visita veterinaria',
        marketplaceLink: '/marketplace?category=veterinaria',
        priority: status.health.status === 'critical' ? 'high' : 'medium'
      });
    }

    if (status.nutrition.status === 'critical' || status.nutrition.status === 'warning') {
      recommendations.push({
        type: 'nutrition',
        message: status.nutrition.message,
        action: 'Comprar alimento o registrar comida',
        marketplaceLink: '/marketplace?category=productos',
        priority: status.nutrition.status === 'critical' ? 'high' : 'medium'
      });
    }

    if (status.energy.status === 'critical' || status.energy.status === 'warning') {
      recommendations.push({
        type: 'energy',
        message: status.energy.message,
        action: 'Registrar paseo o actividad',
        marketplaceLink: '/adventure-log',
        priority: status.energy.status === 'critical' ? 'high' : 'medium'
      });
    }

    if (status.hygiene.status === 'critical' || status.hygiene.status === 'warning') {
      recommendations.push({
        type: 'hygiene',
        message: status.hygiene.message,
        action: 'Agendar servicio de grooming',
        marketplaceLink: '/marketplace?category=grooming',
        priority: status.hygiene.status === 'critical' ? 'high' : 'medium'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
}

