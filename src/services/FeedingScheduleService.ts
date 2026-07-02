import { supabase } from '../lib/supabase';
import {
  autoCompleteOverdueMealsForUser,
  generateMealsForSchedules,
} from '../utils/feedingScheduleAutomation';
import {
  buildNutritionSessionInsertRow,
  normalizeMealType,
} from '../utils/nutritionSession';

export interface FeedingSchedule {
  id: string;
  owner_id: string;
  pet_id: string;
  schedule_name: string;
  is_active: boolean;
  feeding_times: Array<{
    time: string;
    meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    food_id: string;
    quantity_grams: number;
  }>;
  days_of_week: number[];
  start_date: string;
  end_date?: string;
  auto_generate_meals: boolean;
  send_notifications: boolean;
  notification_minutes_before: number;
  auto_complete_enabled: boolean;
  auto_complete_minutes_after: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AutomatedMeal {
  id: string;
  owner_id: string;
  pet_id: string;
  schedule_id: string;
  scheduled_date: string;
  scheduled_time: string;
  meal_type: string;
  food_id: string;
  quantity_grams: number;
  status: 'scheduled' | 'completed' | 'skipped' | 'modified';
  completed_at?: string;
  completed_by?: string;
  actual_quantity_grams?: number;
  actual_food_id?: string;
  actual_meal_type?: string;
  actual_notes?: string;
  calories_per_100g?: number;
  protein_per_100g?: number;
  fat_per_100g?: number;
  carbs_per_100g?: number;
  fiber_per_100g?: number;
  total_calories?: number;
  total_protein?: number;
  total_fat?: number;
  total_carbs?: number;
  total_fiber?: number;
  created_at: string;
  updated_at: string;
}

export interface PetFood {
  id: string;
  name: string;
  brand: string;
  food_type: string;
  species: string;
  calories_per_100g: number;
  protein_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  ash_per_100g: number;
  moisture_per_100g: number;
}

export class FeedingScheduleService {
  // Generate meals for a specific date from all active schedules
  static async generateMealsForDate(date: string, userId?: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('generate_daily_meals_from_schedules', {
        target_date: date
      });

      if (!error) return data || 0;

      if (!userId) throw error;

      const schedules = await this.getFeedingSchedules(userId);
      const target = new Date(`${date}T12:00:00`);
      return generateMealsForSchedules(userId, schedules, 1, target);
    } catch (error) {
      console.error('Error generating meals for date:', error);
      throw error;
    }
  }

