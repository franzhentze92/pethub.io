import React, { useState, useEffect } from 'react';
import { SectionLoader } from '@/components/PageLoader';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatPetOptionLabel } from '@/utils/petLabels';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { toast } from 'sonner';
import NutritionProgressChart from './NutritionProgressChart';
import { MobileSectionCard } from './mobile/MobileUi';
import { landingCardThemes } from '@/lib/landingTheme';
import { mealTypeLabel, matchFoodByName } from '@/utils/nutritionSession';
import { formatNutritionSessionDate } from '@/utils/nutritionComparison';
import { fetchMergedNutritionFoodCatalog } from '@/utils/nutritionFoodCatalog';
import { cn } from '@/lib/utils';
import { 
  BarChart3, 
  Utensils, 
  Package, 
  Scale, 
  Flame, 
  Target,
  Activity
} from 'lucide-react';

interface Pet {
  id: string;
  name: string;
  species: string;
}

interface NutritionSession {
  id: string;
  pet_id: string;
  pet_name: string;
  date: string;
  meal_type: string;
  food_name: string;
  food_category: string;
  quantity_grams: number;
  calories_per_100g: number;
  protein_per_100g: number;
  fat_per_100g: number;
  carbs_per_100g: number;
  fiber_per_100g: number;
  total_calories: number;
  total_protein: number;
  total_fat: number;
  total_carbs: number;
  total_fiber: number;
  // Additional nutritional fields
  ash_per_100g?: number;
  moisture_per_100g?: number;
  total_ash?: number;
  total_moisture?: number;
  // Vitamins
  vitamin_a_per_100g?: number;
  vitamin_d_per_100g?: number;
  vitamin_e_per_100g?: number;
  vitamin_k_per_100g?: number;
  vitamin_b1_per_100g?: number;
  vitamin_b2_per_100g?: number;
  vitamin_b3_per_100g?: number;
  vitamin_b6_per_100g?: number;
  vitamin_b12_per_100g?: number;
  vitamin_c_per_100g?: number;
  total_vitamin_a?: number;
  total_vitamin_d?: number;
  total_vitamin_e?: number;
  total_vitamin_k?: number;
  total_vitamin_b1?: number;
  total_vitamin_b2?: number;
  total_vitamin_b3?: number;
  total_vitamin_b6?: number;
  total_vitamin_b12?: number;
  total_vitamin_c?: number;
  // Minerals
  calcium_per_100g?: number;
  phosphorus_per_100g?: number;
  magnesium_per_100g?: number;
  iron_per_100g?: number;
  zinc_per_100g?: number;
  copper_per_100g?: number;
  manganese_per_100g?: number;
  selenium_per_100g?: number;
  sodium_per_100g?: number;
  potassium_per_100g?: number;
  iodine_per_100g?: number;
  total_calcium?: number;
  total_phosphorus?: number;
  total_magnesium?: number;
  total_iron?: number;
  total_zinc?: number;
  total_copper?: number;
  total_manganese?: number;
  total_selenium?: number;
  total_sodium?: number;
  total_potassium?: number;
  total_iodine?: number;
  notes?: string;
  feeding_time?: string;
  created_at: string;
}

interface NutritionStats {
  total_sessions: number;
  total_calories: number;
  total_protein: number;
  total_fat: number;
  total_carbs: number;
  total_fiber: number;
  average_calories_per_session: number;
  favorite_food: string;
  daily_calorie_average: number;
  analysis_by_category: Record<string, number>;
}

