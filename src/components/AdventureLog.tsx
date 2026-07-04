import React, { useState, useEffect } from 'react';
import { SectionLoader } from '@/components/PageLoader';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { useToast } from '../hooks/use-toast';
import { DashboardShell } from './dashboard/DashboardShell';
import PageHeader from './PageHeader';
import { MobileSectionCard } from './mobile/MobileUi';
import { landingBtnSolidMint, solidCardThemeAt, solidIconBgAt } from '@/lib/landingTheme';
import { cn } from '@/lib/utils';
import {
  Activity, 
  Clock, 
  Heart, 
  Star, 
  Calendar, 
  Plus, 
  CheckCircle,
  Smile,
  Frown,
  Zap,
  Trophy,
  Flame,
  MapPin,
  Timer,
  Target
} from 'lucide-react';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  image_url?: string;
}

interface Adventure {
  id: string;
  pet_id: string;
  activity_type: string;
  duration_minutes: number;
  calories_burned: number;
  adventure_date: string;
  notes?: string;
  location?: string;
}

const ACTIVITY_TO_EXERCISE: Record<string, string> = {
  walk: 'walk',
  play: 'play',
  run: 'run',
  hike: 'hiking',
  swim: 'swimming',
};

const EXERCISE_TO_ACTIVITY: Record<string, string> = {
  walk: 'walk',
  play: 'play',
  run: 'run',
  hiking: 'hike',
  swimming: 'swim',
};

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

function estimateCalories(activityType: string, durationMinutes: number): number {
  const rates: Record<string, number> = {
    walk: 4,
    play: 6,
    run: 8,
    hike: 10,
    hiking: 10,
    swim: 12,
    swimming: 12,
  };
  return Math.round(durationMinutes * (rates[activityType] ?? 5));
}