  // Generate meals for multiple dates
  static async generateMealsForDateRange(startDate: string, endDate: string): Promise<number> {
    try {
      let totalGenerated = 0;
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        const generated = await this.generateMealsForDate(dateStr);
        totalGenerated += generated;
      }
      
      return totalGenerated;
    } catch (error) {
      console.error('Error generating meals for date range:', error);
      throw error;
    }
  }

  // Get feeding schedules for a user
  static async getFeedingSchedules(userId: string): Promise<FeedingSchedule[]> {
    try {
      const { data, error } = await supabase
        .from('pet_feeding_schedules')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching feeding schedules:', error);
      throw error;
    }
  }

  // Create a new feeding schedule
  static async createFeedingSchedule(schedule: Omit<FeedingSchedule, 'id' | 'created_at' | 'updated_at'>): Promise<FeedingSchedule> {
    try {
      const { data, error } = await supabase
        .from('pet_feeding_schedules')
        .insert(schedule)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating feeding schedule:', error);
      throw error;
    }
  }

  // Update a feeding schedule
  static async updateFeedingSchedule(id: string, updates: Partial<FeedingSchedule>): Promise<FeedingSchedule> {
    try {
      const { data, error } = await supabase
        .from('pet_feeding_schedules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating feeding schedule:', error);
      throw error;
    }
  }

  // Delete a feeding schedule
  static async deleteFeedingSchedule(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('pet_feeding_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting feeding schedule:', error);
      throw error;
    }
  }

  // Get automated meals for a specific date
  static async getAutomatedMealsForDate(userId: string, date: string): Promise<AutomatedMeal[]> {
    try {
      const { data, error } = await supabase
        .from('automated_meals')
        .select(`
          *,
          pets (name, species),
          pet_foods!automated_meals_food_id_fkey (name, brand, food_type)
        `)
        .eq('owner_id', userId)
        .eq('scheduled_date', date)
        .order('scheduled_time');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching automated meals:', error);
      throw error;
    }
  }

  // Mark a meal as completed
  static async markMealAsCompleted(mealId: string, userId: string, actualData?: {
    quantity_grams?: number;
    food_id?: string;
    meal_type?: string;
    notes?: string;
  }): Promise<AutomatedMeal> {
    try {
      // Get the meal data first to calculate nutritional values
      const { data: mealData, error: fetchError } = await supabase
        .from('automated_meals')
        .select(`
          *,
          pet_foods!automated_meals_food_id_fkey (*)
        `)
        .eq('id', mealId)
        .single();

      if (fetchError) throw fetchError;

      const foodData = mealData.pet_foods;
      const quantity = actualData?.quantity_grams || mealData.quantity_grams;

      const { data, error } = await supabase
        .from('automated_meals')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: userId,
          actual_quantity_grams: actualData?.quantity_grams,
          actual_food_id: actualData?.food_id,
          actual_meal_type: actualData?.meal_type,
          actual_notes: actualData?.notes,
        })
        .eq('id', mealId)
        .select()
        .single();

      if (error) throw error;

      await this.insertIntoNutritionSessions(mealData, actualData, foodData, quantity);

      return data;
    } catch (error) {
      console.error('Error marking meal as completed:', error);
      throw error;
    }
  }

  // Insert completed meal into nutrition_sessions for analytics
  private static async insertIntoNutritionSessions(
    mealData: { owner_id: string; pet_id: string; scheduled_date: string; scheduled_time: string; meal_type: string; schedule_id: string },
    actualData: { quantity_grams?: number; meal_type?: string; notes?: string } | undefined,
    foodData: { name: string; brand?: string | null; food_type?: string | null; calories_per_100g?: number | null; protein_per_100g?: number | null; fat_per_100g?: number | null; carbs_per_100g?: number | null; fiber_per_100g?: number | null },
    quantity: number,
  ): Promise<void> {
    try {
      const payload = buildNutritionSessionInsertRow({
        petId: mealData.pet_id,
        ownerId: mealData.owner_id,
        food: foodData,
        quantityGrams: quantity,
        date: mealData.scheduled_date,
        feedingTime: mealData.scheduled_time,
        mealType: normalizeMealType(actualData?.meal_type || mealData.meal_type),
        notes: actualData?.notes || `Comida automática — horario ${mealData.schedule_id}`,
      });

      const { error } = await supabase.from('nutrition_sessions').insert(payload);
      if (error) throw error;
    } catch (error) {
      console.error('Error inserting into nutrition_sessions:', error);
    }
  }

  // Skip a meal
  static async skipMeal(mealId: string, userId: string, reason?: string): Promise<AutomatedMeal> {
    try {
      const { data, error } = await supabase
        .from('automated_meals')
        .update({
          status: 'skipped',
          completed_at: new Date().toISOString(),
          completed_by: userId,
          actual_notes: reason || 'Comida omitida'
        })
        .eq('id', mealId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error skipping meal:', error);
      throw error;
    }
  }

  // Get upcoming meals for notifications
  static async getScheduledMealsInRange(
    userId: string,
    daysAhead = 7,
    petId?: string,
  ): Promise<Array<AutomatedMeal & { pets?: { name?: string }; pet_foods?: { name?: string; brand?: string }; pet_feeding_schedules?: { schedule_name?: string } }>> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setDate(end.getDate() + Math.max(1, daysAhead));

    let query = supabase
      .from('automated_meals')
      .select(`
        *,
        pets (name),
        pet_foods!automated_meals_food_id_fkey (name, brand),
        pet_feeding_schedules (schedule_name)
      `)
      .eq('owner_id', userId)
      .eq('status', 'scheduled')
      .gte('scheduled_date', today.toISOString().split('T')[0])
      .lte('scheduled_date', end.toISOString().split('T')[0])
      .order('scheduled_date')
      .order('scheduled_time');

    if (petId) query = query.eq('pet_id', petId);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Get upcoming meals for notifications
  static async getUpcomingMeals(userId: string, hoursAhead: number = 24): Promise<AutomatedMeal[]> {
    try {
      const now = new Date();
      const futureTime = new Date(now.getTime() + (hoursAhead * 60 * 60 * 1000));
      
      const { data, error } = await supabase
        .from('automated_meals')
        .select(`
          *,
          pets (name),
          pet_foods!automated_meals_food_id_fkey (name, brand),
          pet_feeding_schedules (schedule_name, send_notifications, notification_minutes_before, auto_complete_enabled, auto_complete_minutes_after)
        `)
        .eq('owner_id', userId)
        .eq('status', 'scheduled')
        .gte('scheduled_date', now.toISOString().split('T')[0])
        .lte('scheduled_date', futureTime.toISOString().split('T')[0])
        .order('scheduled_date')
        .order('scheduled_time');

      if (error) {
        // If table doesn't exist, return empty array
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.log('Automated meals table not found, returning empty array');
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('Error fetching upcoming meals:', error);
      throw error;
    }
  }

  // Create notification for upcoming meal
  static async createMealNotification(mealId: string, userId: string): Promise<void> {
    try {
      const { data: meal, error: fetchError } = await supabase
        .from('automated_meals')
        .select(`
          *,
          pets (name),
          pet_feeding_schedules (schedule_name, notification_minutes_before)
        `)
        .eq('id', mealId)
        .single();

      if (fetchError) throw fetchError;

      const notificationTime = new Date(`${meal.scheduled_date}T${meal.scheduled_time}`);
      notificationTime.setMinutes(notificationTime.getMinutes() - meal.pet_feeding_schedules.notification_minutes_before);

      const { error } = await supabase
        .from('feeding_schedule_notifications')
        .insert({
          owner_id: userId,
          pet_id: meal.pet_id,
          schedule_id: meal.schedule_id,
          meal_id: mealId,
          notification_type: 'upcoming_feeding',
          scheduled_time: notificationTime.toISOString(),
          message: `Es hora de alimentar a ${meal.pets.name} - ${meal.pet_feeding_schedules.schedule_name}`,
          status: 'pending'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating meal notification:', error);
      throw error;
    }
  }

  // Mark multiple scheduled meals as completed (bulk)
  static async completeScheduledMeals(
    userId: string,
    filters: {
      date?: string;
      dateFrom?: string;
      dateTo?: string;
      petId?: string;
      daysAhead?: number;
    },
  ): Promise<{
    completed: number;
    errors: string[];
    meals: Array<{ id: string; pet_name: string; scheduled_date: string; scheduled_time: string }>;
  }> {
    let query = supabase
      .from('automated_meals')
      .select(`
        id,
        scheduled_date,
        scheduled_time,
        pets (name)
      `)
      .eq('owner_id', userId)
      .eq('status', 'scheduled')
      .order('scheduled_date')
      .order('scheduled_time');

    if (filters.date) {
      query = query.eq('scheduled_date', filters.date);
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const from = filters.dateFrom ?? today.toISOString().split('T')[0];
      query = query.gte('scheduled_date', from);

      if (filters.dateTo) {
        query = query.lte('scheduled_date', filters.dateTo);
      } else if (filters.daysAhead) {
        const end = new Date(today);
        end.setDate(end.getDate() + Math.max(1, filters.daysAhead));
        query = query.lte('scheduled_date', end.toISOString().split('T')[0]);
      }
    }

    if (filters.petId) query = query.eq('pet_id', filters.petId);

    const { data, error } = await query;
    if (error) throw error;

    const rows = data ?? [];
    const completed: Array<{
      id: string;
      pet_name: string;
      scheduled_date: string;
      scheduled_time: string;
    }> = [];
    const errors: string[] = [];

    for (const row of rows) {
      try {
        await this.markMealAsCompleted(row.id, userId, { notes: 'Completada desde Pet Buddy' });
        completed.push({
          id: row.id,
          pet_name: (row.pets as { name?: string } | null)?.name ?? 'Mascota',
          scheduled_date: row.scheduled_date,
          scheduled_time: String(row.scheduled_time).slice(0, 5),
        });
      } catch (err) {
        errors.push(
          `${row.id}: ${err instanceof Error ? err.message : 'no se pudo completar'}`,
        );
      }
    }

    return { completed: completed.length, errors, meals: completed };
  }

  // Auto-complete overdue meals
  static async autoCompleteOverdueMeals(userId?: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('auto_complete_overdue_meals');

      if (!error) return data || 0;

      if (!userId) throw error;
      return autoCompleteOverdueMealsForUser(userId);
    } catch (error) {
      console.error('Error auto-completing overdue meals:', error);
      throw error;
    }
  }

  // Get pet foods for a specific species
  static async getPetFoods(species: string): Promise<PetFood[]> {
    try {
      const { data, error } = await supabase
        .from('pet_foods')
        .select('*')
        .eq('species', species)
        .eq('is_available', true)
        .order('brand')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching pet foods:', error);
      throw error;
    }
  }
}

export default FeedingScheduleService;
