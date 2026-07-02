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
import { ActionConfirmDialog } from './ui/ActionConfirmDialog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Activity,
  Plus,
  Calendar,
  Target,
  Zap,
  Timer,
  BarChart3,
  TrendingUp,
  Filter,
  Footprints,
  Play,
  Waves,
  Trophy,
  Dumbbell,
  MoreHorizontal,
  Edit,
  Trash2,
  PawPrint,
  Info,
  Flame,
} from 'lucide-react';
import PageHeader from './PageHeader';
import { PageLoader } from './PageLoader';
import { DashboardShell } from './dashboard/DashboardShell';
import { MobileTabStrip, type MobileTabItem } from './mobile/MobileTabStrip';
import { MobileSectionCard } from './mobile/MobileUi';
import { landingBtnPrimary, landingCardThemes, landingChartColors } from '@/lib/landingTheme';
import { cn } from '@/lib/utils';
import { useBlueprintGuidedTourOptional } from '@/contexts/BlueprintGuidedTourContext';
import { formatPetOptionLabel } from '@/utils/petLabels';
import {
  WEEKLY_GOAL_MINUTES,
  getExerciseNotificationIdsForPet,
  getExerciseReminderNotificationId,
  getWeeklyGoalNotificationId,
  getWeekStartStr,
  loadExercisePageUnreadIds,
  markExerciseNotificationsRead,
  markExerciseNotificationsReadForPet,
} from '@/utils/exerciseNotifications';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  weight: number;
}

interface ExerciseSession {
  id: string;
  pet_id: string;
  pet_name: string;
  exercise_type: string;
  duration_minutes: number;
  intensity: string;
  date: string;
  notes: string;
  calories_burned: number;
  created_at: string;
}

