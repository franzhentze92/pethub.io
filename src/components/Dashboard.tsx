import React, { useState, useEffect } from 'react';
import { 
  Calendar, Heart, Activity, TrendingUp, Clock, 
  Stethoscope, Utensils, ShoppingBag, Users, Settings,
  BarChart3, Zap, ArrowUpRight, 
  Eye, MessageCircle, ShoppingCart, CreditCard, Search,
  Tag, Timer, Info, Building2, Coins
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useUserProfile } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FeedingNotification from './FeedingNotification';
import PageHeader from './PageHeader';
import { DashboardShell } from './dashboard/DashboardShell';
import PageLoader from '@/components/PageLoader';
import { DashboardStatCard } from './dashboard/DashboardStatCard';
import { DashboardGlassCard } from './dashboard/DashboardGlassCard';
import { supabase } from '@/lib/supabase';
import { landingBtnPrimary, landingChartColors, landingChartPalette, landingCardThemes } from '@/lib/landingTheme';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format, subDays, startOfDay, endOfDay, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { formatSpeciesLabel } from '@/utils/petLabels';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

interface DashboardTrends {
  exercise?: string;
  feeding?: string;
  vet?: string;
  spent?: string;
}

function periodChangePercent(recent: number, prior: number): string | undefined {
  if (recent === 0 && prior === 0) return undefined;
  if (prior === 0) return recent > 0 ? 'nuevo' : undefined;
  const change = Math.round(((recent - prior) / prior) * 100);
  if (change === 0) return undefined;
  return `${change > 0 ? '+' : ''}${change}%`;
}

function countInRange<T>(
  items: T[],
  getDate: (item: T) => string | null | undefined,
  start: Date,
  end: Date,
): number {
  return items.filter((item) => {
    const raw = getDate(item);
    if (!raw) return false;
    const d = parseISO(raw.includes('T') ? raw : `${raw}T12:00:00`);
    return d >= start && d <= end;
  }).length;
}

function sumInRange<T>(
  items: T[],
  getDate: (item: T) => string | null | undefined,
  getAmount: (item: T) => number,
  start: Date,
  end: Date,
): number {
  return items
    .filter((item) => {
      const raw = getDate(item);
      if (!raw) return false;
      const d = parseISO(raw.includes('T') ? raw : `${raw}T12:00:00`);
      return d >= start && d <= end;
    })
    .reduce((sum, item) => sum + getAmount(item), 0);
}

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  weight: number;
  image_url?: string;
}

interface DashboardStats {
  totalPets: number;
  totalExerciseSessions: number;
  totalVeterinaryVisits: number;
  totalFeedingSchedules: number;
  avgExerciseMinutes: number;
  totalCaloriesBurned: number;
  upcomingAppointments: number;
  activeFeedingSchedules: number;
  totalOrders: number;
  totalSpent: number;
  totalReminders: number;
  activeBreedingMatches: number;
  totalAdoptionRequests: number;
  nutritionMealsToday: number;
  vetVisitsThisMonth: number;
  vetSpentTotal: number;
  exerciseMinutesThisWeek: number;
  pendingAdoptionRequests: number;
}

interface ChartData {
  date: string;
  exercise: number;
  calories: number;
  vetVisits: number;
  feeding: number;
}

interface MonthlyData {
  month: string;
  exercise: number;
  vetVisits: number;
  orders: number;
  spent: number;
}

interface PetActivityData {
  name: string;
  exercise: number;
  vetVisits: number;
  feeding: number;
}