const NutritionAnalytics: React.FC = () => {
  const { user } = useAuth();
  
  const [pets, setPets] = useState<Pet[]>([]);
  const [nutritionSessions, setNutritionSessions] = useState<NutritionSession[]>([]);
  const [nutritionStats, setNutritionStats] = useState<NutritionStats | null>(null);
  const [selectedPetForAnalytics, setSelectedPetForAnalytics] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Load pets and nutrition data
  useEffect(() => {
    loadPets();
    loadNutritionSessions();
    
    // Set up interval to refresh data every 30 seconds
    const interval = setInterval(() => {
      loadNutritionSessions();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Recalculate stats when data or filter changes
  useEffect(() => {
    if (nutritionSessions.length > 0 || nutritionSessions.length === 0) {
      calculateNutritionStats();
    }
  }, [nutritionSessions, selectedPetForAnalytics]);

  const loadPets = async () => {
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('id, name, species')
        .eq('owner_id', user?.id)
        .order('name');

      if (error) throw error;
      setPets(data || []);
    } catch (error) {
      console.error('Error loading pets:', error);
      toast.error("No se pudieron cargar las mascotas");
    }
  };

  const loadNutritionSessions = async () => {
    try {
      setLoading(true);
      
      // Load nutrition sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('nutrition_sessions')
        .select(`
          *,
          pets!nutrition_sessions_pet_id_fkey (name)
        `)
        .eq('owner_id', user?.id)
        .order('date', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Catálogo local GT + BD, con vitaminas/minerales enriquecidos
      const { foods: petFoodsData } = await fetchMergedNutritionFoodCatalog();

      // Enrich sessions with pet names and nutritional data from pet_foods
      const sessionsWithPetNames = (sessionsData || []).map(session => {
        const matchingFood = matchFoodByName(petFoodsData, session.food_name);

        const quantity = session.quantity_grams || 0;
        const multiplier = quantity / 100; // To calculate totals from per_100g values

        // Calculate totals from per_100g values if available
        const enrichWithTotals = (per100g: number | null | undefined) => {
          if (per100g == null) return undefined;
          return per100g * multiplier;
        };

        return {
          ...session,
          pet_name: session.pets?.name || 'Unknown Pet',
          // Add vitamin data from pet_foods if available
          vitamin_a_per_100g: matchingFood?.vitamin_a_per_100g || session.vitamin_a_per_100g,
          vitamin_d_per_100g: matchingFood?.vitamin_d_per_100g || session.vitamin_d_per_100g,
          vitamin_e_per_100g: matchingFood?.vitamin_e_per_100g || session.vitamin_e_per_100g,
          vitamin_k_per_100g: matchingFood?.vitamin_k_per_100g || session.vitamin_k_per_100g,
          vitamin_b1_per_100g: matchingFood?.vitamin_b1_per_100g || session.vitamin_b1_per_100g,
          vitamin_b2_per_100g: matchingFood?.vitamin_b2_per_100g || session.vitamin_b2_per_100g,
          vitamin_b3_per_100g: matchingFood?.vitamin_b3_per_100g || session.vitamin_b3_per_100g,
          vitamin_b6_per_100g: matchingFood?.vitamin_b6_per_100g || session.vitamin_b6_per_100g,
          vitamin_b12_per_100g: matchingFood?.vitamin_b12_per_100g || session.vitamin_b12_per_100g,
          vitamin_c_per_100g: matchingFood?.vitamin_c_per_100g || session.vitamin_c_per_100g,
          total_vitamin_a: session.total_vitamin_a || enrichWithTotals(matchingFood?.vitamin_a_per_100g),
          total_vitamin_d: session.total_vitamin_d || enrichWithTotals(matchingFood?.vitamin_d_per_100g),
          total_vitamin_e: session.total_vitamin_e || enrichWithTotals(matchingFood?.vitamin_e_per_100g),
          total_vitamin_k: session.total_vitamin_k || enrichWithTotals(matchingFood?.vitamin_k_per_100g),
          total_vitamin_b1: session.total_vitamin_b1 || enrichWithTotals(matchingFood?.vitamin_b1_per_100g),
          total_vitamin_b2: session.total_vitamin_b2 || enrichWithTotals(matchingFood?.vitamin_b2_per_100g),
          total_vitamin_b3: session.total_vitamin_b3 || enrichWithTotals(matchingFood?.vitamin_b3_per_100g),
          total_vitamin_b6: session.total_vitamin_b6 || enrichWithTotals(matchingFood?.vitamin_b6_per_100g),
          total_vitamin_b12: session.total_vitamin_b12 || enrichWithTotals(matchingFood?.vitamin_b12_per_100g),
          total_vitamin_c: session.total_vitamin_c || enrichWithTotals(matchingFood?.vitamin_c_per_100g),
          // Add mineral data from pet_foods if available
          calcium_per_100g: matchingFood?.calcium_per_100g || session.calcium_per_100g,
          phosphorus_per_100g: matchingFood?.phosphorus_per_100g || session.phosphorus_per_100g,
          magnesium_per_100g: matchingFood?.magnesium_per_100g || session.magnesium_per_100g,
          iron_per_100g: matchingFood?.iron_per_100g || session.iron_per_100g,
          zinc_per_100g: matchingFood?.zinc_per_100g || session.zinc_per_100g,
          copper_per_100g: matchingFood?.copper_per_100g || session.copper_per_100g,
          manganese_per_100g: matchingFood?.manganese_per_100g || session.manganese_per_100g,
          selenium_per_100g: matchingFood?.selenium_per_100g || session.selenium_per_100g,
          sodium_per_100g: matchingFood?.sodium_per_100g || session.sodium_per_100g,
          potassium_per_100g: matchingFood?.potassium_per_100g || session.potassium_per_100g,
          iodine_per_100g: matchingFood?.iodine_per_100g,
          total_calcium: session.total_calcium || enrichWithTotals(matchingFood?.calcium_per_100g),
          total_phosphorus: session.total_phosphorus || enrichWithTotals(matchingFood?.phosphorus_per_100g),
          total_magnesium: session.total_magnesium || enrichWithTotals(matchingFood?.magnesium_per_100g),
          total_iron: session.total_iron || enrichWithTotals(matchingFood?.iron_per_100g),
          total_zinc: session.total_zinc || enrichWithTotals(matchingFood?.zinc_per_100g),
          total_copper: session.total_copper || enrichWithTotals(matchingFood?.copper_per_100g),
          total_manganese: session.total_manganese || enrichWithTotals(matchingFood?.manganese_per_100g),
          total_selenium: session.total_selenium || enrichWithTotals(matchingFood?.selenium_per_100g),
          total_sodium: session.total_sodium || enrichWithTotals(matchingFood?.sodium_per_100g),
          total_potassium: session.total_potassium || enrichWithTotals(matchingFood?.potassium_per_100g),
          total_iodine: enrichWithTotals(matchingFood?.iodine_per_100g),
          // Additional components
          ash_per_100g: matchingFood?.ash_per_100g || session.ash_per_100g,
          moisture_per_100g: matchingFood?.moisture_per_100g || session.moisture_per_100g,
          total_ash: session.total_ash || enrichWithTotals(matchingFood?.ash_per_100g),
          total_moisture: session.total_moisture || enrichWithTotals(matchingFood?.moisture_per_100g),
        };
      });

      setNutritionSessions(sessionsWithPetNames);
    } catch (error) {
      console.error('Error loading nutrition sessions:', error);
      toast.error("No se pudieron cargar las sesiones de alimentación");
    } finally {
      setLoading(false);
    }
  };

  const getFilteredNutritionSessions = () => {
    if (selectedPetForAnalytics === 'all') {
      return nutritionSessions;
    }
    return nutritionSessions.filter(session => session.pet_id === selectedPetForAnalytics);
  };

  const calculateNutritionStats = () => {
    const filteredSessions = getFilteredNutritionSessions();
    
    if (filteredSessions.length === 0) {
      setNutritionStats(null);
      return;
    }

    const totalSessions = filteredSessions.length;
    const totalCalories = filteredSessions.reduce((sum, session) => sum + (session.total_calories || 0), 0);
    const totalProtein = filteredSessions.reduce((sum, session) => sum + (session.total_protein || 0), 0);
    const totalFat = filteredSessions.reduce((sum, session) => sum + (session.total_fat || 0), 0);
    const totalCarbs = filteredSessions.reduce((sum, session) => sum + (session.total_carbs || 0), 0);
    const totalFiber = filteredSessions.reduce((sum, session) => sum + (session.total_fiber || 0), 0);

    // Calculate average calories per session
    const averageCaloriesPerSession = totalSessions > 0 ? totalCalories / totalSessions : 0;

    // Find favorite food
    const foodCounts: Record<string, number> = {};
    filteredSessions.forEach(session => {
      foodCounts[session.food_name] = (foodCounts[session.food_name] || 0) + 1;
    });
    const favoriteFood = Object.keys(foodCounts).reduce((a, b) => 
      foodCounts[a] > foodCounts[b] ? a : b, 'N/A'
    );

    // Calculate daily calorie average
    const uniqueDays = new Set(filteredSessions.map(session => session.date)).size;
    const dailyCalorieAverage = uniqueDays > 0 ? totalCalories / uniqueDays : 0;

    // Analysis by category
    const categoryAnalysis: Record<string, number> = {};
    filteredSessions.forEach(session => {
      categoryAnalysis[session.food_category] = (categoryAnalysis[session.food_category] || 0) + 1;
    });

    setNutritionStats({
      total_sessions: totalSessions,
      total_calories: Math.round(totalCalories),
      total_protein: Math.round(totalProtein),
      total_fat: Math.round(totalFat),
      total_carbs: Math.round(totalCarbs),
      total_fiber: Math.round(totalFiber),
      average_calories_per_session: Math.round(averageCaloriesPerSession),
      favorite_food: favoriteFood,
      daily_calorie_average: Math.round(dailyCalorieAverage),
      analysis_by_category: categoryAnalysis
    });
  };

  if (loading) {
    return (
      <MobileSectionCard>
        <div className="p-6">
          <SectionLoader message="Cargando análisis nutricional…" />
        </div>
      </MobileSectionCard>
    );
  }

  const statCards = nutritionStats
    ? [
        { label: 'Total sesiones', value: nutritionStats.total_sessions, sub: 'Registros de alimentación' },
        { label: 'Total calorías', value: nutritionStats.total_calories, sub: 'Calorías consumidas' },
        { label: 'Comida favorita', value: nutritionStats.favorite_food, sub: 'Más consumida', small: true },
        { label: 'Promedio diario', value: nutritionStats.daily_calorie_average, sub: 'Calorías por día' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <MobileSectionCard>
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <BarChart3 className="w-5 h-5 text-landing-aqua" />
            Análisis nutricional
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadNutritionSessions();
              toast.success("Datos actualizados");
            }}
            disabled={loading}
          >
            <Activity className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
        <div className="p-4 sm:p-6">
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Filtrar por mascota
          </label>
          <Select value={selectedPetForAnalytics} onValueChange={setSelectedPetForAnalytics}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar mascota" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las mascotas</SelectItem>
              {pets.map((pet) => (
                <SelectItem key={pet.id} value={pet.id}>
                  {formatPetOptionLabel(pet)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </MobileSectionCard>

      {nutritionStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, index) => {
            const theme = landingCardThemes[index % landingCardThemes.length];
            return (
              <MobileSectionCard key={card.label}>
                <div className={cn('p-4 sm:p-5', theme.bg)}>
                  <p className="text-sm font-medium text-gray-600">{card.label}</p>
                  <p className={cn('font-bold text-gray-900 mt-1', card.small ? 'text-lg' : 'text-2xl')}>
                    {card.value}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
                </div>
              </MobileSectionCard>
            );
          })}
        </div>
      )}

      {/* Nutrition Progress Charts */}
      {getFilteredNutritionSessions().length > 0 && (
        <NutritionProgressChart sessions={getFilteredNutritionSessions()} />
      )}

      <MobileSectionCard>
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Utensils className="w-5 h-5 text-landing-aqua" />
            Historial de alimentación
          </h3>
        </div>
        <div className="p-4 sm:p-6">
          {getFilteredNutritionSessions().length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Utensils className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>
                {selectedPetForAnalytics === 'all' 
                  ? 'No hay sesiones de alimentación registradas'
                  : `No hay sesiones de alimentación para ${pets.find(p => p.id === selectedPetForAnalytics)?.name || 'esta mascota'}`
                }
              </p>
              <p className="text-sm mt-2">Registra tu primera comida en la pestaña Manual.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {getFilteredNutritionSessions().map((session, index) => {
                const theme = landingCardThemes[index % landingCardThemes.length];
                return (
                <div
                  key={session.id}
                  className={cn('border-l-4 pl-4 py-3 rounded-r-xl', theme.border, theme.bg)}
                >
                  <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {session.meal_type === 'breakfast' ? '🌅' : 
                         session.meal_type === 'lunch' ? '🌞' : 
                         session.meal_type === 'dinner' ? '🌙' : '🍪'}
                      </span>
                      <span className="font-semibold text-gray-800">
                        {mealTypeLabel(session.meal_type)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {session.pet_name}
                      </Badge>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatNutritionSessionDate(session.date)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      {session.food_name}
                    </div>
                    <div className="flex items-center gap-1">
                      <Scale className="w-4 h-4" />
                      {session.quantity_grams}g
                    </div>
                    <div className="flex items-center gap-1">
                      <Flame className="w-4 h-4" />
                      {session.total_calories} cal
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      {session.food_category.replace('_', ' ')}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mt-2">
                    <div className="flex items-center gap-1">
                      <span className="text-blue-600">🥩</span>
                      {session.total_protein}g proteína
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-600">🧈</span>
                      {session.total_fat}g grasa
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-purple-600">🍞</span>
                      {session.total_carbs}g carbos
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-emerald-600">🌾</span>
                      {session.total_fiber}g fibra
                    </div>
                  </div>
                  
                  {session.notes && (
                    <p className="text-sm text-gray-600 mt-2 italic">"{session.notes}"</p>
                  )}
                </div>
              );
              })}
            </div>
          )}
        </div>
      </MobileSectionCard>
    </div>
  );
};

export default NutritionAnalytics;