const Trazabilidad: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const deepLinkHandled = useRef<string | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [exerciseSessions, setExerciseSessions] = useState<ExerciseSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [showExerciseConfirm, setShowExerciseConfirm] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedPetForAnalytics, setSelectedPetForAnalytics] = useState('all');
  const [activeTab, setActiveTab] = useState('register');
  const guidedTour = useBlueprintGuidedTourOptional();
  const [editingSession, setEditingSession] = useState<ExerciseSession | null>(null);
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());

  // Form states
  const [selectedPet, setSelectedPet] = useState('');
  const [exerciseType, setExerciseType] = useState('');
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState('');
  const [exerciseDate, setExerciseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [calculatedCalories, setCalculatedCalories] = useState(0);

  const loadPets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('id, name, species, breed, weight')
        .eq('owner_id', user?.id);

      if (error) throw error;
      setPets(data || []);
    } catch (error) {
      console.error('Error loading pets:', error);
      toast.error('No se pudieron cargar tus mascotas.');
    }
  }, [user?.id]);

  const loadExerciseSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('exercise_sessions')
        .select(`
          *,
          pets(name)
        `)
        .eq('owner_id', user?.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error loading exercise sessions:', error);
        setExerciseSessions([]);
        return;
      }

      const formattedSessions =
        data?.map((session) => ({
          ...session,
          pet_name: session.pets?.name || 'Mascota desconocida',
        })) || [];

      setExerciseSessions(formattedSessions);
    } catch (error) {
      console.error('Error loading exercise sessions:', error);
      setExerciseSessions([]);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setInitialLoading(false);
      return;
    }

    const loadAll = async () => {
      setInitialLoading(true);
      await Promise.all([loadPets(), loadExerciseSessions()]);
      setInitialLoading(false);
    };

    void loadAll();
  }, [user, loadPets, loadExerciseSessions]);

  const refreshUnreadIds = useCallback(async () => {
    if (!user?.id) return;
    const ids = await loadExercisePageUnreadIds(user.id);
    setUnreadIds(ids);
  }, [user?.id]);

  useEffect(() => {
    void refreshUnreadIds();
  }, [refreshUnreadIds]);

  useEffect(() => {
    const onUpdate = () => {
      void refreshUnreadIds();
    };
    window.addEventListener('notifications-updated', onUpdate);
    return () => window.removeEventListener('notifications-updated', onUpdate);
  }, [refreshUnreadIds]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('exercise_page_notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'exercise_sessions', filter: `owner_id=eq.${user.id}` },
        () => {
          void loadExerciseSessions();
          void refreshUnreadIds();
          dispatchNotificationsUpdated();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pet_reminders', filter: `owner_id=eq.${user.id}` },
        () => {
          void refreshUnreadIds();
          dispatchNotificationsUpdated();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadExerciseSessions, refreshUnreadIds]);

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
      petId?: string;
      petReminderId?: string;
      tab?: string;
    } | null;
    const linkKey = state?.petReminderId || state?.petId;
    if (!user?.id || !linkKey || deepLinkHandled.current === linkKey) return;

    deepLinkHandled.current = linkKey;
    if (state.tab) setActiveTab(state.tab);
    if (state.petId) setSelectedPet(state.petId);

    const markRead = async () => {
      if (state.petReminderId) {
        await markExerciseNotificationsRead(user.id, [
          getExerciseReminderNotificationId(state.petReminderId),
        ]);
      } else if (state.petId) {
        await markExerciseNotificationsReadForPet(user.id, state.petId);
      }
      await refreshUnreadIds();
    };

    void markRead();

    navigate('/trazabilidad', {
      replace: true,
      state: state.tab ? { tab: state.tab } : undefined,
    });
  }, [location.state, user?.id, navigate, refreshUnreadIds]);

  // Calculate calories when form changes
  useEffect(() => {
    if (selectedPet && duration && intensity && exerciseType) {
      const selectedPetData = pets.find(p => p.id === selectedPet);
      const durationNum = parseFloat(duration);
      
      if (selectedPetData && durationNum > 0) {
        // Base calories per minute for different exercise types
        const exerciseCalorieRates: Record<string, number> = {
          'walk': 2,           // Caminata - Low intensity
          'run': 8,            // Carrera - High intensity
          'play': 4,           // Juego - Medium intensity
          'swimming': 6,       // Natación - High intensity
          'agility': 7,        // Agilidad - High intensity
          'training': 5,       // Entrenamiento - Medium-High intensity
          'fetch': 3,          // Buscar Pelota - Medium intensity
          'hiking': 5,         // Senderismo - Medium-High intensity
          'tug': 4,            // Tirar de la Cuerda - Medium intensity
          'hide': 3,           // Buscar y Encontrar - Medium intensity
          'obstacle': 6,       // Carrera de Obstáculos - High intensity
          'other': 3           // Otro - Default medium
        };

        // Get base calories per minute for this exercise
        const baseCaloriesPerMinute = exerciseCalorieRates[exerciseType] || 3;
        
        // Intensity multipliers
        const intensityMultiplier = intensity === 'low' ? 0.7 : intensity === 'medium' ? 1.0 : 1.3;
        
        // Pet weight factor (heavier pets burn more calories)
        const weightFactor = selectedPetData.weight
          ? Math.sqrt(Number(selectedPetData.weight) / 20)
          : 1;
        
        // Calculate total calories
        const calories = Math.round(baseCaloriesPerMinute * durationNum * intensityMultiplier * weightFactor);
        
        setCalculatedCalories(calories);
      }
    } else {
      setCalculatedCalories(0);
    }
  }, [selectedPet, duration, intensity, exerciseType, pets]);

  const resetForm = () => {
    setSelectedPet('');
    setExerciseType('');
    setDuration('');
    setIntensity('');
    setExerciseDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setCalculatedCalories(0);
    setEditingSession(null);
  };

  const loadSessionForEdit = (session: ExerciseSession) => {
    setEditingSession(session);
    setSelectedPet(session.pet_id);
    setExerciseType(session.exercise_type);
    setDuration(session.duration_minutes.toString());
    setIntensity(session.intensity);
    setExerciseDate(session.date);
    setNotes(session.notes || '');
    setCalculatedCalories(session.calories_burned);
    // Switch to register tab
    setActiveTab('register');
    // Scroll to top of form
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const saveExerciseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPet || !exerciseType || !duration || !intensity) {
      toast.error('Por favor, completa todos los campos obligatorios.');
      return;
    }

    const durationNum = parseInt(duration, 10);
    if (!Number.isFinite(durationNum) || durationNum <= 0) {
      toast.error('La duración debe ser un número entero mayor a 0.');
      return;
    }

    setShowExerciseConfirm(true);
  };

  const performSaveExercise = async () => {
    setShowExerciseConfirm(false);
    setLoading(true);
    try {
      const caloriesBurned = calculatedCalories;

      const exerciseData = {
        pet_id: selectedPet,
        exercise_type: exerciseType,
        duration_minutes: parseInt(duration, 10),
        intensity,
        date: exerciseDate,
        notes: notes || null,
        calories_burned: caloriesBurned,
        owner_id: user?.id,
      };

      const wasEditing = !!editingSession;

      if (editingSession) {
        const { error } = await supabase
          .from('exercise_sessions')
          .update(exerciseData)
          .eq('id', editingSession.id);

        if (error) throw error;
        toast.success('¡Sesión de ejercicio actualizada correctamente!');
      } else {
        const { error } = await supabase.from('exercise_sessions').insert([exerciseData]);

        if (error) throw error;
        toast.success('¡Sesión de ejercicio registrada correctamente!');
        void guidedTour?.notifySectionSaved('exercise');
      }

      resetForm();
      await loadExerciseSessions();
      if (user?.id && selectedPet) {
        await markExerciseNotificationsReadForPet(user.id, selectedPet);
      }
      void refreshUnreadIds();
      dispatchNotificationsUpdated();
      setActiveTab('history');
      if (!wasEditing) {
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
      }
    } catch (error: any) {
      console.error('Error saving exercise session:', error);
      const errorMessage = error?.message || "No se pudo registrar la sesión de ejercicio.";
      toast.error(
        editingSession 
          ? `No se pudo actualizar la sesión de ejercicio. ${errorMessage}`
          : `No se pudo registrar la sesión de ejercicio. ${errorMessage}`
      );
    } finally {
      setLoading(false);
    }
  };

  const deleteExerciseSession = async (sessionId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta sesión de ejercicio?')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('exercise_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      toast.success("¡Sesión de ejercicio eliminada correctamente!");

      await loadExerciseSessions();
      void refreshUnreadIds();
      dispatchNotificationsUpdated();
    } catch (error) {
      console.error('Error deleting exercise session:', error);
      toast.error("No se pudo eliminar la sesión de ejercicio.");
    } finally {
      setLoading(false);
    }
  };

  const exerciseTypes = [
    { value: 'walk', label: 'Caminata', icon: Footprints },
    { value: 'run', label: 'Carrera', icon: Activity },
    { value: 'play', label: 'Juego', icon: Play },
    { value: 'swimming', label: 'Natación', icon: Waves },
    { value: 'agility', label: 'Agilidad', icon: Trophy },
    { value: 'training', label: 'Entrenamiento', icon: Dumbbell },
    { value: 'fetch', label: 'Buscar Pelota', icon: Target },
    { value: 'hiking', label: 'Senderismo', icon: Footprints },
    { value: 'tug', label: 'Tirar de la Cuerda', icon: Activity },
    { value: 'hide', label: 'Buscar y Encontrar', icon: Target },
    { value: 'obstacle', label: 'Carrera de Obstáculos', icon: Trophy },
    { value: 'other', label: 'Otro', icon: MoreHorizontal }
  ];

  const intensityLevels = [
    { value: 'low', label: 'Baja', color: 'bg-landing-mint/20 text-landing-mint-dark border border-landing-mint/30' },
    { value: 'medium', label: 'Media', color: 'bg-landing-mango/15 text-landing-mango-dark border border-landing-mango/30' },
    { value: 'high', label: 'Alta', color: 'bg-red-100 text-red-800 border border-red-200' },
  ];

  const petHasUnread = useCallback(
    (petId: string) => {
      const weekStart = getWeekStartStr();
      const ids = [
        ...getExerciseNotificationIdsForPet(petId, weekStart),
      ];
      return ids.some((id) => unreadIds.has(id));
    },
    [unreadIds],
  );

  const registerUnreadCount = useMemo(
    () => pets.filter((pet) => petHasUnread(pet.id)).length,
    [pets, petHasUnread],
  );

  const exerciseTabs: MobileTabItem[] = useMemo(
    () => [
      {
        id: 'register',
        label: 'Registrar Ejercicio',
        shortLabel: registerUnreadCount
          ? `Registrar · ${registerUnreadCount} aviso${registerUnreadCount !== 1 ? 's' : ''}`
          : 'Registrar',
        icon: Plus,
        gradientIndex: 0,
      },
      { id: 'analytics', label: 'Análisis', shortLabel: 'Análisis', icon: BarChart3, gradientIndex: 2 },
      { id: 'history', label: 'Historial', shortLabel: 'Historial', icon: Calendar, gradientIndex: 4 },
    ],
    [registerUnreadCount],
  );

  // Analytics functions
  const getFilteredExerciseSessions = () => {
    if (selectedPetForAnalytics === 'all') {
      return exerciseSessions;
    }
    return exerciseSessions.filter(session => session.pet_id === selectedPetForAnalytics);
  };

  const getExerciseStats = () => {
    const filteredSessions = getFilteredExerciseSessions();
    
    if (filteredSessions.length === 0) {
      return {
        total_sessions: 0,
        total_duration: 0,
        total_calories: 0,
        average_duration: 0,
        favorite_exercise: 'N/A',
        most_active_pet: 'N/A'
      };
    }

    const totalSessions = filteredSessions.length;
    const totalDuration = filteredSessions.reduce((sum, session) => sum + session.duration_minutes, 0);
    const totalCalories = filteredSessions.reduce((sum, session) => sum + session.calories_burned, 0);
    const averageDuration = Math.round(totalDuration / totalSessions);

    // Find favorite exercise type
    const exerciseCounts = filteredSessions.reduce((acc, session) => {
      acc[session.exercise_type] = (acc[session.exercise_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const favoriteExercise = Object.keys(exerciseCounts).reduce((a, b) => 
      exerciseCounts[a] > exerciseCounts[b] ? a : b
    );

    // Find most active pet
    const petCounts = filteredSessions.reduce((acc, session) => {
      acc[session.pet_name] = (acc[session.pet_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const mostActivePet = Object.keys(petCounts).reduce((a, b) => 
      petCounts[a] > petCounts[b] ? a : b
    );

    return {
      total_sessions: totalSessions,
      total_duration: totalDuration,
      total_calories: totalCalories,
      average_duration: averageDuration,
      favorite_exercise: getExerciseTypeLabel(favoriteExercise),
      most_active_pet: mostActivePet
    };
  };

  const getExerciseTypeLabel = (exerciseType: string) => {
    const typeData = exerciseTypes.find(t => t.value === exerciseType);
    if (typeData) {
      return typeData.label;
    }
    
    // Fallback for any other English exercise types
    const englishToSpanish: Record<string, string> = {
      'walking': 'Caminata',
      'running': 'Carrera',
      'playing': 'Juego',
      'jogging': 'Carrera',
      'swimming': 'Natación',
      'agility': 'Agilidad',
      'training': 'Entrenamiento',
      'exercise': 'Ejercicio',
      'workout': 'Entrenamiento',
      'fetch': 'Buscar Pelota',
      'hiking': 'Senderismo',
      'tug': 'Tirar de la Cuerda',
      'hide': 'Buscar y Encontrar',
      'obstacle': 'Carrera de Obstáculos'
    };
    
    return englishToSpanish[exerciseType] || exerciseType;
  };

  const getExerciseTypeIcon = (exerciseType: string) => {
    const typeData = exerciseTypes.find(t => t.value === exerciseType);
    if (typeData) {
      return typeData.icon;
    }
    
    // Fallback icons for English exercise types
    const englishIcons: Record<string, any> = {
      'walking': Footprints,
      'running': Activity,
      'playing': Play,
      'jogging': Activity,
      'swimming': Waves,
      'agility': Trophy,
      'training': Dumbbell,
      'exercise': Activity,
      'workout': Dumbbell,
      'fetch': Target,
      'hiking': Footprints,
      'tug': Activity,
      'hide': Target,
      'obstacle': Trophy
    };
    
    return englishIcons[exerciseType] || Activity;
  };

  const exerciseStats = getExerciseStats();

  // Prepare chart data for time series
  const getChartData = () => {
    const filteredSessions = getFilteredExerciseSessions();

    const sessionsByDate = filteredSessions.reduce(
      (acc, session) => {
        const sortKey = session.date;
        if (!acc[sortKey]) {
          acc[sortKey] = {
            sortKey,
            date: new Date(`${sortKey}T12:00:00`).toLocaleDateString('es-GT', {
              day: 'numeric',
              month: 'short',
            }),
            sessions: 0,
            duration: 0,
            calories: 0,
          };
        }
        acc[sortKey].sessions += 1;
        acc[sortKey].duration += session.duration_minutes;
        acc[sortKey].calories += session.calories_burned;
        return acc;
      },
      {} as Record<
        string,
        { sortKey: string; date: string; sessions: number; duration: number; calories: number }
      >,
    );

    return Object.values(sessionsByDate).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  };

  const weeklyProgress = useMemo(() => {
    const weekStart = getWeekStartStr();

    const filtered =
      selectedPetForAnalytics === 'all'
        ? exerciseSessions
        : exerciseSessions.filter((s) => s.pet_id === selectedPetForAnalytics);

    const weekSessions = filtered.filter((s) => s.date >= weekStart);
    const minutes = weekSessions.reduce((sum, s) => sum + s.duration_minutes, 0);
    const percent = Math.min(100, Math.round((minutes / WEEKLY_GOAL_MINUTES) * 100));

    return {
      minutes,
      sessions: weekSessions.length,
      goal: WEEKLY_GOAL_MINUTES,
      percent,
    };
  }, [exerciseSessions, selectedPetForAnalytics]);

  const chartData = getChartData();

  const renderWeeklyProgress = () => {
    const weekStart = getWeekStartStr();
    const showWeeklyNudge =
      selectedPetForAnalytics !== 'all' &&
      weeklyProgress.percent < 100 &&
      unreadIds.has(getWeeklyGoalNotificationId(selectedPetForAnalytics, weekStart));

    return (
    <MobileSectionCard className={cn(showWeeklyNudge && 'ring-2 ring-amber-300/80 ring-offset-1')}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Meta semanal</p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">
              {weeklyProgress.minutes} / {weeklyProgress.goal} min
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              {weeklyProgress.sessions} sesión{weeklyProgress.sessions === 1 ? '' : 'es'} esta semana
            </p>
            {showWeeklyNudge && (
              <span className="inline-flex mt-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold">
                Meta pendiente
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-landing-mango/15 px-3 py-1.5 text-landing-mango-dark text-sm font-semibold shrink-0">
            <Flame className="w-4 h-4" />
            {weeklyProgress.percent}%
          </div>
        </div>
        <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-landing-aqua to-landing-mint transition-all duration-500"
            style={{ width: `${weeklyProgress.percent}%` }}
          />
        </div>
        {weeklyProgress.percent >= 100 && (
          <p className="text-sm text-landing-aqua-dark font-medium mt-2">
            ¡Excelente! Cumpliste la meta semanal de actividad.
          </p>
        )}
      </div>
    </MobileSectionCard>
    );
  };

  const renderHowItWorks = () => (
    <MobileSectionCard>
      <div className="p-4 sm:p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
          <Info className="w-4 h-4 text-landing-aqua-dark shrink-0" />
          ¿Cómo funciona?
        </h3>
        <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
          <p>
            <strong className="text-gray-800">1. Registra</strong> cada caminata, juego o entrenamiento con duración e intensidad.
          </p>
          <p>
            <strong className="text-gray-800">2. Calorías estimadas</strong> según tipo de ejercicio, intensidad y peso de la mascota (actualízalo en Ajustes si falta).
          </p>
          <p>
            <strong className="text-gray-800">3. Revisa</strong> el historial y análisis para ver progreso y cumplir la meta de {WEEKLY_GOAL_MINUTES} min/semana.
          </p>
        </div>
      </div>
    </MobileSectionCard>
  );

  const renderPetFilter = () => (
    <MobileSectionCard>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-landing-aqua-dark shrink-0" />
          <span className="text-sm font-semibold text-gray-800">Filtrar por mascota</span>
        </div>
        <Select value={selectedPetForAnalytics} onValueChange={setSelectedPetForAnalytics}>
          <SelectTrigger className="w-full bg-white/90">
            <SelectValue placeholder="Selecciona una mascota" />
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
    </MobileSectionCard>
  );

  const statCards = exerciseStats
    ? [
        { label: 'Total sesiones', value: String(exerciseStats.total_sessions), sub: 'Sesiones registradas' },
        { label: 'Tiempo total', value: `${exerciseStats.total_duration} min`, sub: 'Minutos de ejercicio' },
        { label: 'Calorías', value: String(exerciseStats.total_calories), sub: 'Total quemadas' },
        { label: 'Promedio', value: `${exerciseStats.average_duration} min`, sub: 'Por sesión' },
        { label: 'Ejercicio favorito', value: exerciseStats.favorite_exercise, sub: 'Más realizado', small: true },
        { label: 'Mascota más activa', value: exerciseStats.most_active_pet, sub: 'Más ejercicios', small: true },
      ]
    : [];

  if (initialLoading) {
    return (
      <DashboardShell>
        <PageLoader variant="inline" message="Cargando ejercicio y sesiones…" />
      </DashboardShell>
    );
  }

  return (
    <>
    <DashboardShell>
      <PageHeader
        title="Ejercicio"
        subtitle="Registra y gestiona las actividades físicas de tus mascotas"
      >
        <Activity className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
      </PageHeader>

      {unreadIds.size > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200/80 px-4 py-3 text-sm text-amber-900">
          Tienes {unreadIds.size} aviso{unreadIds.size !== 1 ? 's' : ''} de ejercicio sin revisar. Registra
          una actividad para mantener a tus mascotas activas.
        </div>
      )}

      <MobileTabStrip
        tabs={exerciseTabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        columns={3}
      />

      {exerciseSessions.length > 0 && activeTab !== 'register' && renderWeeklyProgress()}

      {activeTab === 'register' && (
        <div className="space-y-4">
          {renderHowItWorks()}

          {pets.length === 0 ? (
            <MobileSectionCard>
              <div className="text-center py-10 px-4">
                <PawPrint className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium text-gray-800">Primero agrega una mascota</p>
                <p className="text-sm text-gray-500 mt-1 mb-4 max-w-sm mx-auto">
                  Necesitas al menos una mascota registrada para guardar sesiones de ejercicio.
                </p>
                <Button className={landingBtnPrimary} onClick={() => navigate('/pet-creation')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar mascota
                </Button>
              </div>
            </MobileSectionCard>
          ) : (
        <MobileSectionCard>
          <div className="p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-base sm:text-lg font-bold text-gray-900 mb-4">
              <Plus className="w-5 h-5 text-landing-aqua-dark shrink-0" />
              {editingSession ? 'Editar sesión de ejercicio' : 'Registrar nueva sesión'}
            </h3>

            <form onSubmit={saveExerciseSession} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex-1 min-w-0">
                  <Label htmlFor="pet">Mascota *</Label>
                  <Select value={selectedPet} onValueChange={setSelectedPet} disabled={pets.length === 0}>
                    <SelectTrigger className="bg-white/90">
                      <SelectValue placeholder="Selecciona una mascota" />
                    </SelectTrigger>
                    <SelectContent>
                      {pets.map((pet) => (
                        <SelectItem key={pet.id} value={pet.id}>
                          {formatPetOptionLabel(pet)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="exercise-type">Tipo de ejercicio *</Label>
                  <Select value={exerciseType} onValueChange={setExerciseType}>
                    <SelectTrigger className="bg-white/90">
                      <SelectValue placeholder="Selecciona el tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {exerciseTypes.map((type) => {
                        const IconComponent = type.icon;
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <IconComponent className="w-4 h-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="duration">Duración (minutos) *</Label>
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="Ej: 30"
                    min="1"
                    step="1"
                    className="bg-white/90"
                  />
                </div>

                <div>
                  <Label htmlFor="intensity">Intensidad *</Label>
                  <Select value={intensity} onValueChange={setIntensity}>
                    <SelectTrigger className="bg-white/90">
                      <SelectValue placeholder="Selecciona la intensidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {intensityLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-2">
                  <div className="rounded-xl border border-landing-aqua/25 bg-gradient-to-r from-landing-aqua/10 to-landing-mint/10 p-4">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-landing-aqua-dark shrink-0" />
                      <span className="font-semibold text-landing-aqua-dark">
                        Calorías estimadas: {calculatedCalories > 0 ? calculatedCalories : '--'} cal
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                      {calculatedCalories > 0
                        ? `Basado en ${exerciseTypes.find((t) => t.value === exerciseType)?.label || exerciseType}, intensidad ${intensityLevels.find((i) => i.value === intensity)?.label || intensity} y peso de la mascota`
                        : 'Selecciona mascota, ejercicio, duración e intensidad para calcular'}
                    </p>
                    {selectedPet && !Number(pets.find((p) => p.id === selectedPet)?.weight) && (
                      <p className="text-xs text-landing-mango-dark mt-2">
                        Tip: agrega el peso de tu mascota en Ajustes para estimaciones más precisas.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="date">Fecha *</Label>
                  <Input
                    type="date"
                    value={exerciseDate}
                    onChange={(e) => setExerciseDate(e.target.value)}
                    className="bg-white/90"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones sobre la sesión de ejercicio..."
                  rows={3}
                  className="bg-white/90 resize-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Button
                  type="submit"
                  disabled={loading || pets.length === 0}
                  data-blueprint-guided="register-exercise"
                  className={cn('flex-1 min-h-[44px]', landingBtnPrimary)}
                >
                  <Activity className="w-4 h-4 mr-2 shrink-0" />
                  {loading
                    ? editingSession
                      ? 'Actualizando...'
                      : 'Registrando...'
                    : editingSession
                      ? 'Actualizar sesión'
                      : 'Registrar sesión'}
                </Button>
                {editingSession && (
                  <Button type="button" variant="outline" onClick={resetForm} disabled={loading} className="min-h-[44px]">
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </div>
        </MobileSectionCard>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-4">
          {exerciseSessions.length === 0 && renderHowItWorks()}
          {renderPetFilter()}

          {exerciseStats && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {statCards.map((stat, index) => {
                const theme = landingCardThemes[index % landingCardThemes.length];
                return (
                  <div
                    key={stat.label}
                    className={cn('rounded-2xl border p-4 backdrop-blur-sm', theme.bg, theme.border)}
                  >
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide leading-tight">{stat.label}</p>
                    <p className={cn('font-bold text-gray-900 mt-1 break-words', stat.small ? 'text-base' : 'text-xl sm:text-2xl')}>
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{stat.sub}</p>
                  </div>
                );
              })}
            </div>
          )}

          {chartData.length > 0 ? (
            <MobileSectionCard>
              <div className="p-4 sm:p-5">
                <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-4">
                  <TrendingUp className="w-5 h-5 text-landing-aqua-dark shrink-0" />
                  Progreso de ejercicio
                </h3>
                <div className="h-64 sm:h-80 w-full -mx-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        angle={-35}
                        textAnchor="end"
                        height={56}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fontSize: 11 }} width={36} />
                      <Tooltip
                        formatter={(value, name) => {
                          if (name === 'calories') return [`${value} cal`, 'Calorías'];
                          if (name === 'duration') return [`${value} min`, 'Duración'];
                          if (name === 'sessions') return [`${value}`, 'Sesiones'];
                          return [value, name];
                        }}
                        labelFormatter={(label) => `Fecha: ${label}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="calories"
                        stroke={landingChartColors.aqua}
                        strokeWidth={2.5}
                        dot={{ fill: landingChartColors.aqua, strokeWidth: 2, r: 3 }}
                        name="Calorías"
                      />
                      <Line
                        type="monotone"
                        dataKey="duration"
                        stroke={landingChartColors.mango}
                        strokeWidth={2.5}
                        dot={{ fill: landingChartColors.mango, strokeWidth: 2, r: 3 }}
                        name="Duración"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs sm:text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: landingChartColors.aqua }} />
                    <span>Calorías</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: landingChartColors.mango }} />
                    <span>Duración (min)</span>
                  </div>
                </div>
              </div>
            </MobileSectionCard>
          ) : (
            <MobileSectionCard>
              <div className="text-center py-10 px-4">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium text-gray-700">Sin datos para analizar</p>
                <p className="text-sm text-gray-500 mt-1">Registra sesiones para ver estadísticas y gráficos.</p>
              </div>
            </MobileSectionCard>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {renderPetFilter()}

          <MobileSectionCard>
            <div className="p-4 sm:p-5">
              <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-4">
                <Calendar className="w-5 h-5 text-landing-aqua-dark shrink-0" />
                Historial de ejercicios
              </h3>

              {getFilteredExerciseSessions().length === 0 ? (
                <div className="text-center py-10 px-2">
                  <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium text-gray-700">No hay sesiones registradas</p>
                  <p className="text-sm text-gray-500 mt-1 mb-4">Comienza registrando tu primera sesión.</p>
                  <Button variant="outline" className="min-h-[44px]" onClick={() => setActiveTab('register')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Registrar ejercicio
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {getFilteredExerciseSessions().map((session) => {
                    const IconComponent = getExerciseTypeIcon(session.exercise_type);
                    const exerciseLabel = getExerciseTypeLabel(session.exercise_type);
                    const intensityBadge =
                      intensityLevels.find((i) => i.value === session.intensity)?.color ||
                      'bg-gray-100 text-gray-800';

                    return (
                      <div
                        key={session.id}
                        className="rounded-xl border border-white/60 bg-white/70 border-l-4 border-l-landing-aqua p-3 sm:p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <IconComponent className="w-5 h-5 text-landing-aqua-dark shrink-0" />
                              <span className="font-semibold text-gray-900">{exerciseLabel}</span>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {session.pet_name}
                              </Badge>
                              <Badge className={cn('text-xs shrink-0', intensityBadge)}>
                                {intensityLevels.find((i) => i.value === session.intensity)?.label || session.intensity}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500">
                              <Calendar className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                              {new Date(session.date).toLocaleDateString('es-GT', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </p>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                              <span className="inline-flex items-center gap-1">
                                <Timer className="w-4 h-4 text-landing-aqua-dark" />
                                <strong>{session.duration_minutes} min</strong>
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Zap className="w-4 h-4 text-landing-mango-dark" />
                                <strong>{session.calories_burned} cal</strong>
                              </span>
                            </div>
                            {session.notes && (
                              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                                <span className="font-medium text-gray-700">Notas:</span> {session.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => loadSessionForEdit(session)}
                              className="flex-1 sm:flex-none min-h-[40px] text-xs"
                            >
                              <Edit className="w-3.5 h-3.5 mr-1" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteExerciseSession(session.id)}
                              className="flex-1 sm:flex-none min-h-[40px] text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              disabled={loading}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" />
                              Eliminar
                            </Button>
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
    </DashboardShell>

    <ActionConfirmDialog
      open={showExerciseConfirm}
      onOpenChange={setShowExerciseConfirm}
      title={editingSession ? 'Confirmar actualización' : 'Confirmar registro de ejercicio'}
      description="Revisa los datos de la sesión antes de guardar."
      confirmLabel={editingSession ? 'Actualizar' : 'Registrar'}
      fields={[
        { label: 'Mascota', value: pets.find((p) => p.id === selectedPet)?.name || '—' },
        {
          label: 'Actividad',
          value: exerciseTypes.find((t) => t.value === exerciseType)?.label || exerciseType,
        },
        { label: 'Duración', value: `${duration} min` },
        {
          label: 'Intensidad',
          value: intensityLevels.find((i) => i.value === intensity)?.label || intensity,
        },
        { label: 'Calorías', value: `${calculatedCalories} cal` },
        { label: 'Fecha', value: exerciseDate },
        ...(notes ? [{ label: 'Notas', value: notes }] : []),
      ]}
      onConfirm={performSaveExercise}
      loading={loading}
      onEdit={() => setShowExerciseConfirm(false)}
    />
    </>
  );
};

export default Trazabilidad;