const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  
  // Fetch user profile data (same as Ajustes component)
  const { data: userProfile } = useUserProfile(user?.id);
  
  // Get user's display name from profile data
  const getUserDisplayName = () => {
    if (userProfile?.full_name) {
      return userProfile.full_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Usuario';
  };
  const navigate = useNavigate();
  const [pets, setPets] = useState<Pet[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalPets: 0,
    totalExerciseSessions: 0,
    totalVeterinaryVisits: 0,
    totalFeedingSchedules: 0,
    avgExerciseMinutes: 0,
    totalCaloriesBurned: 0,
    upcomingAppointments: 0,
    activeFeedingSchedules: 0,
    totalOrders: 0,
    totalSpent: 0,
    totalReminders: 0,
    activeBreedingMatches: 0,
    totalAdoptionRequests: 0,
    nutritionMealsToday: 0,
    vetVisitsThisMonth: 0,
    vetSpentTotal: 0,
    exerciseMinutesThisWeek: 0,
    pendingAdoptionRequests: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [petActivityData, setPetActivityData] = useState<PetActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [statTrends, setStatTrends] = useState<DashboardTrends>({});
  const [completedOrders, setCompletedOrders] = useState(0);
  
  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);


  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load pets
      const { data: petsData } = await supabase
        .from('pets')
        .select('*')
        .eq('owner_id', user?.id);
      
      setPets(petsData || []);

      // Load exercise sessions stats
      const { data: exerciseData } = await supabase
        .from('exercise_sessions')
        .select('duration_minutes, calories_burned, date, pet_id')
        .eq('owner_id', user?.id);

      // Load veterinary visits count
      const { data: vetData } = await supabase
        .from('veterinary_sessions')
        .select('id, date, pet_id, cost')
        .eq('owner_id', user?.id);

      // Load feeding schedules count
      const { data: feedingData } = await supabase
        .from('pet_feeding_schedules')
        .select('id, is_active, pet_id')
        .eq('owner_id', user?.id);

      // Load orders count and total spent
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, total_amount, created_at, status, payment_status')
        .eq('client_id', user?.id);

      // Nutrition sessions for feeding chart and trends
      const { data: nutritionData } = await supabase
        .from('nutrition_sessions')
        .select('date, created_at')
        .eq('owner_id', user?.id);

      // Active reminders
      const { data: remindersData } = await supabase
        .from('pet_reminders')
        .select('id')
        .eq('owner_id', user?.id)
        .eq('is_active', true)
        .eq('is_completed', false);

      // Load breeding matches count
      const { data: breedingMatchesData } = await supabase
        .from('breeding_matches')
        .select('id, status')
        .or(`owner_id.eq.${user?.id},partner_owner_id.eq.${user?.id}`)
        .in('status', ['pending', 'accepted']);

      // Load adoption requests count
      const { data: adoptionRequestsData } = await supabase
        .from('adoption_applications')
        .select('id, status')
        .eq('applicant_id', user?.id);

      // Load service appointments
      const { data: appointmentsData } = await supabase
        .from('service_appointments')
        .select(`
          *,
          provider_services (
            service_name,
            service_category,
            description,
            detailed_description,
            price,
            currency,
            duration_minutes,
            preparation_instructions,
            cancellation_policy,
            providers (
              business_name,
              address,
              phone
            )
          ),
          provider_service_time_slots:provider_service_time_slots!service_appointments_time_slot_id_fkey (
            slot_start_time,
            slot_end_time
          )
        `)
        .eq('client_id', user?.id)
        .order('appointment_date', { ascending: true });
      
      const processedAppointments = (appointmentsData || []).map(apt => {
        // Get time slot information
        const timeSlot = apt.provider_service_time_slots;
        let appointmentTime = '';
        if (timeSlot?.slot_start_time && timeSlot?.slot_end_time) {
          appointmentTime = `${timeSlot.slot_start_time.substring(0, 5)} - ${timeSlot.slot_end_time.substring(0, 5)}`;
        } else if (apt.appointment_time) {
          appointmentTime = apt.appointment_time;
        } else if (apt.appointment_date) {
          // Fallback to appointment_date if time slot not available
          appointmentTime = format(parseISO(apt.appointment_date), 'HH:mm');
        }
        
        return {
          ...apt,
          appointment_time: appointmentTime
        };
      });
      
      setAppointments(processedAppointments);

      const exerciseSessions = exerciseData || [];
      const veterinaryVisits = vetData || [];
      const feedingSchedules = feedingData || [];
      const orders = ordersData || [];
      const breedingMatches = breedingMatchesData || [];
      const adoptionRequests = adoptionRequestsData || [];
      const nutritionSessions = nutritionData || [];

      const now = endOfDay(new Date());
      const recentStart = startOfDay(subDays(now, 6));
      const priorStart = startOfDay(subDays(now, 13));
      const priorEnd = endOfDay(subDays(now, 7));

      const recentExercise = countInRange(exerciseSessions, (s) => s.date, recentStart, now);
      const priorExercise = countInRange(exerciseSessions, (s) => s.date, priorStart, priorEnd);
      const recentVet = countInRange(veterinaryVisits, (v) => v.date, recentStart, now);
      const priorVet = countInRange(veterinaryVisits, (v) => v.date, priorStart, priorEnd);
      const recentFeeding = countInRange(
        nutritionSessions,
        (s) => s.date ?? s.created_at?.split('T')[0],
        recentStart,
        now,
      );
      const priorFeeding = countInRange(
        nutritionSessions,
        (s) => s.date ?? s.created_at?.split('T')[0],
        priorStart,
        priorEnd,
      );
      const recentSpent = sumInRange(orders, (o) => o.created_at, (o) => o.total_amount || 0, recentStart, now);
      const priorSpent = sumInRange(orders, (o) => o.created_at, (o) => o.total_amount || 0, priorStart, priorEnd);

      setStatTrends({
        exercise: periodChangePercent(recentExercise, priorExercise),
        feeding: periodChangePercent(recentFeeding, priorFeeding),
        vet: periodChangePercent(recentVet, priorVet),
        spent: periodChangePercent(recentSpent, priorSpent),
      });

      const completedOrdersCount = orders.filter(
        (o) =>
          o.status === 'delivered' ||
          o.status === 'confirmed' ||
          o.status === 'completed' ||
          o.payment_status === 'completed',
      ).length;
      setCompletedOrders(completedOrdersCount);

      const avgExerciseMinutes = exerciseSessions.length > 0 
        ? Math.round(exerciseSessions.reduce((sum, session) => sum + (session.duration_minutes || 0), 0) / exerciseSessions.length)
        : 0;

      const totalCaloriesBurned = exerciseSessions.reduce((sum, session) => sum + (session.calories_burned || 0), 0);

      // Generate chart data for the last 7 days from real data
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        const dateStr = format(date, 'yyyy-MM-dd');
        
        // Count exercise sessions for this date
        const dayExerciseSessions = exerciseSessions.filter(session => {
          if (!session.date) return false;
          const sessionDate = format(parseISO(session.date), 'yyyy-MM-dd');
          return sessionDate === dateStr;
        });
        const dayExerciseCount = dayExerciseSessions.length;
        const dayCalories = dayExerciseSessions.reduce((sum, s) => sum + (s.calories_burned || 0), 0);
        
        // Count veterinary visits for this date
        const dayVetVisits = veterinaryVisits.filter(visit => {
          if (!visit.date) return false;
          const visitDate = format(parseISO(visit.date), 'yyyy-MM-dd');
          return visitDate === dateStr;
        }).length;
        
        // Count feeding records for this date
        const dayFeeding = nutritionSessions.filter((session) => {
          const sessionDate = session.date ?? session.created_at?.split('T')[0];
          return sessionDate === dateStr;
        }).length;
        
        return {
          date: format(date, 'MMM dd'),
          exercise: dayExerciseCount,
          calories: dayCalories,
          vetVisits: dayVetVisits,
          feeding: dayFeeding
        };
      });

      // Generate monthly data for the last 6 months from real data
      const last6Months = Array.from({ length: 6 }, (_, i) => {
        const date = subDays(new Date(), (5 - i) * 30);
        const monthStart = startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
        const monthEnd = endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
        
        // Count exercise sessions in this month
        const monthExercise = exerciseSessions.filter(session => {
          if (!session.date) return false;
          const sessionDate = parseISO(session.date);
          return sessionDate >= monthStart && sessionDate <= monthEnd;
        }).length;
        
        // Count veterinary visits in this month
        const monthVetVisits = veterinaryVisits.filter(visit => {
          if (!visit.date) return false;
          const visitDate = parseISO(visit.date);
          return visitDate >= monthStart && visitDate <= monthEnd;
        }).length;
        
        // Count orders in this month
        const monthOrders = orders.filter(order => {
          if (!order.created_at) return false;
          const orderDate = parseISO(order.created_at);
          return orderDate >= monthStart && orderDate <= monthEnd;
        });
        const monthSpent = monthOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
        
        return {
          month: format(date, 'MMM'),
          exercise: monthExercise,
          vetVisits: monthVetVisits,
          orders: monthOrders.length,
          spent: monthSpent
        };
      });

      // Generate pet activity data from real data
      const petActivity = petsData?.map(pet => {
        // Count exercise sessions for this pet
        const petExerciseSessions = exerciseSessions.filter(session => session.pet_id === pet.id);
        const petExerciseCount = petExerciseSessions.length;
        
        // Count veterinary visits for this pet
        const petVetVisits = veterinaryVisits.filter(visit => visit.pet_id === pet.id).length;
        
        // Count feeding schedules for this pet
        const petFeedingSchedules = feedingSchedules.filter(schedule => schedule.pet_id === pet.id).length;
        
        return {
          name: pet.name,
          exercise: petExerciseCount,
          vetVisits: petVetVisits,
          feeding: petFeedingSchedules
        };
      }) || [];

      const totalSpent = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const nutritionMealsToday = nutritionSessions.filter(
        (s) => (s.date ?? s.created_at?.split('T')[0]) === todayStr,
      ).length;
      const monthStart = startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
      const vetVisitsThisMonth = countInRange(veterinaryVisits, (v) => v.date, monthStart, now);
      const vetSpentTotal = veterinaryVisits.reduce((sum, v) => sum + (Number(v.cost) || 0), 0);
      const weekStart = startOfDay(subDays(now, now.getDay()));
      const exerciseMinutesThisWeek = exerciseSessions
        .filter((session) => {
          if (!session.date) return false;
          const d = parseISO(session.date.includes('T') ? session.date : `${session.date}T12:00:00`);
          return d >= weekStart && d <= now;
        })
        .reduce((sum, session) => sum + (session.duration_minutes || 0), 0);
      const pendingAdoptionRequests = adoptionRequests.filter((req) =>
        ['pending', 'in_review', 'reviewing', 'submitted'].includes(String(req.status ?? '').toLowerCase()),
      ).length;

      setStats({
        totalPets: petsData?.length || 0,
        totalExerciseSessions: exerciseSessions.length,
        totalVeterinaryVisits: veterinaryVisits.length,
        totalFeedingSchedules: feedingSchedules.length,
        avgExerciseMinutes,
        totalCaloriesBurned,
        upcomingAppointments: processedAppointments.filter(apt => {
          if (!apt.appointment_date) return false;
          const aptDate = parseISO(apt.appointment_date);
          return aptDate >= startOfDay(new Date());
        }).length,
        activeFeedingSchedules: feedingSchedules.filter(schedule => schedule.is_active).length,
        totalOrders: orders.length,
        totalSpent: totalSpent,
        totalReminders: remindersData?.length ?? 0,
        activeBreedingMatches: breedingMatches.length,
        totalAdoptionRequests: adoptionRequests.length,
        nutritionMealsToday,
        vetVisitsThisMonth,
        vetSpentTotal,
        exerciseMinutesThisWeek,
        pendingAdoptionRequests,
      });

      setChartData(last7Days);
      setMonthlyData(last6Months);
      setPetActivityData(petActivity);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      localStorage.removeItem('user_role');
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const platformSections = [
    {
      id: 'pet-journey',
      title: 'Trazabilidad',
      description: 'Historial completo de tus mascotas',
      icon: Calendar,
      stats: `${pets.length} ${pets.length === 1 ? 'mascota' : 'mascotas'}`,
      action: 'Ver Historial',
      path: pets.length === 1 ? `/pet-journey/${pets[0]?.id}` : '/ajustes'
    },
    {
      id: 'marketplace',
      title: 'Tienda',
      description: 'Productos y servicios para tus mascotas',
      icon: ShoppingBag,
      stats: `${stats.totalOrders} órdenes`,
      action: 'Ver Tienda',
      path: '/marketplace'
    },
    {
      id: 'orders',
      title: 'Mis Órdenes',
      description: 'Gestiona tus compras y servicios',
      icon: ShoppingCart,
      stats: `${stats.totalOrders} órdenes`,
      action: 'Ver Órdenes',
      path: '/client-orders'
    },
    {
      id: 'feeding-schedules',
      title: 'Nutrición',
      description: 'Gestiona horarios de alimentación automática',
      icon: Utensils,
      stats: `${stats.activeFeedingSchedules} horarios activos`,
      action: 'Ver Nutrición',
      path: '/feeding-schedules'
    },
    {
      id: 'trazabilidad',
      title: 'Ejercicio',
      description: 'Registra y analiza el ejercicio de tus mascotas',
      icon: Activity,
      stats: `${stats.totalExerciseSessions} sesiones`,
      action: 'Ver Ejercicio',
      path: '/trazabilidad'
    },
    {
      id: 'veterinaria',
      title: 'Veterinaria',
      description: 'Registra citas y análisis veterinarios',
      icon: Stethoscope,
      stats: `${stats.totalVeterinaryVisits} visitas`,
      action: 'Ver Veterinaria',
      path: '/veterinaria'
    },
    {
      id: 'adopcion',
      title: 'Adopción',
      description: 'Encuentra tu mascota perfecta',
      icon: Users,
      stats: `${stats.totalAdoptionRequests} solicitudes`,
      action: 'Ver Adopción',
      path: '/adopcion'
    },
    {
      id: 'parejas',
      title: 'Parejas',
      description: 'Encuentra la pareja perfecta para tu mascota',
      icon: Heart,
      stats: `${stats.activeBreedingMatches} matches activos`,
      action: 'Ver Parejas',
      path: '/parejas'
    },
    {
      id: 'mascotas-perdidas',
      title: 'Mascotas Perdidas',
      description: 'Reporta y busca mascotas perdidas',
      icon: Search,
      stats: 'Mapa de búsqueda',
      action: 'Ver Mapa',
      path: '/mascotas-perdidas'
    },
    {
      id: 'ajustes',
      title: 'Ajustes',
      description: 'Gestiona tu perfil y configuración',
      icon: Settings,
      stats: 'Configuración',
      action: 'Ver Ajustes',
      path: '/ajustes'
    }
  ];

  if (loading) {
    return (
      <DashboardShell>
        <PageLoader variant="inline" message="Cargando tu dashboard…" />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {/* Header */}
      <PageHeader 
        title={`¡Bienvenido, ${getUserDisplayName()}!`}
        subtitle="Tu plataforma integral para el cuidado de mascotas"
        gradient="from-landing-aqua via-landing-mint to-landing-mango"
        showNotifications={false}
      >
        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5">
            <Heart className="w-4 h-4" />
            <span className="text-sm font-medium">
              {stats.totalPets} mascota{stats.totalPets !== 1 ? 's' : ''}
            </span>
          </div>
          {stats.upcomingAppointments > 0 && (
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">{stats.upcomingAppointments} cita{stats.upcomingAppointments !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <DashboardStatCard
          icon={Activity}
          value={stats.totalExerciseSessions}
          label="Sesiones de Ejercicio"
          footer={`${stats.totalCaloriesBurned} calorías quemadas`}
          trend={statTrends.exercise}
          gradientIndex={0}
        />
        <DashboardStatCard
          icon={Utensils}
          value={stats.activeFeedingSchedules}
          label="Horarios Activos"
          footer={`${stats.totalFeedingSchedules} horarios configurados`}
          trend={statTrends.feeding}
          gradientIndex={2}
        />
        <DashboardStatCard
          icon={Stethoscope}
          value={stats.totalVeterinaryVisits}
          label="Visitas Veterinarias"
          footer="Historial médico completo"
          trend={statTrends.vet}
          gradientIndex={1}
        />
        <DashboardStatCard
          icon={CreditCard}
          value={`Q${stats.totalSpent.toFixed(2)}`}
          label="Total Gastado"
          footer={`${completedOrders} órdenes completadas`}
          trend={statTrends.spent}
          gradientIndex={3}
        />
      </div>

      {/* Trazabilidad — mascotas */}
      {pets.length > 0 && (
        <DashboardGlassCard
          title="Trazabilidad"
          subtitle="Historial completo y trazabilidad de tus mascotas"
          icon={Calendar}
          gradientIndex={4}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pets.map((pet, i) => {
              const theme = landingCardThemes[i % landingCardThemes.length];
              return (
                <div
                  key={pet.id}
                  onClick={() => navigate(`/pet-journey/${pet.id}`)}
                  className={`group cursor-pointer rounded-xl p-4 border ${theme.border} ${theme.bg} hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    {pet.image_url ? (
                      <img
                        src={pet.image_url}
                        alt={pet.name}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-md"
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${theme.icon} flex items-center justify-center text-white text-xl font-bold shadow-md`}>
                        {pet.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{pet.name}</h3>
                      <p className="text-sm text-gray-600 truncate">{pet.breed || formatSpeciesLabel(pet.species)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                    {pet.age ? <span>{pet.age} años</span> : <span />}
                    {pet.weight ? <span>{pet.weight} kg</span> : <span />}
                  </div>
                  <Button
                    className={`w-full ${landingBtnPrimary}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/pet-journey/${pet.id}`);
                    }}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Ver Historial Completo
                  </Button>
                </div>
              );
            })}
          </div>
        </DashboardGlassCard>
      )}

      {/* Citas */}
      <DashboardGlassCard
        title="Mis Citas"
        subtitle={appointments.length > 0 ? `${appointments.length} cita${appointments.length !== 1 ? 's' : ''} registrada${appointments.length !== 1 ? 's' : ''}` : 'Agenda de servicios'}
        icon={Calendar}
        gradientIndex={1}
      >
          {appointments.length === 0 ? (
            <div className="text-center py-12 md:py-16">
              <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-landing-aqua/20 to-landing-mint/20 flex items-center justify-center">
                <Calendar className="w-10 h-10 text-landing-aqua-dark" />
              </div>
              <p className="text-lg font-semibold text-gray-800 mb-2">No tienes citas programadas</p>
              <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">Reserva servicios desde el marketplace y aparecerán aquí en tu calendario</p>
              <Button
                onClick={() => navigate('/marketplace/services')}
                className={landingBtnPrimary}
              >
                Ver Servicios Disponibles
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8">
              {/* Calendar View */}
              <div className="lg:col-span-8 w-full overflow-hidden">
                <div className="bg-white/90 rounded-xl border border-gray-100 shadow-sm p-3 md:p-6 lg:p-8 w-full overflow-x-auto">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border w-full min-w-[280px]"
                    modifiers={{
                      hasAppointments: appointments.map(apt => 
                        startOfDay(parseISO(apt.appointment_date))
                      )
                    }}
                    modifiersClassNames={{
                      hasAppointments: "bg-gradient-to-br from-landing-aqua/30 to-landing-mint/30 text-landing-aqua-dark font-semibold border border-landing-aqua/40"
                    }}
                  />
                  {selectedDate && (
                    <div className="mt-4 p-3 bg-landing-aqua/10 rounded-xl border border-landing-aqua/20">
                      <p className="text-sm font-medium text-landing-aqua-dark">
                        {appointments.filter(apt => isSameDay(parseISO(apt.appointment_date), selectedDate)).length} 
                        {' '}cita{appointments.filter(apt => isSameDay(parseISO(apt.appointment_date), selectedDate)).length !== 1 ? 's' : ''} 
                        {' '}el {format(selectedDate, "d 'de' MMMM", { locale: es })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Appointments List for Selected Date */}
              <div className="lg:col-span-4 w-full">
                <div className="sticky top-6 w-full">
                  <div className="bg-gradient-to-br from-landing-aqua/5 to-landing-mint/10 rounded-xl p-4 mb-4 border border-landing-aqua/15">
                    <h3 className="font-bold text-lg text-gray-800 capitalize">
                      {selectedDate ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: es }) : 'Selecciona una fecha'}
                    </h3>
                    {selectedDate && (
                      <p className="text-sm text-gray-600 mt-1">
                        {appointments.filter(apt => isSameDay(parseISO(apt.appointment_date), selectedDate)).length} 
                        {' '}cita{appointments.filter(apt => isSameDay(parseISO(apt.appointment_date), selectedDate)).length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  {selectedDate ? (
                    <div className="space-y-4 max-h-[650px] overflow-y-auto pr-2 custom-scrollbar">
                      {appointments
                        .filter(apt => isSameDay(parseISO(apt.appointment_date), selectedDate))
                        .sort((a, b) => {
                          const timeA = a.appointment_time || '00:00';
                          const timeB = b.appointment_time || '00:00';
                          return timeA.localeCompare(timeB);
                        })
                        .map((appointment) => (
                          <div 
                            key={appointment.id} 
                            className="group relative bg-white/90 border border-gray-100 rounded-xl p-5 hover:border-landing-aqua/40 hover:shadow-lg transition-all duration-300"
                          >
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-landing-aqua/10 to-landing-mint/10 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 mb-3">
                                    <h4 className="font-bold text-gray-900 text-base truncate">
                                      {appointment.provider_services?.service_name || 'Servicio'}
                                    </h4>
                                    <Badge 
                                      variant={appointment.status === 'confirmed' ? 'default' : appointment.status === 'pending' ? 'secondary' : appointment.status === 'completed' ? 'default' : 'destructive'} 
                                      className="shrink-0 text-xs font-semibold px-2 py-1 shadow-sm"
                                    >
                                      {appointment.status === 'confirmed' && '✓ Confirmada'}
                                      {appointment.status === 'pending' && '⏳ Pendiente'}
                                      {appointment.status === 'cancelled' && '✕ Cancelada'}
                                      {appointment.status === 'completed' && '✓ Completada'}
                                    </Badge>
                                  </div>
                                  <div className="space-y-2.5">
                                    {appointment.provider_services?.service_category && (
                                      <div className="flex items-center gap-2 text-sm text-gray-700 bg-landing-mango/10 rounded-lg px-3 py-2 border border-landing-mango/20">
                                        <Tag className="w-4 h-4 text-landing-mango-dark shrink-0" />
                                        <span className="font-medium capitalize">{appointment.provider_services.service_category}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                                      <Clock className="w-4 h-4 text-landing-aqua-dark shrink-0" />
                                      <span className="font-medium">{appointment.appointment_time}</span>
                                    </div>
                                    {appointment.provider_services?.duration_minutes && (
                                      <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                                        <Timer className="w-4 h-4 text-blue-600 shrink-0" />
                                        <span className="font-medium">Duración: {appointment.provider_services.duration_minutes} minutos</span>
                                      </div>
                                    )}
                                    {appointment.provider_services?.providers?.business_name && (
                                      <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                                        <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                                        <span className="truncate font-medium">{appointment.provider_services.providers.business_name}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2 text-sm text-gray-700 bg-gradient-to-r from-landing-aqua/10 to-landing-mint/10 rounded-lg px-3 py-2 border border-landing-aqua/20">
                                      <Coins className="w-4 h-4 text-landing-aqua-dark shrink-0" />
                                      <span className="font-bold text-landing-aqua-dark">
                                        {appointment.provider_services?.currency === 'GTQ' ? 'Q.' : '$'}{appointment.provider_services?.price || 0}
                                      </span>
                                    </div>
                                    {appointment.provider_services?.description && (
                                      <div className="mt-3 pt-3 border-t border-gray-200">
                                        <div className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                                          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                          <div>
                                            <span className="font-semibold text-blue-700 block mb-1">Descripción:</span>
                                            <p className="text-gray-700">{appointment.provider_services.description}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    {appointment.notes && (
                                      <div className="mt-3 pt-3 border-t border-gray-200">
                                        <p className="text-xs text-gray-600 italic bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                                          <span className="font-semibold text-blue-700">Mis Notas:</span> {appointment.notes}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      {appointments.filter(apt => isSameDay(parseISO(apt.appointment_date), selectedDate)).length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                            <Calendar className="w-8 h-8 text-gray-400" />
                          </div>
                          <p className="font-medium text-gray-600">No hay citas para este día</p>
                          <p className="text-sm text-gray-500 mt-1">Selecciona otra fecha</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                      <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="font-medium text-gray-600">Selecciona una fecha</p>
                      <p className="text-sm text-gray-500 mt-1">en el calendario para ver las citas</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
      </DashboardGlassCard>

      {/* Feeding Notifications - Moved here to avoid taking too much space at the top */}
      <FeedingNotification />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <DashboardGlassCard
          title="Tendencias de Actividad"
          subtitle="Últimos 7 días"
          icon={TrendingUp}
          gradientIndex={0}
        >
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorExercise" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={landingChartColors.mint} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={landingChartColors.mint} stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorCalories" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={landingChartColors.mango} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={landingChartColors.mango} stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" fontSize={12} stroke="#9ca3af" />
                <YAxis fontSize={12} stroke="#9ca3af" />
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <Tooltip 
                  formatter={(value, name) => [
                    value, 
                    name === 'exercise' ? 'Ejercicio' : name === 'calories' ? 'Calorías' : name
                  ]}
                  labelFormatter={(label) => `Fecha: ${label}`}
                />
                <Area type="monotone" dataKey="exercise" stroke={landingChartColors.mint} fillOpacity={1} fill="url(#colorExercise)" />
                <Area type="monotone" dataKey="calories" stroke={landingChartColors.mango} fillOpacity={1} fill="url(#colorCalories)" />
              </AreaChart>
            </ResponsiveContainer>
        </DashboardGlassCard>

        <DashboardGlassCard
          title="Resumen Mensual"
          subtitle="Actividad de los últimos 6 meses"
          icon={BarChart3}
          gradientIndex={2}
        >
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" fontSize={12} stroke="#9ca3af" />
                <YAxis fontSize={12} stroke="#9ca3af" />
                <Tooltip 
                  formatter={(value, name) => [
                    value, 
                    name === 'exercise' ? 'Ejercicio' : 
                    name === 'vetVisits' ? 'Visitas Veterinarias' : 
                    name === 'orders' ? 'Órdenes' : 
                    name === 'spent' ? 'Gastado' : name
                  ]}
                  labelFormatter={(label) => `Mes: ${label}`}
                />
                <Legend />
                <Bar dataKey="exercise" fill={landingChartColors.aqua} name="Ejercicio" radius={[4, 4, 0, 0]} />
                <Bar dataKey="vetVisits" fill={landingChartColors.mango} name="Visitas Veterinarias" radius={[4, 4, 0, 0]} />
                <Bar dataKey="orders" fill={landingChartColors.mint} name="Órdenes" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
        </DashboardGlassCard>
      </div>

      {/* Actividad + Accesos rápidos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <DashboardGlassCard
          title="Actividad por Mascota"
          subtitle="Sesiones de ejercicio"
          icon={Heart}
          gradientIndex={3}
          className="lg:col-span-1"
        >
            {petActivityData.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">Sin sesiones de ejercicio registradas</p>
            ) : (
              <div className="space-y-3">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={petActivityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={68}
                      innerRadius={38}
                      fill="#8884d8"
                      dataKey="exercise"
                    >
                      {petActivityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={landingChartPalette[index % landingChartPalette.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        `${value} sesiones`,
                        name === 'exercise' ? 'Ejercicio' : name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-1">
                  {petActivityData.map((entry, index) => (
                    <li key={entry.name} className="flex items-center gap-1.5 text-sm text-gray-700">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: landingChartPalette[index % landingChartPalette.length] }}
                      />
                      <span>
                        {entry.name}: <strong>{entry.exercise}</strong>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </DashboardGlassCard>

        <DashboardGlassCard
          title="Accesos Rápidos"
          subtitle="Todas las secciones de la plataforma"
          icon={Zap}
          gradientIndex={4}
          className="lg:col-span-2"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
            {platformSections.map((section, index) => {
              const IconComponent = section.icon;
              const theme = landingCardThemes[index % landingCardThemes.length];
              return (
                <div 
                  key={section.id}
                  className={`group cursor-pointer rounded-xl p-3 md:p-4 border ${theme.border} ${theme.bg} hover:shadow-md transition-all duration-300 hover:-translate-y-0.5`}
                  onClick={() => section.path ? navigate(section.path) : navigate(`/client-dashboard?section=${section.id}`)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br ${theme.icon} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                      <IconComponent className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-sm md:text-base text-gray-900 truncate">{section.title}</h3>
                        <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-landing-aqua-dark shrink-0 transition-colors" />
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{section.description}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-medium text-landing-aqua-dark">{section.stats}</span>
                        <span className="text-xs text-gray-400">{section.action}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DashboardGlassCard>
      </div>

      {/* Análisis avanzado */}
      <DashboardGlassCard
        title="Análisis Avanzado"
        subtitle="Resumen de salud, gastos y actividad social"
        icon={BarChart3}
        gradientIndex={5}
      >
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-gray-100/80 p-1 rounded-xl">
              <TabsTrigger value="overview" className="text-xs md:text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:text-landing-aqua-dark data-[state=active]:shadow-sm">Resumen</TabsTrigger>
              <TabsTrigger value="health" className="text-xs md:text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:text-landing-aqua-dark data-[state=active]:shadow-sm">Salud</TabsTrigger>
              <TabsTrigger value="spending" className="text-xs md:text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:text-landing-aqua-dark data-[state=active]:shadow-sm">Gastos</TabsTrigger>
              <TabsTrigger value="social" className="text-xs md:text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:text-landing-aqua-dark data-[state=active]:shadow-sm">Social</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-4 md:mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-gradient-to-br from-landing-mint/10 to-landing-aqua/10 p-4 md:p-6 rounded-xl border border-landing-mint/20">
                  <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-landing-mint to-landing-aqua rounded-xl flex items-center justify-center shadow-sm">
                      <Activity className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 text-sm md:text-base">Ejercicio</h3>
                      <p className="text-xs md:text-sm text-gray-600">{stats.totalExerciseSessions} sesiones</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Minutos esta semana</span>
                      <span className="font-medium text-gray-800">{stats.exerciseMinutesThisWeek} min</span>
                    </div>
                    <Progress
                      value={Math.min(100, (stats.exerciseMinutesThisWeek / 300) * 100)}
                      className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-landing-mint [&>div]:to-landing-aqua"
                    />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-landing-aqua/10 to-landing-mango/10 p-6 rounded-xl border border-landing-aqua/20">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-landing-aqua to-landing-mango rounded-xl flex items-center justify-center shadow-sm">
                      <Eye className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">Parejas</h3>
                      <p className="text-sm text-gray-600">{stats.activeBreedingMatches} matches activos</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Recordatorios activos</span>
                      <span className="font-medium text-gray-800">{stats.totalReminders}</span>
                    </div>
                    <Progress
                      value={Math.min(100, stats.totalReminders * 10)}
                      className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-landing-aqua [&>div]:to-landing-mango"
                    />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-landing-mango/10 to-landing-tropical/10 p-6 rounded-xl border border-landing-mango/20">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-landing-mango to-landing-tropical rounded-xl flex items-center justify-center shadow-sm">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">Adopción</h3>
                      <p className="text-sm text-gray-600">{stats.totalAdoptionRequests} solicitudes</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">En revisión</span>
                      <span className="font-medium text-gray-800">{stats.pendingAdoptionRequests}</span>
                    </div>
                    <Progress
                      value={
                        stats.totalAdoptionRequests > 0
                          ? Math.min(100, (stats.pendingAdoptionRequests / stats.totalAdoptionRequests) * 100)
                          : 0
                      }
                      className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-landing-mango [&>div]:to-landing-tropical"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="health" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-landing-mango/10 to-landing-tropical/10 p-6 rounded-xl border border-landing-mango/20">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-landing-mango-dark" />
                    Salud Veterinaria
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Visitas este mes</span>
                      <span className="font-medium text-gray-800">{stats.vetVisitsThisMonth}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Citas próximas</span>
                      <span className="font-medium text-gray-800">{stats.upcomingAppointments}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gasto veterinario</span>
                      <span className="font-medium text-gray-800">
                        {stats.vetSpentTotal > 0 ? `Q${stats.vetSpentTotal.toFixed(0)}` : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-landing-mint/10 to-landing-aqua/10 p-6 rounded-xl border border-landing-mint/20">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Utensils className="w-5 h-5 text-landing-aqua-dark" />
                    Nutrición
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Horarios activos</span>
                      <span className="font-medium text-gray-800">{stats.activeFeedingSchedules}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Comidas hoy</span>
                      <span className="font-medium text-gray-800">{stats.nutritionMealsToday}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Promedio por sesión</span>
                      <span className="font-medium text-gray-800">
                        {stats.avgExerciseMinutes > 0 ? `${stats.avgExerciseMinutes} min` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="spending" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-landing-mint/10 to-landing-aqua/10 p-6 rounded-xl border border-landing-mint/20">
                  <div className="flex items-center gap-3 mb-4">
                    <ShoppingCart className="w-8 h-8 text-emerald-600" />
                    <div>
                      <h3 className="font-semibold text-gray-800">Marketplace</h3>
                      <p className="text-2xl font-bold text-gray-900">Q{stats.totalSpent.toFixed(0)}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{completedOrders} órdenes completadas</p>
                </div>

                <div className="bg-gradient-to-br from-landing-mango/10 to-landing-tropical/10 p-6 rounded-xl border border-landing-mango/20">
                  <div className="flex items-center gap-3 mb-4">
                    <Stethoscope className="w-8 h-8 text-landing-mango-dark" />
                    <div>
                      <h3 className="font-semibold text-gray-800">Veterinaria</h3>
                      <p className="text-2xl font-bold text-gray-900">Q{stats.vetSpentTotal.toFixed(0)}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{stats.totalVeterinaryVisits} visitas registradas</p>
                </div>

                <div className="bg-gradient-to-br from-landing-aqua/10 to-landing-mango/10 p-6 rounded-xl border border-landing-aqua/20">
                  <div className="flex items-center gap-3 mb-4">
                    <CreditCard className="w-8 h-8 text-landing-aqua-dark" />
                    <div>
                      <h3 className="font-semibold text-gray-800">Total pedidos</h3>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">Historial en Mis pedidos</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="social" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-landing-aqua/10 to-landing-mango/10 p-6 rounded-xl border border-landing-aqua/20">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-landing-aqua-dark" />
                    Parejas
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Matches activos</span>
                      <span className="font-medium text-gray-800">{stats.activeBreedingMatches}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-landing-mint/10 to-landing-tropical/10 p-6 rounded-xl border border-landing-mint/20">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-landing-mint-dark" />
                    Adopción
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Solicitudes enviadas</span>
                      <span className="font-medium text-gray-800">{stats.totalAdoptionRequests}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">En revisión</span>
                      <span className="font-medium text-gray-800">{stats.pendingAdoptionRequests}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
      </DashboardGlassCard>
    </DashboardShell>
  );
};

export default Dashboard;