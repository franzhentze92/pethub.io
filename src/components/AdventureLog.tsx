import React, { useState, useEffect } from 'react';
import { SectionLoader } from '@/components/PageLoader';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { useToast } from '../hooks/use-toast';
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
      <div className="p-6 text-center">
        <div className="text-6xl mb-4">🏃</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          ¡No tienes mascotas aún!
        </h2>
        <p className="text-gray-600 mb-6">
          Crea tu primera mascota para comenzar las aventuras
        </p>
        <Button 
          onClick={() => window.location.href = '/pet-creation'}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          Crear Mi Primera Mascota
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Pet Energy Status */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                {selectedPet.image_url ? (
                  <img
                    src={selectedPet.image_url}
                    alt={selectedPet.name}
                    className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-2xl border-4 border-white shadow-lg">
                    {getPetEmoji(selectedPet.species)}
                  </div>
                )}
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-yellow-800">{todaySessions}</span>
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedPet.name}</h2>
                <div className="flex items-center space-x-2">
                  <span className={`text-lg ${petMood.color}`}>{petMood.icon}</span>
                  <span className="text-gray-600">{petMood.message}</span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center space-x-4 mb-2 justify-end">
                <div className="flex items-center space-x-1">
                  <Timer className="w-5 h-5 text-blue-500" />
                  <span className="font-bold text-gray-900">{weeklyProgress} min</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <span className="font-bold text-gray-900">{exerciseStreak} días</span>
                </div>
              </div>
              <div className="w-32 bg-gray-200 rounded-full h-2 ml-auto">
                <div
                  className="bg-gradient-to-r from-yellow-400 to-green-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, weeklyGoal > 0 ? (weeklyProgress / weeklyGoal) * 100 : 0)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Goal Progress */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Target className="w-6 h-6 text-blue-600" />
            🎯 Meta semanal sugerida ({weeklyGoal} min)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Progreso esta semana</span>
              <span className="text-sm font-medium text-gray-900">{weeklyProgress} / {weeklyGoal} minutos</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, (weeklyProgress / weeklyGoal) * 100)}%` }}
              ></div>
            </div>
            <div className="text-center">
              <span className="text-sm text-gray-600">
                {weeklyGoal - weeklyProgress > 0 
                  ? `Faltan ${weeklyGoal - weeklyProgress} minutos para completar la meta`
                  : '¡Meta semanal completada! 🎉'
                }
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Adventure Section */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Activity className="w-6 h-6 text-green-600" />
            🏃 Registrar Nueva Aventura
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            
            <div className="flex items-end">
              <Button 
                onClick={handleQuickAdventure}
                className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
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
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
          <CardContent className="p-4 text-center">
            <Activity className="w-6 h-6 mx-auto mb-2" />
            <div className="text-2xl font-bold">{adventures.length}</div>
            <div className="text-sm opacity-90">Sesiones totales</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">
          <CardContent className="p-4 text-center">
            <Timer className="w-6 h-6 mx-auto mb-2" />
            <div className="text-2xl font-bold">{weeklyProgress}</div>
            <div className="text-sm opacity-90">Min esta semana</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
          <CardContent className="p-4 text-center">
            <Flame className="w-6 h-6 mx-auto mb-2" />
            <div className="text-2xl font-bold">{exerciseStreak}</div>
            <div className="text-sm opacity-90">Días seguidos</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
          <CardContent className="p-4 text-center">
            <Flame className="w-6 h-6 mx-auto mb-2" />
            <div className="text-2xl font-bold">{weekCalories}</div>
            <div className="text-sm opacity-90">Calorías semana</div>
          </CardContent>
        </Card>
      </div>

      {/* Adventure History */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Calendar className="w-6 h-6 text-green-600" />
            📖 Diario de Aventuras
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                <div key={adventure.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">{getActivityIcon(adventure.activity_type)}</div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900 capitalize">{adventure.activity_type}</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {adventure.duration_minutes} min
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(adventure.adventure_date).toLocaleString('es-GT')}
                      </div>
                      {adventure.notes && (
                        <div className="text-sm text-gray-600 mt-1">
                          {adventure.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="text-sm text-gray-600">{adventure.calories_burned} kcal</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips Section */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="text-2xl">💡</div>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default AdventureLog;
