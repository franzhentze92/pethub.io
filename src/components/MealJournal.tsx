import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SectionLoader } from '@/components/PageLoader';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { useToast } from '../hooks/use-toast';
import {
  Utensils,
  Calendar,
  Plus,
  Flame,
  PawPrint,
  Info,
  Activity,
} from 'lucide-react';
import PageHeader from './PageHeader';
import { DashboardShell } from './dashboard/DashboardShell';
import { MobileTabStrip, type MobileTabItem } from './mobile/MobileTabStrip';
import { MobileSectionCard } from './mobile/MobileUi';
import { landingBtnSolidMint, solidCardThemeAt, solidIconBgAt } from '@/lib/landingTheme';
import { cn } from '@/lib/utils';

import {
  buildNutritionSessionPayload,
  normalizeMealType,
  defaultFeedingTime,
} from '@/utils/nutritionSession';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  image_url?: string;
}

interface MealRecord {
  id: string;
  pet_id: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  food_name: string;
  quantity: number;
  fed_at: string;
  notes?: string;
  calories?: number;
}

function computeDayStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const days = new Set(dates.map((d) => (d.includes('T') ? d.split('T')[0] : d)));
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  const todayKey = cursor.toISOString().split('T')[0];
  if (!days.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (days.has(cursor.toISOString().split('T')[0])) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

const MealJournal: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedingStreak, setFeedingStreak] = useState(0);
  const [todayMeals, setTodayMeals] = useState(0);
  const [todayGrams, setTodayGrams] = useState(0);
  const [todayCalories, setTodayCalories] = useState(0);
  const [activeTab, setActiveTab] = useState('feed');

  const [quickFeedForm, setQuickFeedForm] = useState({
    meal_type: 'snack',
    food_name: '',
    quantity: '',
    notes: '',
  });

  useEffect(() => {
    if (user) {
      loadPets();
    }
  }, [user]);

  useEffect(() => {
    if (selectedPet) {
      loadMeals();
      calculatePetStats();
    }
  }, [selectedPet]);

  const loadPets = async () => {
    try {
      const { data, error } = await supabase.from('pets').select('*').eq('owner_id', user?.id);

      if (error) throw error;
      setPets(data || []);
      if (data && data.length > 0) {
        setSelectedPet(data[0]);
      }
    } catch (error) {
      console.error('Error loading pets:', error);
    }
  };

  const loadMeals = async () => {
    if (!selectedPet || !user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('nutrition_sessions')
        .select('id, pet_id, meal_type, food_name, quantity_grams, date, feeding_time, notes, total_calories, created_at')
        .eq('owner_id', user.id)
        .eq('pet_id', selectedPet.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const mapped: MealRecord[] = (data ?? []).map((row) => ({
        id: row.id,
        pet_id: row.pet_id,
        meal_type: normalizeMealType(row.meal_type),
        food_name: row.food_name,
        quantity: row.quantity_grams,
        fed_at: row.created_at ?? `${row.date}T${row.feeding_time ?? '12:00'}:00`,
        notes: row.notes ?? undefined,
        calories: row.total_calories ?? undefined,
      }));

      setMeals(mapped);
      applyMealStats(mapped);
    } catch (error) {
      console.error('Error loading meals:', error);
      setMeals([]);
      applyMealStats([]);
    } finally {
      setLoading(false);
    }
  };

  const applyMealStats = (records: MealRecord[]) => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = records.filter((meal) => {
      const mealDay = meal.fed_at.includes('T') ? meal.fed_at.split('T')[0] : meal.fed_at;
      return mealDay === today;
    });

    setTodayMeals(todayRecords.length);
    setTodayGrams(todayRecords.reduce((sum, m) => sum + m.quantity, 0));
    setTodayCalories(Math.round(todayRecords.reduce((sum, m) => sum + (m.calories ?? 0), 0)));
    setFeedingStreak(computeDayStreak(records.map((m) => m.fed_at)));
  };

  const calculatePetStats = () => {
    applyMealStats(meals);
  };

  const handleQuickFeed = async () => {
    if (!selectedPet || !user?.id || !quickFeedForm.food_name || !quickFeedForm.quantity) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const quantityGrams = parseInt(quickFeedForm.quantity, 10);
      if (!Number.isFinite(quantityGrams) || quantityGrams <= 0) {
        toast({ title: 'Error', description: 'Cantidad inválida', variant: 'destructive' });
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const payload = buildNutritionSessionPayload({
        petId: selectedPet.id,
        ownerId: user.id,
        food: { name: quickFeedForm.food_name.trim(), food_type: 'other' },
        quantityGrams,
        date: today,
        feedingTime: defaultFeedingTime(),
        mealType: normalizeMealType(quickFeedForm.meal_type),
        notes: quickFeedForm.notes || undefined,
      });

      const { error } = await supabase.from('nutrition_sessions').insert(payload);
      if (error) throw error;

      await loadMeals();
      setActiveTab('history');

      toast({
        title: 'Comida registrada',
        description: `Se guardó la alimentación de ${selectedPet.name}.`,
      });

      setQuickFeedForm({
        meal_type: 'snack',
        food_name: '',
        quantity: '',
        notes: '',
      });
    } catch (error) {
      console.error('Error feeding pet:', error);
      toast({
        title: 'Error',
        description: 'No se pudo registrar la comida',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPetMood = () => {
    if (todayMeals >= 3)
      return { message: 'Alimentación al día', icon: '😊', color: 'text-landing-mint-dark' };
    if (todayMeals >= 1) return { message: 'Comidas registradas hoy', icon: '😌', color: 'text-landing-aqua-dark' };
    if (feedingStreak > 0) return { message: 'Sin comidas hoy aún', icon: '😐', color: 'text-landing-mango-dark' };
    return { message: 'Registra la primera comida', icon: '🍽️', color: 'text-gray-600' };
  };

  const getMealTypeLabel = (mealType: string) => {
    const labels: Record<string, string> = {
      breakfast: 'Desayuno',
      lunch: 'Almuerzo',
      dinner: 'Cena',
      snack: 'Merienda',
    };
    return labels[mealType] || mealType;
  };

  const getPetEmoji = (species: string) => {
    switch (species.toLowerCase()) {
      case 'dog':
        return '🐕';
      case 'cat':
        return '🐱';
      case 'bird':
        return '🐦';
      case 'fish':
        return '🐠';
      default:
        return '🐾';
    }
  };

  const mealTabs: MobileTabItem[] = useMemo(
    () => [
      { id: 'feed', label: 'Alimentar', shortLabel: 'Alimentar', icon: Utensils, gradientIndex: 2 },
      { id: 'overview', label: 'Resumen', shortLabel: 'Resumen', icon: Activity, gradientIndex: 0 },
      { id: 'history', label: 'Historial', shortLabel: 'Historial', icon: Calendar, gradientIndex: 4 },
    ],
    [],
  );

  const statCards = [
    { label: 'Comidas hoy', value: String(todayMeals), sub: 'Registradas hoy' },
    { label: 'Racha', value: String(feedingStreak), sub: 'Días con registro' },
    { label: 'Gramos hoy', value: `${todayGrams}g`, sub: 'Total consumido' },
    { label: 'Calorías hoy', value: String(todayCalories), sub: 'Estimadas' },
  ];

  const petMood = getPetMood();

  if (!selectedPet) {
    return (
      <DashboardShell variant="plain">
        <PageHeader variant="solid" accent="mint" title="Diario de comidas" subtitle="Registra y da seguimiento a la alimentación de tus mascotas">
          <Utensils className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
        </PageHeader>
        <MobileSectionCard variant="plain">
          <div className="text-center py-10 px-4">
            <PawPrint className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-800">Primero agrega una mascota</p>
            <p className="text-sm text-gray-500 mt-1 mb-4 max-w-sm mx-auto">
              Crea tu primera mascota para comenzar su diario de alimentación.
            </p>
            <Button className={landingBtnSolidMint} onClick={() => navigate('/pet-creation')}>
              <Plus className="w-4 h-4 mr-2" />
              Registrar mascota
            </Button>
          </div>
        </MobileSectionCard>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell variant="plain">
      <PageHeader variant="solid" accent="mint" title="Diario de comidas" subtitle={`Alimentación y bienestar de ${selectedPet.name}`}>
        <Utensils className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
      </PageHeader>

      <MobileSectionCard variant="plain">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              {selectedPet.image_url ? (
                <img
                  src={selectedPet.image_url}
                  alt={selectedPet.name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-4 border-white shadow-lg shrink-0"
                />
              ) : (
                <div
                  className={cn(
                    'w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-2xl border-4 border-white shadow-lg shrink-0',
                    solidIconBgAt(2),
                  )}
                >
                  {getPetEmoji(selectedPet.species)}
                </div>
              )}
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">{selectedPet.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-lg">{petMood.icon}</span>
                  <span className={cn('text-sm', petMood.color)}>{petMood.message}</span>
                </div>
              </div>
            </div>
            <div className="sm:text-right">
              <div className="flex items-center gap-4 sm:justify-end mb-2">
                <div className="flex items-center gap-1">
                  <Utensils className="w-4 h-4 text-landing-mango-dark" />
                  <span className="font-bold text-gray-900">{todayMeals} hoy</span>
                </div>
                <div className="flex items-center gap-1">
                  <Flame className="w-4 h-4 text-landing-mango-dark" />
                  <span className="font-bold text-gray-900">{feedingStreak} días</span>
                </div>
              </div>
              <div className="w-full sm:w-32 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-landing-mango transition-all duration-500"
                  style={{ width: `${Math.min(100, todayMeals * 33)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </MobileSectionCard>

      <MobileTabStrip tabs={mealTabs} activeTab={activeTab} onChange={setActiveTab} variant="solid" accent="mint" columns={3} />

      {activeTab === 'feed' && (
        <MobileSectionCard variant="plain">
          <div className="p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-4">
              <Utensils className="w-5 h-5 text-landing-aqua-dark shrink-0" />
              Alimentar a {selectedPet.name}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="meal-type">Tipo de comida</Label>
                <Select
                  value={quickFeedForm.meal_type}
                  onValueChange={(value) => setQuickFeedForm((prev) => ({ ...prev, meal_type: value }))}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Desayuno</SelectItem>
                    <SelectItem value="lunch">Almuerzo</SelectItem>
                    <SelectItem value="dinner">Cena</SelectItem>
                    <SelectItem value="snack">Merienda</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="food-name">¿Qué comió?</Label>
                <Input
                  id="food-name"
                  value={quickFeedForm.food_name}
                  onChange={(e) => setQuickFeedForm((prev) => ({ ...prev, food_name: e.target.value }))}
                  placeholder="Croquetas, pollo, etc."
                  className="bg-white"
                />
              </div>
              <div>
                <Label htmlFor="quantity">Cantidad (gramos)</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={quickFeedForm.quantity}
                  onChange={(e) => setQuickFeedForm((prev) => ({ ...prev, quantity: e.target.value }))}
                  placeholder="150"
                  className="bg-white"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Input
                  id="notes"
                  value={quickFeedForm.notes}
                  onChange={(e) => setQuickFeedForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="¿Cómo se comportó?"
                  className="bg-white"
                />
              </div>
            </div>
            <Button onClick={handleQuickFeed} className={cn('w-full mt-4 min-h-[44px]', landingBtnSolidMint)}>
              <Utensils className="w-4 h-4 mr-2" />
              Registrar comida
            </Button>
          </div>
        </MobileSectionCard>
      )}

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {statCards.map((stat, index) => {
              const theme = solidCardThemeAt(index);
              return (
                <div key={stat.label} className={cn('rounded-2xl border p-4 bg-white', theme.bg, theme.border)}>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{stat.sub}</p>
                </div>
              );
            })}
          </div>

          <MobileSectionCard variant="plain">
            <div className="p-4 sm:p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                <Info className="w-4 h-4 text-landing-aqua-dark shrink-0" />
                Consejos de alimentación
              </h3>
              <ul className="text-sm text-gray-600 space-y-2 leading-relaxed">
                <li>• Registra cada comida para llevar un historial real de {selectedPet.name}</li>
                <li>• Usa gramos para comparar porciones entre días</li>
                <li>• La racha cuenta días consecutivos con al menos un registro</li>
                <li>• Para horarios automáticos, visita Nutrición en Cuidado</li>
              </ul>
            </div>
          </MobileSectionCard>
        </div>
      )}

      {activeTab === 'history' && (
        <MobileSectionCard variant="plain">
          <div className="p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-4">
              <Calendar className="w-5 h-5 text-landing-aqua-dark shrink-0" />
              Diario de comidas
            </h3>

            {loading ? (
              <SectionLoader message="Cargando historial…" />
            ) : meals.length === 0 ? (
              <div className="text-center py-10 px-2">
                <Utensils className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium text-gray-700">Aún no hay comidas registradas</p>
                <p className="text-sm text-gray-500 mt-1 mb-4">Registra la primera comida de tu mascota.</p>
                <Button variant="outline" className="min-h-[44px]" onClick={() => setActiveTab('feed')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Alimentar ahora
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {meals.map((meal) => (
                  <div
                    key={meal.id}
                    className="rounded-xl border border-white/60 bg-white/70 border-l-4 border-l-landing-mango p-3 sm:p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">{meal.food_name}</span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {getMealTypeLabel(meal.meal_type)}
                          </Badge>
                          <Badge className="bg-landing-mango/15 text-landing-mango-dark text-xs shrink-0">
                            {meal.quantity}g
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">{new Date(meal.fed_at).toLocaleString('es-GT')}</p>
                        {meal.notes && (
                          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                            <span className="font-medium text-gray-700">Notas:</span> {meal.notes}
                          </p>
                        )}
                      </div>
                      {meal.calories != null && meal.calories > 0 && (
                        <div className="flex items-center gap-1 shrink-0 text-sm text-gray-600">
                          <Flame className="w-4 h-4 text-landing-mango-dark" />
                          <span>{Math.round(meal.calories)} kcal</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </MobileSectionCard>
      )}
    </DashboardShell>
  );
};

export default MealJournal;
