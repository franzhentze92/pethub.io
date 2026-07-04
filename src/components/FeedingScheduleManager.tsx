import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { FeedingScheduleService, FeedingSchedule, AutomatedMeal } from '../services/FeedingScheduleService';
import { generateMealsForSchedules, generateMealsForSchedule } from '../utils/feedingScheduleAutomation';
import {
  fetchMealForDeepLink,
  loadNutritionPagePendingMealIds,
  markNutritionNotificationsReadForMeal,
} from '@/utils/nutritionNotifications';
import { dispatchNotificationsUpdated } from '@/utils/notificationEvents';
import { subscribeToPushNotifications, getPushPermission, isPushSupported } from '../lib/pushNotifications';
import ManualFeedingForm from './ManualFeedingForm';
import NutritionAnalytics from './NutritionAnalytics';
import NutritionComparison from './NutritionComparison';
import { fetchMergedNutritionFoodCatalog } from '@/utils/nutritionFoodCatalog';
import { 
  Clock, 
  Plus, 
  Trash2, 
  Calendar, 
  Bell, 
  Settings, 
  Utensils,
  Save,
  Edit,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  Loader2,
  BarChart3,
  PawPrint,
  Scale,
} from 'lucide-react';
import { SectionLoader, PageLoader } from '@/components/PageLoader';
import PageHeader from './PageHeader';
import { DashboardShell } from './dashboard/DashboardShell';
import { MobileTabStrip, type MobileTabItem } from './mobile/MobileTabStrip';
import { MobileSectionCard } from './mobile/MobileUi';
import { landingBtnSolidMint, solidIconBgAt } from '@/lib/landingTheme';
import { useBlueprintGuidedTourOptional } from '@/contexts/BlueprintGuidedTourContext';
import {
  NutritionFormSection,
  SettingToggleRow,
  WeekDayPills,
  nutritionFieldClass,
} from './nutrition/NutritionFormUi';
import { cn } from '@/lib/utils';
import { ActionConfirmDialog } from './ui/ActionConfirmDialog';
interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
}

interface PetFood {
  id: string;
  name: string;
  brand: string;
  food_type: string;
  species: string;
  calories_per_100g: number;
  protein_per_100g: number;
  fat_per_100g: number;
}

interface FeedingTime {
  time: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  food_id: string;
  quantity_grams: number;
}