const AdventureLog: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [adventures, setAdventures] = useState<Adventure[]>([]);
  const [loading, setLoading] = useState(false);
  const [exerciseStreak, setExerciseStreak] = useState(0);
  const [weeklyGoal] = useState(300);
  const [weeklyProgress, setWeeklyProgress] = useState(0);
  const [weekCalories, setWeekCalories] = useState(0);
  const [todaySessions, setTodaySessions] = useState(0);
  
  // Quick adventure form
  const [quickAdventureForm, setQuickAdventureForm] = useState({
    activity_type: 'walk',
    duration_minutes: '',
    distance_km: '',
    location: '',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      loadPets();
    }
  }, [user]);

  useEffect(() => {
    if (selectedPet) {
      loadAdventures();
      calculatePetStats();
    }
  }, [selectedPet]);

  const loadPets = async () => {
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('owner_id', user?.id);
      
      if (error) throw error;
      setPets(data || []);
      if (data && data.length > 0) {
        setSelectedPet(data[0]);
      }
    } catch (error) {
      console.error('Error loading pets:', error);
    }
  };

  const loadAdventures = async () => {
    if (!selectedPet || !user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exercise_sessions')
        .select('id, pet_id, exercise_type, duration_minutes, calories_burned, date, notes, created_at')
        .eq('owner_id', user.id)
        .eq('pet_id', selectedPet.id)
        .order('date', { ascending: false })
        .limit(50);

      if (error) throw error;

      const mapped: Adventure[] = (data ?? []).map((row) => ({
        id: row.id,
        pet_id: row.pet_id,
        activity_type: EXERCISE_TO_ACTIVITY[row.exercise_type] ?? row.exercise_type,
        duration_minutes: row.duration_minutes,
        calories_burned: row.calories_burned ?? estimateCalories(row.exercise_type, row.duration_minutes),
        adventure_date: row.created_at ?? row.date,
        notes: row.notes ?? undefined,
      }));

      setAdventures(mapped);
      applyAdventureStats(mapped);
    } catch (error) {
      console.error('Error loading adventures:', error);
      setAdventures([]);
      applyAdventureStats([]);
    } finally {
      setLoading(false);
    }
  };

  const applyAdventureStats = (records: Adventure[]) => {
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const todayKey = new Date().toISOString().split('T')[0];
    const weeklyRecords = records.filter((adv) => new Date(adv.adventure_date) >= weekStart);
    const todayRecords = records.filter((adv) => {
      const day = adv.adventure_date.includes('T') ? adv.adventure_date.split('T')[0] : adv.adventure_date;
      return day === todayKey;
    });

    setWeeklyProgress(weeklyRecords.reduce((sum, adv) => sum + adv.duration_minutes, 0));
    setWeekCalories(weeklyRecords.reduce((sum, adv) => sum + adv.calories_burned, 0));
    setTodaySessions(todayRecords.length);
    setExerciseStreak(computeDayStreak(records.map((adv) => adv.adventure_date)));
  };

  const calculatePetStats = () => {
    applyAdventureStats(adventures);
  };

  const handleQuickAdventure = async () => {
    if (!selectedPet || !user?.id || !quickAdventureForm.duration_minutes) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const duration = parseInt(quickAdventureForm.duration_minutes, 10);
      if (!Number.isFinite(duration) || duration <= 0) {
        toast({ title: 'Error', description: 'Duración inválida', variant: 'destructive' });
        return;
      }

      const exerciseType =
        ACTIVITY_TO_EXERCISE[quickAdventureForm.activity_type] ?? quickAdventureForm.activity_type;
      const calories = estimateCalories(quickAdventureForm.activity_type, duration);
      const today = new Date().toISOString().split('T')[0];
      const notes = [
        quickAdventureForm.notes?.trim(),
        quickAdventureForm.location?.trim() ? `Lugar: ${quickAdventureForm.location.trim()}` : null,
        quickAdventureForm.distance_km?.trim() ? `Distancia: ${quickAdventureForm.distance_km.trim()} km` : null,
      ]
        .filter(Boolean)
        .join(' · ');

      const exerciseData = {
        pet_id: selectedPet.id,
        owner_id: user.id,
        exercise_type: exerciseType,
        duration_minutes: duration,
        intensity: 'medium',
        date: today,
        notes: notes || null,
        calories_burned: calories,
      };

      const { error } = await supabase.from('exercise_sessions').insert([exerciseData]);
      if (error) throw error;

      await loadAdventures();

      toast({
        title: 'Ejercicio registrado',
        description: `Se guardó la sesión de ${selectedPet.name}.`,
      });

      setQuickAdventureForm({
        activity_type: 'walk',
        duration_minutes: '',
        distance_km: '',
        location: '',
        notes: '',
      });
    } catch (error) {
      console.error('Error recording adventure:', error);
      toast({
        title: 'Error',
        description: 'No se pudo registrar la aventura',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPetMood = () => {
    const progressPct = weeklyGoal > 0 ? (weeklyProgress / weeklyGoal) * 100 : 0;
    if (progressPct >= 100)
      return { message: 'Meta semanal cumplida', icon: '⚡', color: 'text-yellow-500' };
    if (todaySessions > 0)
      return { message: 'Actividad registrada hoy', icon: '🏃', color: 'text-green-500' };
    if (progressPct >= 50)
      return { message: 'Buen progreso esta semana', icon: '😊', color: 'text-blue-500' };
    if (exerciseStreak > 0)
      return { message: 'Sin ejercicio hoy aún', icon: '😐', color: 'text-orange-500' };
    return { message: 'Registra la primera sesión', icon: '🏃', color: 'text-gray-600' };
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'walk': return '🚶';
      case 'play': return '🎾';
      case 'run': return '🏃';
      case 'hike': return '🥾';
      case 'swim': return '🏊';
      default: return '🏃';
    }
  };

  const getPetEmoji = (species: string) => {
    switch (species.toLowerCase()) {
      case 'dog': return '🐕';
      case 'cat': return '🐱';
      case 'bird': return '🐦';
      case 'fish': return '🐠';
      default: return '🐾';
    }
  };

  const petMood = getPetMood();

  if (!selectedPet) {
    return (
      <DashboardShell variant="plain">
        <PageHeader variant="solid" accent="mint" title="Diario de aventuras" subtitle="Registra paseos, juegos y actividad física">
          <Activity className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
        </PageHeader>
        <MobileSectionCard variant="plain">
          <div className="text-center py-10 px-4">
            <div className="text-5xl mb-4">🏃</div>
            <p className="font-medium text-gray-800">Primero agrega una mascota</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">Crea tu primera mascota para comenzar las aventuras.</p>
            <Button
              onClick={() => { window.location.href = '/pet-creation'; }}
              className={cn('min-h-[44px]', landingBtnSolidMint)}
            >
              Registrar mascota
            </Button>
          </div>
        </MobileSectionCard>
      </DashboardShell>
    );
  }

  const statCards = [
    { label: 'Sesiones totales', value: String(adventures.length), icon: Activity },
    { label: 'Min esta semana', value: String(weeklyProgress), icon: Timer },
    { label: 'Días seguidos', value: String(exerciseStreak), icon: Flame },
    { label: 'Calorías semana', value: String(weekCalories), icon: Flame },
  ];

  return (
    <DashboardShell variant="plain">
      <PageHeader variant="solid" accent="mint" title="Diario de aventuras" subtitle={`Actividad y ejercicio de ${selectedPet.name}`}>
        <Activity className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
      </PageHeader>

      <MobileSectionCard variant="plain" className="border-landing-mint/25 bg-landing-mint/5">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                {selectedPet.image_url ? (
                  <img
                    src={selectedPet.image_url}
                    alt={selectedPet.name}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className={cn('w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-2xl border-4 border-white shadow-lg', solidIconBgAt(1))}>
                    {getPetEmoji(selectedPet.species)}
                  </div>
                )}
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-landing-tropical rounded-full flex items-center justify-center ring-2 ring-white">
                  <span className="text-[10px] font-bold text-gray-900">{todaySessions}</span>
                </div>
              </div>
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
                  <Timer className="w-4 h-4 text-landing-aqua-dark" />
                  <span className="font-bold text-gray-900">{weeklyProgress} min</span>
                </div>
                <div className="flex items-center gap-1">
                  <Flame className="w-4 h-4 text-landing-mango-dark" />
                  <span className="font-bold text-gray-900">{exerciseStreak} días</span>
                </div>
              </div>
              <div className="w-full sm:w-32 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-landing-mango transition-all duration-500"
                  style={{ width: `${Math.min(100, weeklyGoal > 0 ? (weeklyProgress / weeklyGoal) * 100 : 0)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </MobileSectionCard>

      <MobileSectionCard variant="plain">
        <div className="p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-4">
            <Target className="w-5 h-5 text-landing-mint-dark shrink-0" />
            Meta semanal sugerida ({weeklyGoal} min)
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Progreso esta semana</span>
              <span className="font-medium text-gray-900">{weeklyProgress} / {weeklyGoal} minutos</span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-landing-mint transition-all duration-500"
                style={{ width: `${Math.min(100, weeklyGoal > 0 ? (weeklyProgress / weeklyGoal) * 100 : 0)}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 text-center">
              {weeklyGoal - weeklyProgress > 0
                ? `Faltan ${weeklyGoal - weeklyProgress} minutos para completar la meta`
                : '¡Meta semanal completada! 🎉'}
            </p>
          </div>
        </div>
      </MobileSectionCard>

      <MobileSectionCard variant="plain">
        <div className="p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-4">
            <Activity className="w-5 h-5 text-landing-mint-dark shrink-0" />
            Registrar nueva aventura
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="activity-type">Tipo de actividad</Label>
              <Select value={quickAdventureForm.activity_type} onValueChange={(value) => setQuickAdventureForm(prev => ({ ...prev, activity_type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk">🚶 Caminata</SelectItem>
                  <SelectItem value="play">🎾 Juego</SelectItem>
                  <SelectItem value="run">🏃 Carrera</SelectItem>
                  <SelectItem value="hike">🥾 Senderismo</SelectItem>
                  <SelectItem value="swim">🏊 Natación</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="duration">Duración (min)</Label>
              <Input
                id="duration"
                type="number"
                value={quickAdventureForm.duration_minutes}
                onChange={(e) => setQuickAdventureForm(prev => ({ ...prev, duration_minutes: e.target.value }))}
                placeholder="30"
              />
            </div>
            
            <div>
              <Label htmlFor="distance">Distancia (km)</Label>
              <Input
                id="distance"
                type="number"
                step="0.1"
                value={quickAdventureForm.distance_km}
                onChange={(e) => setQuickAdventureForm(prev => ({ ...prev, distance_km: e.target.value }))}
                placeholder="2.5"
              />
            </div>
            
            <div>
              <Label htmlFor="location">Ubicación</Label>
              <Input
                id="location"
                value={quickAdventureForm.location}
                onChange={(e) => setQuickAdventureForm(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Parque, casa, etc."
              />
            </div>
            
            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <Button
                onClick={handleQuickAdventure}
                className={cn('w-full min-h-[44px]', landingBtnSolidMint)}
              >
                <Activity className="w-4 h-4 mr-2" />
                ¡Aventurar!
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="notes">Notas de la aventura</Label>
            <Input
              id="notes"
              value={quickAdventureForm.notes}
              onChange={(e) => setQuickAdventureForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="¿Cómo fue la aventura? ¿Qué hizo tu mascota?"
              className="bg-white"
            />
          </div>
        </div>
      </MobileSectionCard>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat, index) => {
          const theme = solidCardThemeAt(index);
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={cn('rounded-2xl border p-4 bg-white', theme.bg, theme.border)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <Icon className={cn('h-5 w-5 shrink-0 opacity-90', theme.icon)} />
              </div>
            </div>
          );
        })}
      </div>

      <MobileSectionCard variant="plain">
        <div className="p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-4">
            <Calendar className="w-5 h-5 text-landing-mint-dark shrink-0" />
            Diario de aventuras
          </h3>
          {loading ? (
            <SectionLoader message="Cargando aventuras…" />
          ) : adventures.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🏃</div>
              <p className="text-gray-600">Aún no hay aventuras registradas</p>
              <p className="text-sm text-gray-500 mt-2">¡Sal a caminar con tu mascota para comenzar el diario!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {adventures.map((adventure) => (
                <div key={adventure.id} className="rounded-xl border border-gray-100 bg-white border-l-4 border-l-landing-mint p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="text-2xl shrink-0">{getActivityIcon(adventure.activity_type)}</div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900 capitalize">{adventure.activity_type}</span>
                          <Badge variant="outline" className="text-xs shrink-0 bg-landing-mint/10 text-landing-mint-dark border-landing-mint/25">
                            {adventure.duration_minutes} min
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">{new Date(adventure.adventure_date).toLocaleString('es-GT')}</p>
                        {adventure.notes && (
                          <p className="text-sm text-gray-600 mt-1">{adventure.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Flame className="w-4 h-4 text-landing-mango-dark" />
                      <span className="text-sm text-gray-600">{adventure.calories_burned} kcal</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </MobileSectionCard>

      <MobileSectionCard variant="plain" className="border-landing-mint/25 bg-landing-mint/5">
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="text-2xl shrink-0">💡</div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Consejos para aventuras con {selectedPet.name}</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Registra cada paseo o juego para ver minutos y calorías reales</li>
                <li>• La meta de {weeklyGoal} min/semana es una referencia general</li>
                <li>• La racha cuenta días consecutivos con al menos una sesión</li>
                <li>• También puedes registrar ejercicio desde Trazabilidad en Cuidado</li>
              </ul>
            </div>
          </div>
        </div>
      </MobileSectionCard>
    </DashboardShell>
  );
};

export default AdventureLog;
