import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FeedingScheduleService, AutomatedMeal } from '../services/FeedingScheduleService';
import { autoCompleteOverdueMealsForUser, ensureAutoCompleteEnabledForUser } from '../utils/feedingScheduleAutomation';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { 
  Bell, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Utensils,
  Calendar,
  Edit
} from 'lucide-react';

interface FeedingNotificationProps {
  onMealCompleted?: () => void;
}

type MealWithSchedule = AutomatedMeal & {
  pet_feeding_schedules?: {
    send_notifications?: boolean;
    auto_complete_enabled?: boolean;
    auto_complete_minutes_after?: number;
  } | null;
};

function formatMealDate(dateStr: string): string {
  const mealDay = new Date(`${dateStr}T12:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayStart = new Date(mealDay);
  dayStart.setHours(0, 0, 0, 0);

  if (dayStart.getTime() === today.getTime()) return 'Hoy';
  if (dayStart.getTime() === tomorrow.getTime()) return 'Mañana';
  return mealDay.toLocaleDateString('es-GT', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatMealTime(timeStr: string): string {
  return timeStr.slice(0, 5);
}

function getMealDateTime(scheduledDate: string, scheduledTime: string): Date {
  return new Date(`${scheduledDate}T${formatMealTime(scheduledTime)}:00`);
}

const FeedingNotification: React.FC<FeedingNotificationProps> = ({ onMealCompleted }) => {
  const { user } = useAuth();
  const [upcomingMeals, setUpcomingMeals] = useState<AutomatedMeal[]>([]);
  const [loading, setLoading] = useState(false);

  const mealsWithNotificationsEnabled = (meals: AutomatedMeal[]) =>
    (meals as MealWithSchedule[]).filter((meal) => meal.pet_feeding_schedules?.send_notifications !== false);

  const loadUpcomingMeals = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      await ensureAutoCompleteEnabledForUser(user.id);
      await autoCompleteOverdueMealsForUser(user.id);
      const meals = await FeedingScheduleService.getUpcomingMeals(user.id, 48);
      setUpcomingMeals(mealsWithNotificationsEnabled(meals));
    } catch (error: unknown) {
      console.error('Error loading upcoming meals:', error);
      const err = error as { code?: string; message?: string };
      if (err.code !== '42P01' && !err.message?.includes('does not exist')) {
        toast.error('No se pudieron cargar las comidas próximas');
      }
      setUpcomingMeals([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      loadUpcomingMeals();
      const interval = setInterval(loadUpcomingMeals, 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user, loadUpcomingMeals]);

  const markMealAsCompleted = async (mealId: string) => {
    try {
      await FeedingScheduleService.markMealAsCompleted(mealId, user?.id || '');
      toast.success("Comida marcada como completada");
      loadUpcomingMeals();
      onMealCompleted?.();
    } catch (error) {
      console.error('Error marking meal as completed:', error);
      toast.error("No se pudo marcar la comida como completada");
    }
  };

  const overrideAutoCompletedMeal = async (mealId: string) => {
    try {
      // This would allow users to modify an auto-completed meal
      // For now, we'll just show a message that manual override is available
      toast.success("Esta comida fue completada automáticamente. Puedes editarla en el historial.");
    } catch (error) {
      console.error('Error overriding auto-completed meal:', error);
      toast.error("No se pudo modificar la comida");
    }
  };

  const skipMeal = async (mealId: string) => {
    try {
      await FeedingScheduleService.skipMeal(mealId, user?.id || '', 'Comida omitida por el usuario');
      toast.success("La comida ha sido marcada como omitida");
      loadUpcomingMeals();
    } catch (error) {
      console.error('Error skipping meal:', error);
      toast.error("No se pudo omitir la comida");
    }
  };

  const getMealIcon = (mealType: string) => {
    switch (mealType) {
      case 'breakfast':
        return '🌅';
      case 'lunch':
        return '🌞';
      case 'dinner':
        return '🌙';
      case 'snack':
        return '🍪';
      default:
        return '🍽️';
    }
  };

  const getMealLabel = (mealType: string) => {
    switch (mealType) {
      case 'breakfast':
        return 'Desayuno';
      case 'lunch':
        return 'Almuerzo';
      case 'dinner':
        return 'Cena';
      case 'snack':
        return 'Merienda';
      default:
        return 'Comida';
    }
  };

  const getTimeUntilMeal = (
    scheduledDate: string,
    scheduledTime: string,
    schedule?: MealWithSchedule['pet_feeding_schedules'],
  ) => {
    const now = new Date();
    const mealTime = getMealDateTime(scheduledDate, scheduledTime);
    const diffMs = mealTime.getTime() - now.getTime();
    const diffHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((Math.abs(diffMs) % (1000 * 60 * 60)) / (1000 * 60));

    if (diffMs < 0) {
      const grace = schedule?.auto_complete_minutes_after ?? 30;
      if (schedule?.auto_complete_enabled) {
        const autoCompleteAt = new Date(mealTime);
        autoCompleteAt.setMinutes(autoCompleteAt.getMinutes() + grace);
        if (now < autoCompleteAt) {
          const waitMin = Math.ceil((autoCompleteAt.getTime() - now.getTime()) / (1000 * 60));
          return `Auto-completado en ${waitMin} min`;
        }
      }
      if (diffHours > 0) return `Hace ${diffHours}h ${diffMinutes}m`;
      return `Hace ${diffMinutes}m`;
    }
    if (diffHours > 0) return `En ${diffHours}h ${diffMinutes}m`;
    return `En ${diffMinutes}m`;
  };

  const getUrgencyColor = (scheduledDate: string, scheduledTime: string) => {
    const now = new Date();
    const mealTime = getMealDateTime(scheduledDate, scheduledTime);
    const diffMs = mealTime.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMs < 0) {
      return 'text-red-600 bg-red-50 border-red-200';
    } else if (diffMinutes <= 30) {
      return 'text-orange-600 bg-orange-50 border-orange-200';
    } else if (diffMinutes <= 60) {
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    } else {
      return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  if (upcomingMeals.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600" />
          Próximas Comidas
          <Badge variant="outline" className="ml-auto">
            {upcomingMeals.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {upcomingMeals.slice(0, 5).map((meal) => {
            const schedule = (meal as MealWithSchedule).pet_feeding_schedules;
            const isOverdue = getMealDateTime(meal.scheduled_date, meal.scheduled_time) < new Date();

            return (
            <div
              key={meal.id}
              className={`p-3 sm:p-4 rounded-lg border ${getUrgencyColor(meal.scheduled_date, meal.scheduled_time)}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <span className="text-xl sm:text-2xl flex-shrink-0">
                    {getMealIcon(meal.meal_type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
                      <span className="inline-flex items-center gap-1 font-semibold text-sm sm:text-base whitespace-nowrap">
                        <Calendar className="w-3.5 h-3.5 opacity-70" />
                        {formatMealDate(meal.scheduled_date)}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-sm sm:text-base whitespace-nowrap">
                        <Clock className="w-3.5 h-3.5 opacity-70" />
                        {formatMealTime(meal.scheduled_time)}
                      </span>
                      <Badge variant="outline" className="text-[10px] sm:text-xs whitespace-nowrap">
                        {getMealLabel(meal.meal_type)}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] sm:text-xs whitespace-nowrap truncate max-w-[100px] sm:max-w-none">
                        {meal.pets?.name}
                      </Badge>
                    </div>
                    <div className="text-xs sm:text-sm opacity-80 mt-1 break-words">
                      <span className="font-medium">
                        {meal.pet_foods?.brand} - {meal.pet_foods?.name}
                      </span>
                      <span className="ml-1 sm:ml-2 whitespace-nowrap">
                        {meal.quantity_grams}g
                      </span>
                    </div>
                    <div className="text-[10px] sm:text-xs opacity-70 mt-1">
                      {getTimeUntilMeal(meal.scheduled_date, meal.scheduled_time, schedule)}
                    </div>
                    {isOverdue && !schedule?.auto_complete_enabled && (
                      <p className="text-[10px] sm:text-xs text-red-700/80 mt-1">
                        Pendiente — activa auto-completado en{' '}
                        <Link to="/feeding-schedules" className="underline font-medium">
                          Horarios de alimentación
                        </Link>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2 flex-shrink-0">
                  {meal.status === 'scheduled' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => markMealAsCompleted(meal.id)}
                        className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm h-8 sm:h-auto"
                      >
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        <span className="hidden sm:inline">Completar</span>
                        <span className="sm:hidden">✓</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => skipMeal(meal.id)}
                        className="text-red-600 border-red-200 hover:bg-red-50 text-xs sm:text-sm h-8 sm:h-auto"
                      >
                        <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        <span className="hidden sm:inline">Omitir</span>
                        <span className="sm:hidden">✕</span>
                      </Button>
                    </>
                  )}
                  {meal.status === 'completed' && meal.actual_notes?.includes('Auto-completed') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => overrideAutoCompletedMeal(meal.id)}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs sm:text-sm h-8 sm:h-auto"
                    >
                      <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      <span className="hidden sm:inline">Editar</span>
                      <span className="sm:hidden">✏️</span>
                    </Button>
                  )}
                  <Badge variant={meal.status === 'completed' ? 'default' : 'secondary'} className="text-[10px] sm:text-xs whitespace-nowrap text-center sm:text-left">
                    {meal.status === 'completed' ? 
                      (meal.actual_notes?.includes('Auto-completed') ? 'Auto-Completada' : 'Completada') :
                     meal.status === 'skipped' ? 'Omitida' :
                     meal.status === 'modified' ? 'Modificada' : 'Programada'}
                  </Badge>
                </div>
              </div>
            </div>
            );
          })}
          
          {upcomingMeals.length > 5 && (
            <div className="text-center pt-2">
              <Button variant="outline" size="sm">
                Ver todas las comidas ({upcomingMeals.length})
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedingNotification;