interface FeedingSchedule {
  id: string;
  owner_id: string;
  pet_id: string;
  schedule_name: string;
  is_active: boolean;
  feeding_times: FeedingTime[];
  days_of_week: number[];
  start_date: string;
  end_date?: string;
  auto_generate_meals: boolean;
  send_notifications: boolean;
  notification_minutes_before: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface AutomatedMeal {
  id: string;
  pet_id: string;
  schedule_id: string;
  scheduled_date: string;
  scheduled_time: string;
  meal_type: string;
  food_id: string;
  quantity_grams: number;
  status: 'scheduled' | 'completed' | 'skipped' | 'modified';
  completed_at?: string;
  actual_quantity_grams?: number;
  actual_food_id?: string;
  actual_notes?: string;
  pets?: { name: string };
  pet_foods?: { name: string; brand: string };
  pet_feeding_schedules?: {
    auto_complete_enabled: boolean;
    auto_complete_minutes_after: number;
  };
}

const FeedingScheduleManager: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const deepLinkHandled = useRef<string | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [availableFoods, setAvailableFoods] = useState<PetFood[]>([]);
  const [schedules, setSchedules] = useState<FeedingSchedule[]>([]);
  const [automatedMeals, setAutomatedMeals] = useState<AutomatedMeal[]>([]);
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showScheduleConfirm, setShowScheduleConfirm] = useState(false);
  const [showMealConfirm, setShowMealConfirm] = useState(false);
  const [pendingMeal, setPendingMeal] = useState<AutomatedMeal | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingFoods, setLoadingFoods] = useState(false);
  const [activeTab, setActiveTab] = useState('schedules');
  const guidedTour = useBlueprintGuidedTourOptional();
  
  // Form states
  const [selectedPet, setSelectedPet] = useState('');
  const [scheduleName, setScheduleName] = useState('');
  const [feedingTimes, setFeedingTimes] = useState<FeedingTime[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [sendNotifications, setSendNotifications] = useState(true);
  const [notificationMinutes, setNotificationMinutes] = useState(15);
  const [autoCompleteEnabled, setAutoCompleteEnabled] = useState(true);
  const [autoCompleteMinutes, setAutoCompleteMinutes] = useState(30);
  const [notes, setNotes] = useState('');
  
  // UI states
  const [editingSchedule, setEditingSchedule] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [hasGeneratedMeals, setHasGeneratedMeals] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [filterPetId, setFilterPetId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [allMeals, setAllMeals] = useState<AutomatedMeal[]>([]);
  const [pendingMealNotificationIds, setPendingMealNotificationIds] = useState<Set<string>>(new Set());

  const daysOfWeek = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
    { value: 7, label: 'Domingo' }
  ];

  const mealTypes = [
    { value: 'breakfast', label: 'Desayuno', icon: '🌅' },
    { value: 'lunch', label: 'Almuerzo', icon: '🌞' },
    { value: 'dinner', label: 'Cena', icon: '🌙' },
    { value: 'snack', label: 'Merienda', icon: '🍪' },
  ];

  const nutritionTabs: MobileTabItem[] = useMemo(
    () => [
      { id: 'schedules', label: 'Mis Horarios', shortLabel: 'Horarios', icon: Calendar, gradientIndex: 0 },
      { id: 'create', label: 'Crear', shortLabel: 'Crear', icon: Plus, gradientIndex: 2 },
      { id: 'manual', label: 'Manual', shortLabel: 'Manual', icon: Utensils, gradientIndex: 4 },
      {
        id: 'meals',
        label: 'Comidas',
        shortLabel: pendingMealNotificationIds.size
          ? `Comidas · ${pendingMealNotificationIds.size} pendiente${pendingMealNotificationIds.size !== 1 ? 's' : ''}`
          : 'Comidas',
        icon: Clock,
        gradientIndex: 1,
      },
      { id: 'analytics', label: 'Análisis', shortLabel: 'Análisis', icon: BarChart3, gradientIndex: 3 },
      { id: 'comparison', label: 'Objetivo vs Real', shortLabel: 'Comparar', icon: Scale, gradientIndex: 5 },
    ],
    [pendingMealNotificationIds.size],
  );

  const refreshPendingMealIds = useCallback(async () => {
    if (!user?.id) return;
    const ids = await loadNutritionPagePendingMealIds(user.id);
    setPendingMealNotificationIds(ids);
  }, [user?.id]);

  // Load initial data
  useEffect(() => {
    if (!user) {
      setInitialLoading(false);
      return;
    }
    const loadAll = async () => {
      setInitialLoading(true);
      await Promise.all([loadPets(), loadSchedules()]);
      setInitialLoading(false);
    };
    void loadAll();
  }, [user]);

  useEffect(() => {
    void refreshPendingMealIds();
  }, [refreshPendingMealIds]);

  useEffect(() => {
    const onUpdate = () => {
      void refreshPendingMealIds();
    };
    window.addEventListener('notifications-updated', onUpdate);
    window.addEventListener('feeding-notifications-updated', onUpdate);
    return () => {
      window.removeEventListener('notifications-updated', onUpdate);
      window.removeEventListener('feeding-notifications-updated', onUpdate);
    };
  }, [refreshPendingMealIds]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('nutrition_page_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feeding_schedule_notifications',
          filter: `owner_id=eq.${user.id}`,
        },
        () => {
          void refreshPendingMealIds();
          dispatchNotificationsUpdated();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'automated_meals',
          filter: `owner_id=eq.${user.id}`,
        },
        () => {
          if (activeTab === 'meals') {
            void loadAutomatedMeals();
          }
          void refreshPendingMealIds();
          dispatchNotificationsUpdated();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, activeTab, refreshPendingMealIds]);

  useEffect(() => {
    const state = location.state as { tab?: string } | null;
    if (state?.tab) {
      setActiveTab(state.tab);
    }
  }, [location.state]);

  useEffect(() => {
    if (guidedTour?.isActive && guidedTour.currentStep?.moduleTab) {
      setActiveTab(guidedTour.currentStep.moduleTab);
    }
  }, [guidedTour?.isActive, guidedTour?.currentStep?.moduleTab]);

  useEffect(() => {
    const state = location.state as {
      mealId?: string;
      openComplete?: boolean;
      tab?: string;
    } | null;
    if (!user?.id || !state?.mealId || deepLinkHandled.current === state.mealId) return;

    const run = async () => {
      const meal = await fetchMealForDeepLink(state.mealId!);
      if (!meal) return;

      deepLinkHandled.current = state.mealId!;
      setActiveTab('meals');
      setSelectedDate(meal.scheduled_date);
      await markNutritionNotificationsReadForMeal(user.id, meal.id);
      await refreshPendingMealIds();

      navigate('/feeding-schedules', {
        replace: true,
        state: state.tab ? { tab: state.tab } : undefined,
      });

      if (state.openComplete && meal.status === 'scheduled') {
        setPendingMeal(meal as AutomatedMeal);
        setShowMealConfirm(true);
      }
    };

    void run();
  }, [location.state, user?.id, navigate, refreshPendingMealIds]);

  useEffect(() => {
    if (activeTab === 'meals' && user) {
      void loadAutomatedMeals();
    }
  }, [activeTab, user]);

  // Function to generate meals for the next week (always maintains 7 days ahead)
  const generateMealsForNextWeek = async () => {
    if (!user?.id) return;

    try {
      const activeSchedules = schedules.filter((s) => s.is_active && s.auto_generate_meals);
      if (activeSchedules.length === 0) {
        console.log('No active schedules with auto-generate enabled');
        return;
      }

      const totalGenerated = await generateMealsForSchedules(user.id, schedules, 7);

      if (totalGenerated > 0) {
        console.log(`✅ Total: Generated ${totalGenerated} meals for the next 7 days`);
        toast.success(`Se generaron ${totalGenerated} comidas para los próximos 7 días`);
      } else {
        console.log('✅ Todas las comidas ya están generadas para los próximos 7 días');
      }

      loadAutomatedMeals();
    } catch (error) {
      console.error('Error generating meals for next week:', error);
      toast.error("Error al generar comidas automáticas");
    }
  };

  // Load automated meals and generate if needed when schedules are loaded
  useEffect(() => {
    if (user && schedules.length > 0) {
      loadAutomatedMeals();
      // Generate meals for next week if not already generated (or regenerate daily)
      const lastGeneration = localStorage.getItem('lastMealGeneration');
      const today = new Date().toISOString().split('T')[0];
      
      if (!hasGeneratedMeals || lastGeneration !== today) {
        generateMealsForNextWeek();
        setHasGeneratedMeals(true);
        localStorage.setItem('lastMealGeneration', today);
      }
    }
  }, [schedules.length, user]);

  // Check daily if meals need to be generated (runs every hour)
  useEffect(() => {
    if (!user || schedules.length === 0) return;

    const checkAndGenerateMeals = () => {
      const lastGeneration = localStorage.getItem('lastMealGeneration');
      const today = new Date().toISOString().split('T')[0];
      
      // If we haven't generated meals today, generate them
      if (lastGeneration !== today) {
        console.log('🔄 Daily check: Generating meals for today');
        generateMealsForNextWeek();
        localStorage.setItem('lastMealGeneration', today);
      }
    };

    // Check immediately
    checkAndGenerateMeals();

    // Then check every hour
    const interval = setInterval(checkAndGenerateMeals, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(interval);
  }, [user, schedules.length]);

  // Auto-complete is handled globally by useFeedingAutomation (see Index.tsx)

  // Load foods when pet is selected
  useEffect(() => {
    if (selectedPet) {
      loadFoodsForPet(selectedPet);
    }
  }, [selectedPet]);

  // Reload automated meals when date changes and reset filters
  useEffect(() => {
    if (user) {
      setFilterPetId('all');
      setFilterStatus('all');
      loadAutomatedMeals();
    }
  }, [selectedDate]);

  const loadPets = async () => {
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('id, name, species, breed')
        .eq('owner_id', user?.id)
        .order('name');

      if (error) throw error;
      setPets(data || []);
    } catch (error) {
      console.error('Error loading pets:', error);
      toast.error("No se pudieron cargar las mascotas");
    }
  };

  const loadFoodsForPet = async (petId: string) => {
    try {
      setLoadingFoods(true);
      setAvailableFoods([]);

      const { data: petData, error: petError } = await supabase
        .from('pets')
        .select('species')
        .eq('id', petId)
        .single();

      if (petError) throw petError;
      if (!petData) return;

      const { foods } = await fetchMergedNutritionFoodCatalog({ species: petData.species });
      setAvailableFoods(
        foods.map((food) => ({
          id: food.id,
          name: food.name,
          brand: food.brand ?? '',
          food_type: food.food_type ?? 'dry_food',
          species: food.species ?? petData.species,
          calories_per_100g: food.calories_per_100g ?? 350,
          protein_per_100g: food.protein_per_100g ?? 25,
          fat_per_100g: food.fat_per_100g ?? 15,
        })),
      );
    } catch (error) {
      console.error('Error loading foods:', error);
      toast.error("No se pudieron cargar los alimentos");
    } finally {
      setLoadingFoods(false);
    }
  };

  const loadSchedules = async () => {
    try {
      console.log('Loading feeding schedules for user:', user?.id);
      
      const { data, error } = await supabase
        .from('pet_feeding_schedules')
        .select('*')
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading schedules:', error);
        // If table doesn't exist, initialize with empty data
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.log('Feeding schedules table not found, initializing with empty data');
          setSchedules([]);
          return;
        }
        throw error;
      }
      
      console.log('Feeding schedules loaded:', data);
      setSchedules(data || []);
    } catch (error) {
      console.error('Error loading schedules:', error);
      toast.error("No se pudieron cargar los horarios");
    }
  };

  const loadAutomatedMeals = async () => {
    try {
      setLoadingMeals(true);
      console.log('Loading automated meals for date:', selectedDate);
      console.log('User ID:', user?.id);
      
      const { data, error } = await supabase
        .from('automated_meals')
        .select(`
          *,
          pets (name),
          pet_foods!automated_meals_food_id_fkey (name, brand),
          pet_feeding_schedules!automated_meals_schedule_id_fkey (
            auto_complete_enabled,
            auto_complete_minutes_after
          )
        `)
        .eq('owner_id', user?.id)
        .gte('scheduled_date', selectedDate)
        .lte('scheduled_date', selectedDate)
        .order('scheduled_time');

      if (error) {
        console.error('Error loading automated meals:', error);
        // If table doesn't exist, initialize with empty data
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.log('Automated meals table not found, initializing with empty data');
          setAutomatedMeals([]);
          return;
        }
        throw error;
      }
      
      console.log('Automated meals loaded:', data);
      
      // If no meals exist for this date, try to generate them from schedules
      if (data && data.length === 0 && schedules.length > 0) {
        console.log('No meals found for', selectedDate, ', attempting to generate from schedules...');
        await generateMealsFromSchedules();
        // After generating, reload the meals
        const { data: newData, error: newError } = await supabase
          .from('automated_meals')
          .select(`
            *,
            pets (name),
            pet_foods!automated_meals_food_id_fkey (name, brand),
            pet_feeding_schedules!automated_meals_schedule_id_fkey (
              auto_complete_enabled,
              auto_complete_minutes_after
            )
          `)
          .eq('owner_id', user?.id)
          .gte('scheduled_date', selectedDate)
          .lte('scheduled_date', selectedDate)
          .order('scheduled_time');
        
        if (!newError) {
          setAutomatedMeals(newData || []);
        } else {
          setAutomatedMeals([]);
        }
        return;
      }
      
      const mealsData = data || [];
      setAllMeals(mealsData);
      setAutomatedMeals(mealsData);
    } catch (error) {
      console.error('Error loading automated meals:', error);
      toast.error("No se pudieron cargar las comidas automáticas");
    } finally {
      setLoadingMeals(false);
    }
  };

  // Filter meals based on selected filters
  useEffect(() => {
    let filtered = [...allMeals];

    // Filter by pet
    if (filterPetId !== 'all') {
      filtered = filtered.filter(meal => meal.pet_id === filterPetId);
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(meal => meal.status === filterStatus);
    }

    setAutomatedMeals(filtered);
  }, [filterPetId, filterStatus, allMeals]);

  const generateMealsFromSchedules = async () => {
    if (!user?.id) return 0;
    try {
      const dateObj = new Date(`${selectedDate}T12:00:00`);
      const generated = await generateMealsForSchedules(user.id, schedules, 1, dateObj);
      if (generated > 0) {
        toast.success(`${generated} comida(s) generada(s) para ${selectedDate}`);
      }
      return generated;
    } catch (error) {
      console.error('Error generating meals:', error);
      toast.error('No se pudieron generar las comidas');
      return 0;
    }
  };

  const addFeedingTime = () => {
    const newTime: FeedingTime = {
      time: '08:00',
      meal_type: 'breakfast',
      food_id: '', // Don't set a food_id until foods are loaded
      quantity_grams: 150
    };
    setFeedingTimes([...feedingTimes, newTime]);
  };

  const updateFeedingTime = (index: number, field: keyof FeedingTime, value: any) => {
    const updated = [...feedingTimes];
    updated[index] = { ...updated[index], [field]: value };
    setFeedingTimes(updated);
  };

  const removeFeedingTime = (index: number) => {
    setFeedingTimes(feedingTimes.filter((_, i) => i !== index));
  };

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSendNotificationsChange = async (enabled: boolean) => {
    setSendNotifications(enabled);
    if (!enabled || !user?.id || !isPushSupported()) return;

    if (getPushPermission() === 'granted') {
      await subscribeToPushNotifications(user.id);
      return;
    }

    if (getPushPermission() === 'default') {
      const ok = await subscribeToPushNotifications(user.id);
      if (ok) {
        toast.success('Notificaciones del sistema activadas');
      } else {
        toast.message('Activa las notificaciones en el navegador para recibir recordatorios con la app cerrada');
      }
    }
  };

  const saveSchedule = async () => {
    if (!selectedPet || !scheduleName || feedingTimes.length === 0) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    setShowScheduleConfirm(true);
  };

  const performSaveSchedule = async () => {
    setShowScheduleConfirm(false);
    setLoading(true);
    try {
      const scheduleData = {
        owner_id: user?.id,
        pet_id: selectedPet,
        schedule_name: scheduleName,
        feeding_times: feedingTimes,
        days_of_week: selectedDays,
        start_date: startDate,
        end_date: endDate || null,
        auto_generate_meals: autoGenerate,
        send_notifications: sendNotifications,
        notification_minutes_before: notificationMinutes,
        auto_complete_enabled: autoCompleteEnabled,
        auto_complete_minutes_after: autoCompleteMinutes,
        notes: notes || null
      };

      let savedSchedule: FeedingSchedule | null = null;

      if (editingSchedule) {
        const { data, error } = await supabase
          .from('pet_feeding_schedules')
          .update(scheduleData)
          .eq('id', editingSchedule)
          .select()
          .single();
        if (error) throw error;
        savedSchedule = data;
      } else {
        const { data, error } = await supabase
          .from('pet_feeding_schedules')
          .insert(scheduleData)
          .select()
          .single();
        if (error) throw error;
        savedSchedule = data;
      }

      if (autoGenerate && savedSchedule && user?.id) {
        const generated = await generateMealsForSchedule(user.id, savedSchedule, 7);
        if (generated > 0) {
          console.log(`Generated ${generated} meals for saved schedule`);
        }
      }

      toast.success(`Horario ${editingSchedule ? 'actualizado' : 'creado'} exitosamente`);

      if (!editingSchedule) {
        void guidedTour?.notifySectionSaved('nutrition');
      }

      resetForm();
      loadSchedules();
      void refreshPendingMealIds();
      dispatchNotificationsUpdated();
      window.dispatchEvent(new CustomEvent('feeding-notifications-updated'));
      setHasGeneratedMeals(false);
      loadAutomatedMeals();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error("No se pudo guardar el horario");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedPet('');
    setScheduleName('');
    setFeedingTimes([]);
    setSelectedDays([1, 2, 3, 4, 5, 6, 7]);
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setAutoGenerate(true);
    setSendNotifications(true);
    setNotificationMinutes(15);
    setAutoCompleteEnabled(false);
    setAutoCompleteMinutes(30);
    setNotes('');
    setEditingSchedule(null);
  };

  const editSchedule = (schedule: FeedingSchedule) => {
    setEditingSchedule(schedule.id);
    setSelectedPet(schedule.pet_id);
    setScheduleName(schedule.schedule_name);
    setFeedingTimes(schedule.feeding_times);
    setSelectedDays(schedule.days_of_week);
    setStartDate(schedule.start_date);
    setEndDate(schedule.end_date || '');
    setAutoGenerate(schedule.auto_generate_meals);
    setSendNotifications(schedule.send_notifications);
    setNotificationMinutes(schedule.notification_minutes_before);
    setAutoCompleteEnabled(schedule.auto_complete_enabled);
    setAutoCompleteMinutes(schedule.auto_complete_minutes_after);
    setNotes(schedule.notes || '');
    
    // Switch to the create/edit tab
    setActiveTab('create');
  };

  const toggleScheduleStatus = async (scheduleId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('pet_feeding_schedules')
        .update({ is_active: !isActive })
        .eq('id', scheduleId);

      if (error) throw error;

      toast.success(`Horario ${!isActive ? 'activado' : 'pausado'}`);

      loadSchedules();
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast.error("No se pudo actualizar el horario");
    }
  };

  const deleteSchedule = async (scheduleId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este horario de alimentación?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('pet_feeding_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      toast.success("Horario eliminado correctamente");

      loadSchedules();
      loadAutomatedMeals();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error("No se pudo eliminar el horario");
    }
  };

  const requestCompleteMeal = (meal: AutomatedMeal) => {
    setPendingMeal(meal);
    setShowMealConfirm(true);
    if (user?.id) {
      void markNutritionNotificationsReadForMeal(user.id, meal.id).then(() => {
        void refreshPendingMealIds();
        dispatchNotificationsUpdated();
      });
    }
  };

  const confirmCompleteMeal = async () => {
    if (!pendingMeal) return;
    setShowMealConfirm(false);
    try {
      await FeedingScheduleService.markMealAsCompleted(pendingMeal.id, user?.id || '');
      if (user?.id) {
        await markNutritionNotificationsReadForMeal(user.id, pendingMeal.id);
      }
      toast.success("Comida marcada como completada y registrada en el historial");
      loadAutomatedMeals();
      void refreshPendingMealIds();
      dispatchNotificationsUpdated();
      window.dispatchEvent(new CustomEvent('feeding-notifications-updated'));
    } catch (error) {
      console.error('Error marking meal as completed:', error);
      toast.error("No se pudo marcar la comida como completada");
    } finally {
      setPendingMeal(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'skipped':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'modified':
        return <Edit className="w-4 h-4 text-blue-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'skipped':
        return 'bg-red-50 border-red-200';
      case 'modified':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (initialLoading) {
    return (
      <DashboardShell variant="plain">
        <PageLoader variant="inline" message="Cargando nutrición…" />
      </DashboardShell>
    );
  }

  return (
    <>
    <DashboardShell variant="plain">
      <PageHeader
        variant="solid"
        accent="mint"
        title="Nutrición"
        subtitle="Horarios automáticos, registro manual y análisis nutricional de tus mascotas"
      >
        <Utensils className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
      </PageHeader>

      {pendingMealNotificationIds.size > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200/80 px-4 py-3 text-sm text-amber-900">
          Tienes {pendingMealNotificationIds.size} recordatorio
          {pendingMealNotificationIds.size !== 1 ? 's' : ''} de comida sin revisar. Abre la pestaña
          Comidas para registrarlas.
        </div>
      )}

      <MobileTabStrip
        tabs={nutritionTabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="solid"
        accent="mint"
        rowSizes={[3, 2]}
      />

      {activeTab === 'schedules' && (
        <div className="space-y-4">
            {schedules.length === 0 ? (
              <MobileSectionCard variant="plain">
                <div className="text-center py-10 px-4">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <h3 className="font-semibold text-gray-800 mb-1">No hay horarios configurados</h3>
                  <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
                    Crea un horario automático o registra comidas manualmente en las otras pestañas.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button className={landingBtnSolidMint} onClick={() => setActiveTab('create')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Crear horario
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab('manual')}>
                      Registro manual
                    </Button>
                  </div>
                </div>
              </MobileSectionCard>
            ) : (
              schedules.map((schedule, index) => {
                const petName = pets.find((p) => p.id === schedule.pet_id)?.name || 'Desconocida';
                const iconBg = solidIconBgAt(index);
                return (
                  <MobileSectionCard key={schedule.id} variant="plain" className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm', iconBg)}
                      >
                        {schedule.is_active ? (
                          <Play className="w-5 h-5" />
                        ) : (
                          <Pause className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-gray-900 truncate">{schedule.schedule_name}</h3>
                          <Badge variant={schedule.is_active ? 'default' : 'secondary'} className="text-[10px]">
                            {schedule.is_active ? 'Activo' : 'Pausado'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{petName}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {schedule.feeding_times.length} comida(s)/día ·{' '}
                          {schedule.days_of_week.length === 7
                            ? 'Todos los días'
                            : `${schedule.days_of_week.length} días/semana`}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {schedule.feeding_times.map((time, timeIndex) => (
                            <Badge key={timeIndex} variant="outline" className="text-[10px] font-normal">
                              {time.time} · {mealTypes.find((m) => m.value === time.meal_type)?.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1 mt-4 pt-3 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => editSchedule(schedule)}
                        className="flex flex-col items-center gap-1 py-2 rounded-xl text-gray-600 hover:bg-gray-100 min-h-[52px] justify-center text-[10px] font-medium"
                      >
                        <Edit size={18} />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleScheduleStatus(schedule.id, schedule.is_active)}
                        className="flex flex-col items-center gap-1 py-2 rounded-xl text-landing-aqua-dark hover:bg-landing-aqua/10 min-h-[52px] justify-center text-[10px] font-medium"
                      >
                        {schedule.is_active ? <Pause size={18} /> : <Play size={18} />}
                        {schedule.is_active ? 'Pausar' : 'Activar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSchedule(schedule.id)}
                        className="flex flex-col items-center gap-1 py-2 rounded-xl text-red-500 hover:bg-red-50 min-h-[52px] justify-center text-[10px] font-medium"
                      >
                        <Trash2 size={18} />
                        Eliminar
                      </button>
                    </div>
                  </MobileSectionCard>
                );
              })
            )}
        </div>
      )}

      {activeTab === 'create' && (
        <div className="space-y-4">
          {pets.length === 0 ? (
            <MobileSectionCard variant="plain">
              <div className="text-center py-10 px-4">
                <PawPrint className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium text-gray-800">Primero agrega una mascota</p>
                <p className="text-sm text-gray-500 mt-1 mb-4">Necesitas una mascota para crear horarios de alimentación.</p>
                <Button className={landingBtnSolidMint} onClick={() => navigate('/pet-creation')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar mascota
                </Button>
              </div>
            </MobileSectionCard>
          ) : (
          <MobileSectionCard variant="plain" className="overflow-hidden">
            <div className="px-4 sm:px-5 pt-5 pb-4 border-b border-gray-100 bg-landing-mint/10">
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <Settings className="w-5 h-5 text-landing-mint-dark" />
                {editingSchedule ? 'Editar horario' : 'Nuevo horario'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Configura comidas automáticas para tu mascota.
              </p>
            </div>

            <div className="p-4 sm:p-5 space-y-5 pb-6">
              <NutritionFormSection title="Información básica" icon={PawPrint}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="pet">Mascota *</Label>
                    <Select value={selectedPet} onValueChange={setSelectedPet}>
                      <SelectTrigger className={nutritionFieldClass}>
                        <SelectValue placeholder="Seleccionar mascota" />
                      </SelectTrigger>
                      <SelectContent>
                        {pets.map((pet) => (
                          <SelectItem key={pet.id} value={pet.id}>
                            {pet.name} ({pet.breed})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="scheduleName">Nombre del horario *</Label>
                    <Input
                      id="scheduleName"
                      className={nutritionFieldClass}
                      value={scheduleName}
                      onChange={(e) => setScheduleName(e.target.value)}
                      placeholder="Ej: Horario mañana"
                    />
                  </div>
                </div>
              </NutritionFormSection>

              <NutritionFormSection
                title="Horarios de comida"
                description="Agrega una o más comidas por día."
                icon={Clock}
              >
                <div className="space-y-3">
                  {feedingTimes.map((time, index) => (
                    <div key={index} className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Comida {index + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFeedingTime(index)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Hora</Label>
                          <Input
                            type="time"
                            className={nutritionFieldClass}
                            value={time.time}
                            onChange={(e) => updateFeedingTime(index, 'time', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Tipo</Label>
                          <Select
                            value={time.meal_type}
                            onValueChange={(value) => updateFeedingTime(index, 'meal_type', value)}
                          >
                            <SelectTrigger className={nutritionFieldClass}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {mealTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.icon} {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Alimento</Label>
                        <Select
                          value={time.food_id}
                          onValueChange={(value) => updateFeedingTime(index, 'food_id', value)}
                          disabled={!selectedPet || loadingFoods || availableFoods.length === 0}
                        >
                          <SelectTrigger className={nutritionFieldClass}>
                            <SelectValue
                              placeholder={
                                !selectedPet
                                  ? 'Selecciona una mascota'
                                  : loadingFoods
                                    ? 'Cargando...'
                                    : availableFoods.length === 0
                                      ? 'Sin alimentos'
                                      : 'Seleccionar alimento'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {availableFoods.map((food) => (
                              <SelectItem key={food.id} value={food.id}>
                                {food.brand} - {food.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Cantidad (g)</Label>
                        <Input
                          type="number"
                          min="1"
                          className={nutritionFieldClass}
                          value={time.quantity_grams}
                          onChange={(e) =>
                            updateFeedingTime(index, 'quantity_grams', parseFloat(e.target.value))
                          }
                        />
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addFeedingTime}
                    className="w-full min-h-[44px] border-dashed border-landing-aqua/40 text-landing-aqua-dark hover:bg-landing-aqua/5"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar comida
                  </Button>
                </div>
              </NutritionFormSection>

              <NutritionFormSection title="Días de la semana" icon={Calendar}>
                <WeekDayPills days={daysOfWeek} selected={selectedDays} onToggle={toggleDay} />
              </NutritionFormSection>

              <NutritionFormSection title="Vigencia" icon={Calendar}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Fecha de inicio</Label>
                    <Input
                      id="startDate"
                      type="date"
                      className={nutritionFieldClass}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">Fecha de fin (opcional)</Label>
                    <Input
                      id="endDate"
                      type="date"
                      className={nutritionFieldClass}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </NutritionFormSection>

              <NutritionFormSection title="Opciones automáticas" icon={Bell}>
                <div className="space-y-3">
                  <SettingToggleRow
                    label="Generar comidas automáticamente"
                    description="Crear entradas en el historial de nutrición"
                    checked={autoGenerate}
                    onCheckedChange={setAutoGenerate}
                  />
                  <SettingToggleRow
                    label="Enviar notificaciones"
                    description="Recordatorios en la campana y notificación del sistema (app cerrada)"
                    checked={sendNotifications}
                    onCheckedChange={handleSendNotificationsChange}
                  >
                    {sendNotifications && (
                      <div>
                        <Label htmlFor="notificationMinutes" className="text-xs">
                          Minutos antes
                        </Label>
                        <Input
                          id="notificationMinutes"
                          type="number"
                          min="1"
                          max="60"
                          className={nutritionFieldClass}
                          value={notificationMinutes}
                          onChange={(e) => setNotificationMinutes(parseInt(e.target.value))}
                        />
                      </div>
                    )}
                  </SettingToggleRow>
                  <SettingToggleRow
                    label="Auto-completar comidas"
                    description="Marcar como completadas tras el horario programado"
                    checked={autoCompleteEnabled}
                    onCheckedChange={setAutoCompleteEnabled}
                  >
                    {autoCompleteEnabled && (
                      <div>
                        <Label htmlFor="autoCompleteMinutes" className="text-xs">
                          Minutos después del horario
                        </Label>
                        <Input
                          id="autoCompleteMinutes"
                          type="number"
                          min="5"
                          max="120"
                          className={nutritionFieldClass}
                          value={autoCompleteMinutes}
                          onChange={(e) => setAutoCompleteMinutes(parseInt(e.target.value))}
                        />
                      </div>
                    )}
                  </SettingToggleRow>
                </div>
              </NutritionFormSection>

              <div>
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Instrucciones especiales sobre este horario..."
                  rows={3}
                  className="mt-1.5 resize-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  type="button"
                  onClick={saveSchedule}
                  disabled={loading}
                  data-blueprint-guided="create-feeding-schedule"
                  className={cn('flex-1 min-h-[48px]', landingBtnSolidMint)}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingSchedule ? 'Actualizar horario' : 'Crear horario'}
                </Button>
                {editingSchedule && (
                  <Button type="button" variant="outline" onClick={resetForm} className="min-h-[48px]">
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          </MobileSectionCard>
          )}
        </div>
      )}

      {activeTab === 'meals' && (
        <div className="space-y-4">
          <MobileSectionCard variant="plain" className="overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-gray-100">
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <Utensils className="w-5 h-5 text-landing-aqua-dark" />
                Comidas programadas
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Generadas desde tus horarios activos en &quot;Horarios&quot;.
              </p>
            </div>

            <div className="p-4 space-y-4">
              {/* Collapsible "How it works" section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg mb-6">
                <button
                  onClick={() => setShowHowItWorks(!showHowItWorks)}
                  className="w-full flex items-center justify-between p-4 hover:bg-blue-100 transition-colors rounded-lg"
                >
                  <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                    <span>📋</span>
                    <span>¿Cómo funciona la generación automática?</span>
                  </h4>
                  {showHowItWorks ? (
                    <ChevronUp className="w-5 h-5 text-blue-900" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-blue-900" />
                  )}
                </button>
                {showHowItWorks && (
                  <div className="px-4 pb-4 text-sm text-blue-800 space-y-3">
                    <div>
                      <strong>🔄 Generación Automática:</strong>
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                        <li>El sistema genera comidas automáticamente para los <strong>próximos 7 días</strong></li>
                        <li>Las comidas se crean <strong>inmediatamente</strong> cuando cargas la página (si tienes horarios activos)</li>
                        <li>El sistema verifica cada hora si faltan comidas y las genera automáticamente</li>
                        <li>Las comidas aparecen <strong>el mismo día</strong> de la alimentación programada (no un día antes)</li>
                      </ul>
                    </div>
                    <div>
                      <strong>📅 Ejemplo:</strong>
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                        <li>Si hoy es Lunes y tienes un horario para "Lunes a Viernes a las 8:00 AM"</li>
                        <li>El sistema genera comidas para: Hoy (Lunes), Mañana (Martes), Miércoles, Jueves, Viernes, Sábado, Domingo</li>
                        <li>Cada día a las 8:00 AM verás la comida programada para ese día</li>
                      </ul>
                    </div>
                    <div>
                      <strong>✅ Completar Comidas:</strong>
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                        <li><strong>Manual:</strong> Cuando alimentas a tu mascota, haz clic en el botón "Completar" para registrar la comida inmediatamente en el historial de nutrición</li>
                        <li><strong>Automático:</strong> Si habilitas "Auto-Completar Comidas" en la configuración del horario, las comidas se marcarán automáticamente como completadas después del tiempo que configures (ej: 30 minutos después de las 8:00 AM = se completa a las 8:30 AM)</li>
                        <li>El sistema verifica cada 5 minutos si hay comidas que deben auto-completarse</li>
                        <li>Las comidas completadas (manual o automático) se registran en el historial y aparecen en la tab "Análisis"</li>
                        <li>Puedes combinar ambos métodos: si completas manualmente antes del tiempo configurado, no se auto-completará</li>
                      </ul>
                    </div>
                    <div>
                      <strong>⚙️ Configuración:</strong>
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                        <li>Los horarios deben estar <strong>activos</strong> y tener <strong>"Generar Comidas Automáticamente"</strong> habilitado</li>
                        <li>El botón "Generar Comidas" crea manualmente las comidas para la fecha seleccionada</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Filters */}
              <NutritionFormSection title="Filtros" icon={Filter}>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="selectedDate">Fecha</Label>
                    <Input
                      id="selectedDate"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        loadAutomatedMeals();
                      }}
                      disabled={loadingMeals}
                      className={nutritionFieldClass}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="filterPet">Mascota</Label>
                      <Select value={filterPetId} onValueChange={setFilterPetId}>
                        <SelectTrigger className={nutritionFieldClass}>
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las mascotas</SelectItem>
                          {pets.map((pet) => (
                            <SelectItem key={pet.id} value={pet.id}>
                              {pet.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="filterStatus">Estado</Label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className={nutritionFieldClass}>
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="scheduled">Programada</SelectItem>
                          <SelectItem value="completed">Completada</SelectItem>
                          <SelectItem value="skipped">Omitida</SelectItem>
                          <SelectItem value="modified">Modificada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {(filterPetId !== 'all' || filterStatus !== 'all') && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFilterPetId('all');
                        setFilterStatus('all');
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Limpiar filtros
                    </Button>
                  )}
                </div>
              </NutritionFormSection>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={loadAutomatedMeals}
                  disabled={loadingMeals}
                  className="min-h-[44px] flex-1 sm:flex-none"
                >
                  {loadingMeals ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-landing-aqua-dark mr-2" />
                      Cargando...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Actualizar
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    try {
                      await generateMealsFromSchedules();
                      await loadAutomatedMeals();
                    } catch (error) {
                      console.error('Error generating meals:', error);
                    }
                  }}
                  disabled={loadingMeals || schedules.length === 0}
                  className={cn('min-h-[44px] flex-1 sm:flex-none', landingBtnSolidMint)}
                  title={
                    schedules.length === 0
                      ? 'No hay horarios activos. Crea un horario primero.'
                      : 'Genera comidas para la fecha seleccionada'
                  }
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Generar comidas
                </Button>
              </div>
              <p className="text-xs text-gray-500 text-center sm:text-left">
                Mostrando {automatedMeals.length} de {allMeals.length} comidas
              </p>
              
              {schedules.length > 0 && (
                <div className="rounded-xl bg-landing-mint/10 border border-landing-mint/20 p-3">
                  <p className="text-sm text-gray-700">
                    <strong>Horarios activos:</strong> {schedules.filter((s) => s.is_active).length} de{' '}
                    {schedules.length}
                    {schedules.filter((s) => s.is_active && s.auto_generate_meals).length > 0 && (
                      <span className="text-landing-mint-dark ml-1">
                        ({schedules.filter((s) => s.is_active && s.auto_generate_meals).length} con auto-generación)
                      </span>
                    )}
                  </p>
                </div>
              )}

              {loadingMeals ? (
                <SectionLoader message={`Cargando comidas para ${selectedDate}…`} className="py-8" />
              ) : automatedMeals.length === 0 ? (
                <div className="text-center py-10 px-4 rounded-xl border border-dashed border-gray-200">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium text-gray-800">Sin comidas para esta fecha</p>
                  <p className="text-sm text-gray-500 mt-1">Prueba otra fecha o genera comidas manualmente.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {automatedMeals.map((meal) => {
                    const hasPendingReminder = pendingMealNotificationIds.has(meal.id);
                    return (
                    <div
                      key={meal.id}
                      className={cn(
                        'rounded-xl border p-4 bg-white/90',
                        getStatusColor(meal.status),
                        hasPendingReminder && 'ring-2 ring-amber-300/80 ring-offset-1',
                      )}
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            {getStatusIcon(meal.status)}
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-semibold text-gray-900">{meal.scheduled_time}</span>
                                <Badge variant="outline" className="text-[10px]">
                                  {new Date(meal.scheduled_date).toLocaleDateString('es-ES', {
                                    day: '2-digit',
                                    month: '2-digit',
                                  })}
                                </Badge>
                                <Badge variant="outline" className="text-[10px]">
                                  {mealTypes.find((m) => m.value === meal.meal_type)?.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mt-1 truncate">
                                {meal.pets?.name} · {meal.pet_foods?.brand} - {meal.pet_foods?.name} ·{' '}
                                {meal.quantity_grams}g
                              </p>
                              {hasPendingReminder && (
                                <span className="inline-flex mt-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold">
                                  Es hora de alimentar
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {meal.status === 'scheduled' && (
                              <Button
                                size="sm"
                                onClick={() => requestCompleteMeal(meal)}
                                className={cn('min-h-[40px]', landingBtnSolidMint)}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Completar
                              </Button>
                            )}
                            <Badge variant={meal.status === 'completed' ? 'default' : 'secondary'}>
                              {meal.status === 'completed'
                                ? 'Completada'
                                : meal.status === 'skipped'
                                  ? 'Omitida'
                                  : meal.status === 'modified'
                                    ? 'Modificada'
                                    : 'Programada'}
                            </Badge>
                          </div>
                        </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </MobileSectionCard>
        </div>
      )}

      {activeTab === 'manual' && (
        <div className="space-y-4">
          <ManualFeedingForm />
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <NutritionAnalytics />
        </div>
      )}

      {activeTab === 'comparison' && (
        <div className="space-y-4">
          <NutritionComparison />
        </div>
      )}
    </DashboardShell>

    <ActionConfirmDialog
      open={showScheduleConfirm}
      onOpenChange={setShowScheduleConfirm}
      title={editingSchedule ? 'Confirmar actualización de horario' : 'Confirmar horario de alimentación'}
      description="Revisa el horario antes de guardar."
      confirmLabel={editingSchedule ? 'Actualizar' : 'Crear horario'}
      fields={[
        { label: 'Mascota', value: pets.find((p) => p.id === selectedPet)?.name || '—' },
        { label: 'Nombre', value: scheduleName },
        {
          label: 'Horarios',
          value: feedingTimes.map((t) => `${t.time} (${mealTypes.find((m) => m.value === t.meal_type)?.label || t.meal_type})`).join(', '),
        },
        {
          label: 'Días',
          value: selectedDays.map((d) => daysOfWeek.find((day) => day.value === d)?.label || String(d)).join(', '),
        },
        { label: 'Desde', value: startDate },
        ...(endDate ? [{ label: 'Hasta', value: endDate }] : []),
        { label: 'Auto-generar comidas', value: autoGenerate ? 'Sí' : 'No' },
      ]}
      onConfirm={performSaveSchedule}
      loading={loading}
      onEdit={() => setShowScheduleConfirm(false)}
    />

    <ActionConfirmDialog
      open={showMealConfirm}
      onOpenChange={(open) => {
        setShowMealConfirm(open);
        if (!open) setPendingMeal(null);
      }}
      title="Confirmar registro de comida"
      description="¿Registrar esta comida en el historial de nutrición?"
      confirmLabel="Registrar comida"
      fields={
        pendingMeal
          ? [
              { label: 'Mascota', value: pendingMeal.pets?.name || '—' },
              {
                label: 'Alimento',
                value: `${pendingMeal.pet_foods?.brand || ''} ${pendingMeal.pet_foods?.name || ''}`.trim() || '—',
              },
              { label: 'Cantidad', value: `${pendingMeal.quantity_grams} g` },
              { label: 'Hora', value: pendingMeal.scheduled_time },
              {
                label: 'Fecha',
                value: new Date(pendingMeal.scheduled_date).toLocaleDateString('es-ES'),
              },
              {
                label: 'Comida',
                value: mealTypes.find((m) => m.value === pendingMeal.meal_type)?.label || pendingMeal.meal_type,
              },
            ]
          : []
      }
      onConfirm={confirmCompleteMeal}
      onEdit={() => setShowMealConfirm(false)}
    />
    </>
  );
};

export default FeedingScheduleManager;
