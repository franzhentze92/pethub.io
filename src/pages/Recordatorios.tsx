import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Bell,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Stethoscope,
  Scissors,
  Shield,
  Heart,
  TrendingUp,
  CalendarDays,
  Filter,
  Plus,
  Utensils,
  Pill,
  Activity,
  ExternalLink,
  Trash2,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import { PageLoader } from '@/components/PageLoader';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { MobileSectionCard } from '@/components/mobile/MobileUi';
import { landingBtnSolidMint } from '@/lib/landingTheme';
import { cn } from '@/lib/utils';
import { getAppointmentTypeLabel, isVaccinationType } from '@/lib/veterinaryTypes';
import { computeVaccinationStatus } from '@/lib/vaccinationCatalog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, parseISO, isSameDay, startOfDay, isAfter, isBefore, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { FeedingScheduleService } from '@/services/FeedingScheduleService';
import {
  completePetReminder,
  deletePetReminder,
  fetchPetReminders,
  PET_REMINDER_TYPE_LABELS,
  type PetReminderRow,
} from '@/lib/petReminders';
import type { Reminder, PetSummary, ReminderType } from '@/lib/recordatorioTypes';
import { computeReminderStatusAndPriority } from '@/lib/recordatorioTypes';
import { RecordatoriosEmptyState } from '@/components/recordatorios/RecordatoriosEmptyState';
import { ManualReminderDialog } from '@/components/recordatorios/ManualReminderDialog';
import { useBlueprintGuidedTourOptional } from '@/contexts/BlueprintGuidedTourContext';
import { getPushPermission, isPushSupported } from '@/lib/pushNotifications';

const MANUAL_TYPES: ReminderType[] = [
  'feeding',
  'exercise',
  'vet',
  'play',
  'medication',
  'grooming',
  'custom',
];

const Recordatorios: React.FC = () => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [pets, setPets] = useState<PetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [filterPet, setFilterPet] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const guidedTour = useBlueprintGuidedTourOptional();

  const pushPermission = isPushSupported() ? getPushPermission() : 'unsupported';

  const migrateLegacyCompletedReminders = async () => {
    if (!user?.id) return;
    const storageKey = `completed_reminders_${user.id}`;
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const legacyIds: string[] = JSON.parse(saved);
      const sessionIds = legacyIds
        .map((id) => id.match(/^(?:vaccination|followup)-(.+)$/)?.[1] ?? null)
        .filter((id): id is string => Boolean(id));
      if (sessionIds.length > 0) {
        await supabase
          .from('veterinary_sessions')
          .update({ follow_up_completed_at: new Date().toISOString() })
          .in('id', sessionIds)
          .is('follow_up_completed_at', null);
      }
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Could not migrate legacy completed reminders:', error);
    }
  };

  const buildVaccinationReminder = (
    record: {
      id: string;
      pet_id: string;
      vaccine_name: string;
      next_due_date: string;
      pets?: PetSummary | null;
    },
    completed = false,
  ): Reminder => {
    const pet = record.pets;
    const dueDate = parseISO(record.next_due_date);
    const today = startOfDay(new Date());
    const statusKey = computeVaccinationStatus(record.next_due_date);
    let status: Reminder['status'] = completed ? 'completed' : 'pending';
    let priority: Reminder['priority'] = 'medium';
    if (!completed) {
      if (isBefore(dueDate, today)) {
        status = 'overdue';
        priority = 'urgent';
      } else if (statusKey === 'due_soon') {
        status = 'pending';
        priority = 'high';
      } else if (isAfter(dueDate, addDays(today, 7))) {
        status = 'upcoming';
        priority = 'low';
      } else {
        status = 'pending';
        priority = 'high';
      }
    }
    return {
      id: `pet-vaccination-${record.id}`,
      type: 'vaccination',
      title: `Vacuna: ${record.vaccine_name}`,
      description: 'Recordatorio de vacunación',
      date: record.next_due_date,
      pet_id: record.pet_id,
      pet_name: pet?.name || 'Mascota desconocida',
      status,
      source_id: record.id,
      source_table: 'pet_vaccinations',
      priority,
      action_path: '/veterinaria',
    };
  };

  const buildVetFollowUpReminder = (
    session: {
      id: string;
      pet_id: string;
      appointment_type?: string | null;
      diagnosis?: string | null;
      follow_up_date: string;
      pets?: PetSummary | null;
    },
    completed = false,
  ): Reminder => {
    const pet = session.pets;
    const followUpDate = parseISO(session.follow_up_date);
    const today = startOfDay(new Date());
    let status: Reminder['status'] = completed ? 'completed' : 'pending';
    let priority: Reminder['priority'] = 'medium';
    if (!completed) {
      if (isBefore(followUpDate, today)) {
        status = 'overdue';
        priority = 'urgent';
      } else if (isAfter(followUpDate, addDays(today, 7))) {
        status = 'upcoming';
        priority = 'low';
      } else {
        status = 'pending';
        priority = 'high';
      }
    }
    return {
      id: `followup-${session.id}`,
      type: 'follow_up',
      title: `Seguimiento: ${getAppointmentTypeLabel(session.appointment_type)}`,
      description: session.diagnosis || 'Cita de seguimiento veterinario',
      date: session.follow_up_date,
      pet_id: session.pet_id,
      pet_name: pet?.name || 'Mascota desconocida',
      status,
      source_id: session.id,
      source_table: 'veterinary_sessions',
      priority,
      action_path: '/veterinaria',
    };
  };

  const buildManualReminder = (row: PetReminderRow): Reminder => {
    const dateStr = row.scheduled_date || row.due_date || format(new Date(), 'yyyy-MM-dd');
    const completed = row.is_completed;
    const { status, priority } = computeReminderStatusAndPriority(dateStr, completed);
    const type = (MANUAL_TYPES.includes(row.reminder_type as ReminderType)
      ? row.reminder_type
      : 'custom') as ReminderType;

    return {
      id: `manual-${row.id}`,
      type,
      title: row.title,
      description: row.description || PET_REMINDER_TYPE_LABELS[type as keyof typeof PET_REMINDER_TYPE_LABELS] || 'Recordatorio',
      date: dateStr,
      time: row.scheduled_time ? row.scheduled_time.substring(0, 5) : undefined,
      pet_id: row.pet_id,
      pet_name: row.pets?.name || 'Mascota desconocida',
      status: !row.is_active && !completed ? 'upcoming' : status,
      source_id: row.id,
      source_table: 'pet_reminders',
      priority: (row.priority as Reminder['priority']) || priority,
      is_active: row.is_active,
    };
  };


  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      await migrateLegacyCompletedReminders();

      const { data: petsData, error: petsError } = await supabase
        .from('pets')
        .select('id, name, species, breed, image_url')
        .eq('owner_id', user.id);
      if (petsError) throw petsError;
      setPets(petsData || []);

      const allReminders: Reminder[] = [];

      const { data: pendingVetSessions } = await supabase
        .from('veterinary_sessions')
        .select(`*, pets (id, name, species, breed, image_url)`)
        .eq('owner_id', user.id)
        .not('follow_up_date', 'is', null)
        .is('follow_up_completed_at', null);

      pendingVetSessions?.forEach((session) => {
        if (isVaccinationType(session.appointment_type)) return;
        allReminders.push(buildVetFollowUpReminder(session));
      });

      const { data: pendingVaccinations } = await supabase
        .from('pet_vaccinations')
        .select(`id, pet_id, vaccine_name, next_due_date, pets (id, name, species, breed, image_url)`)
        .eq('owner_id', user.id)
        .not('next_due_date', 'is', null)
        .is('reminder_completed_at', null);

      pendingVaccinations?.forEach((record) => {
        allReminders.push(buildVaccinationReminder(record));
      });

      const { data: completedVetSessions } = await supabase
        .from('veterinary_sessions')
        .select(`*, pets (id, name, species, breed, image_url)`)
        .eq('owner_id', user.id)
        .not('follow_up_completed_at', 'is', null)
        .order('follow_up_completed_at', { ascending: false })
        .limit(50);

      completedVetSessions?.forEach((session) => {
        if (!session.follow_up_date || isVaccinationType(session.appointment_type)) return;
        allReminders.push(buildVetFollowUpReminder(session, true));
      });

      const { data: completedVaccinations } = await supabase
        .from('pet_vaccinations')
        .select(`id, pet_id, vaccine_name, next_due_date, pets (id, name, species, breed, image_url)`)
        .eq('owner_id', user.id)
        .not('reminder_completed_at', 'is', null)
        .order('reminder_completed_at', { ascending: false })
        .limit(50);

      completedVaccinations?.forEach((record) => {
        if (!record.next_due_date) return;
        allReminders.push(buildVaccinationReminder(record, true));
      });

      const { data: serviceAppointments } = await supabase
        .from('service_appointments')
        .select(`
          *,
          provider_services (service_name, service_category),
          provider_service_time_slots (slot_start_time, slot_end_time)
        `)
        .eq('client_id', user.id)
        .in('status', ['pending', 'confirmed', 'completed']);

      serviceAppointments?.forEach((appointment) => {
        const timeSlot = appointment.provider_service_time_slots;
        const service = appointment.provider_services;
        const appointmentDate = parseISO(appointment.appointment_date);
        const today = startOfDay(new Date());
        const isCompleted = appointment.status === 'completed';
        let status: Reminder['status'] = 'pending';
        let priority: Reminder['priority'] = 'medium';
        if (isCompleted) {
          status = 'completed';
          priority = 'low';
        } else if (isBefore(appointmentDate, today)) {
          status = 'overdue';
          priority = 'urgent';
        } else if (isAfter(appointmentDate, addDays(today, 7))) {
          status = 'upcoming';
          priority = 'low';
        } else {
          status = 'pending';
          priority = 'high';
        }
        allReminders.push({
          id: `service-${appointment.id}`,
          type: 'service_appointment',
          title: service?.service_name || 'Servicio',
          description: service?.service_category || 'Cita de servicio',
          date: appointment.appointment_date.split('T')[0],
          time: timeSlot?.slot_start_time ? timeSlot.slot_start_time.substring(0, 5) : undefined,
          pet_id: '',
          pet_name: 'Servicio general',
          status,
          source_id: appointment.id,
          source_table: 'service_appointments',
          priority,
          action_path: '/client-orders',
        });
      });

      try {
        const meals = await FeedingScheduleService.getScheduledMealsInRange(user.id, 30);
        meals.forEach((meal) => {
          const dateStr = meal.scheduled_date;
          const { status, priority } = computeReminderStatusAndPriority(dateStr, meal.status === 'completed');
          const scheduleName =
            (meal.pet_feeding_schedules as { schedule_name?: string } | null)?.schedule_name ?? 'Comida';
          const foodName =
            (meal.pet_foods as { name?: string; brand?: string } | null)?.name ?? meal.meal_type;
          allReminders.push({
            id: `feeding-meal-${meal.id}`,
            type: 'feeding',
            title: `${scheduleName}: ${foodName}`,
            description: `Comida programada (${meal.meal_type})`,
            date: dateStr,
            time: meal.scheduled_time?.substring(0, 5),
            pet_id: meal.pet_id,
            pet_name: (meal.pets as { name?: string } | null)?.name ?? 'Mascota',
            status: meal.status === 'completed' ? 'completed' : status,
            source_id: meal.id,
            source_table: 'automated_meals',
            priority,
            action_path: '/feeding-schedules',
          });
        });
      } catch (feedingErr) {
        console.warn('Feeding meals not loaded:', feedingErr);
      }

      const { data: activeSchedules } = await supabase
        .from('pet_feeding_schedules')
        .select(`id, pet_id, schedule_name, feeding_times, days_of_week, is_active, pets (name)`)
        .eq('owner_id', user.id)
        .eq('is_active', true);

      const today = startOfDay(new Date());
      activeSchedules?.forEach((schedule) => {
        const feedingTimes = (schedule.feeding_times as Array<{ time: string; meal_type?: string }>) || [];
        const daysOfWeek: number[] = schedule.days_of_week || [1, 2, 3, 4, 5, 6, 7];
        for (let d = 0; d < 14; d++) {
          const day = addDays(today, d);
          const isoDay = day.getDay() === 0 ? 7 : day.getDay();
          if (!daysOfWeek.includes(isoDay)) continue;
          feedingTimes.forEach((ft, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const alreadyHasMeal = allReminders.some(
              (r) =>
                r.source_table === 'automated_meals' &&
                r.pet_id === schedule.pet_id &&
                r.date === dateStr &&
                r.time === ft.time?.substring(0, 5),
            );
            if (alreadyHasMeal) return;
            const { status, priority } = computeReminderStatusAndPriority(dateStr, false);
            allReminders.push({
              id: `feeding-schedule-${schedule.id}-${dateStr}-${idx}`,
              type: 'feeding',
              title: schedule.schedule_name,
              description: `Horario de comida (${ft.meal_type || 'comida'})`,
              date: dateStr,
              time: ft.time?.substring(0, 5),
              pet_id: schedule.pet_id,
              pet_name: (schedule.pets as { name?: string } | null)?.name ?? 'Mascota',
              status,
              source_id: schedule.id,
              source_table: 'pet_feeding_schedules',
              priority,
              action_path: '/feeding-schedules',
            });
          });
        }
      });

      const manualRows = await fetchPetReminders(user.id);
      manualRows.forEach((row) => {
        if (row.is_completed) {
          allReminders.push({ ...buildManualReminder(row), status: 'completed' });
        } else if (row.is_active) {
          allReminders.push(buildManualReminder(row));
        }
      });

      allReminders.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
      setReminders(allReminders);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar los recordatorios');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  const activeReminders = useMemo(
    () => reminders.filter((r) => r.status !== 'completed'),
    [reminders],
  );

  const filteredReminders = useMemo(() => {
    return reminders.filter((reminder) => {
      if (reminder.status === 'completed' && filterDate !== 'completed') return false;
      if (filterPet !== 'all' && reminder.pet_id && reminder.pet_id !== filterPet) return false;
      const reminderDate = parseISO(reminder.date);
      const today = startOfDay(new Date());
      const weekFromNow = addDays(today, 7);
      const monthFromNow = addDays(today, 30);
      if (filterDate === 'today') return isSameDay(reminderDate, today);
      if (filterDate === 'week') return isAfter(reminderDate, today) && isBefore(reminderDate, weekFromNow);
      if (filterDate === 'month') return isAfter(reminderDate, today) && isBefore(reminderDate, monthFromNow);
      if (filterDate === 'overdue') return reminder.status === 'overdue';
      if (filterDate === 'completed') return reminder.status === 'completed';
      return true;
    });
  }, [reminders, filterPet, filterDate]);

  const remindersForSelectedDate = useMemo(
    () =>
      selectedDate
        ? filteredReminders.filter((r) => isSameDay(parseISO(r.date), selectedDate))
        : [],
    [filteredReminders, selectedDate],
  );

  const listReminders = useMemo(() => {
    if (selectedDate) return remindersForSelectedDate;
    if (filterDate === 'overdue') return filteredReminders.filter((r) => r.status === 'overdue');
    if (filterDate === 'completed') return filteredReminders;
    return filteredReminders.filter((r) => r.status !== 'overdue' && r.status !== 'pending');
  }, [selectedDate, remindersForSelectedDate, filteredReminders, filterDate]);

  const stats = useMemo(
    () => ({
      total: activeReminders.length,
      pending: activeReminders.filter((r) => r.status === 'pending').length,
      upcoming: activeReminders.filter((r) => r.status === 'upcoming').length,
      overdue: activeReminders.filter((r) => r.status === 'overdue').length,
    }),
    [activeReminders],
  );

  const getReminderIcon = (type: ReminderType) => {
    switch (type) {
      case 'vaccination':
        return Shield;
      case 'follow_up':
      case 'vet':
        return Stethoscope;
      case 'service_appointment':
      case 'grooming':
        return Scissors;
      case 'feeding':
        return Utensils;
      case 'medication':
        return Pill;
      case 'exercise':
        return Activity;
      default:
        return Bell;
    }
  };

  const getReminderColor = (type: ReminderType) => {
    switch (type) {
      case 'vaccination':
        return 'text-landing-aqua-dark';
      case 'follow_up':
      case 'vet':
        return 'text-landing-mint-dark';
      case 'service_appointment':
        return 'text-landing-mango-dark';
      case 'feeding':
        return 'text-amber-600';
      case 'medication':
        return 'text-purple-600';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 border border-red-200">Vencido</Badge>;
      case 'pending':
        return <Badge className="bg-landing-mango/15 text-landing-mango-dark border border-landing-mango/30">Pendiente</Badge>;
      case 'upcoming':
        return <Badge className="bg-landing-aqua/15 text-landing-aqua-dark border border-landing-aqua/30">Próximo</Badge>;
      case 'completed':
        return <Badge className="bg-landing-mint/15 text-landing-mint-dark border border-landing-mint/30">Completado</Badge>;
      default:
        return null;
    }
  };

  const getReminderAccent = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'border-l-red-500 bg-red-50/80';
      case 'pending':
        return 'border-l-landing-mango bg-landing-mango/5';
      case 'upcoming':
        return 'border-l-landing-aqua bg-landing-aqua/5';
      default:
        return 'border-l-landing-mint bg-white/70';
    }
  };

  const handleMarkAsCompleted = async (reminder: Reminder) => {
    try {
      if (reminder.source_table === 'service_appointments') {
        const { error } = await supabase
          .from('service_appointments')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', reminder.source_id);
        if (error) throw error;
      } else if (reminder.source_table === 'pet_vaccinations') {
        const { error } = await supabase
          .from('pet_vaccinations')
          .update({ reminder_completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', reminder.source_id);
        if (error) throw error;
      } else if (reminder.source_table === 'veterinary_sessions') {
        const { error } = await supabase
          .from('veterinary_sessions')
          .update({ follow_up_completed_at: new Date().toISOString() })
          .eq('id', reminder.source_id);
        if (error) throw error;
      } else if (reminder.source_table === 'automated_meals') {
        await FeedingScheduleService.markMealAsCompleted(reminder.source_id, user!.id);
      } else if (reminder.source_table === 'pet_reminders') {
        await completePetReminder(reminder.source_id);
      } else {
        toast.message('Abre Nutrición para gestionar este horario');
        return;
      }
      await loadData();
      toast.success('Recordatorio marcado como completado');
    } catch (error) {
      console.error('Error marking reminder as completed:', error);
      toast.error('Error al marcar el recordatorio como completado');
    }
  };

  const handleDeleteManual = async (reminder: Reminder) => {
    if (reminder.source_table !== 'pet_reminders') return;
    try {
      await deletePetReminder(reminder.source_id);
      await loadData();
      toast.success('Recordatorio eliminado');
    } catch {
      toast.error('No se pudo eliminar el recordatorio');
    }
  };

  const renderReminderCard = (reminder: Reminder, accent?: 'overdue' | 'pending') => {
    const IconComponent = getReminderIcon(reminder.type);
    const isManual = reminder.source_table === 'pet_reminders';

    return (
      <div
        key={reminder.id}
        className={cn(
          'rounded-xl border border-white/60 p-3 sm:p-4 border-l-4',
          accent === 'overdue'
            ? 'border-l-red-500 bg-red-50/80'
            : accent === 'pending'
              ? 'border-l-landing-mango bg-landing-mango/5'
              : getReminderAccent(reminder.status),
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <IconComponent className={cn('h-5 w-5 shrink-0', getReminderColor(reminder.type))} />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm sm:text-base truncate text-gray-900">{reminder.title}</h3>
              <p className="text-xs sm:text-sm text-gray-600 truncate">{reminder.description}</p>
            </div>
          </div>
          {getStatusBadge(reminder.status)}
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs sm:text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>{format(parseISO(reminder.date), "d 'de' MMMM, yyyy", { locale: es })}</span>
          </div>
          {reminder.time && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 shrink-0" />
              <span>{reminder.time}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Heart className="h-4 w-4 shrink-0" />
            <span>{reminder.pet_name}</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
          {reminder.action_path && (
            <Button size="sm" variant="outline" asChild className="min-h-[36px]">
              <Link to={reminder.action_path}>
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Ver detalle
              </Link>
            </Button>
          )}
          {reminder.status !== 'completed' && reminder.source_table !== 'pet_feeding_schedules' && (
            <Button
              size="sm"
              onClick={() => handleMarkAsCompleted(reminder)}
              className={cn('min-h-[36px] flex-1 sm:flex-none', landingBtnSolidMint)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Completar
            </Button>
          )}
          {isManual && (
            <Button
              size="sm"
              variant="ghost"
              className="min-h-[36px] text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => handleDeleteManual(reminder)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  const statCards = [
    { label: 'Activos', value: String(stats.total), sub: 'Recordatorios', icon: Bell },
    { label: 'Pendientes', value: String(stats.pending), sub: 'Por atender', icon: Clock },
    { label: 'Próximos', value: String(stats.upcoming), sub: 'Más adelante', icon: TrendingUp },
    { label: 'Vencidos', value: String(stats.overdue), sub: 'Requieren acción', icon: AlertTriangle },
  ];

  const statCardStyles = [
    { bg: 'bg-landing-mint/10', border: 'border-landing-mint/25', icon: 'text-landing-mint-dark' },
    { bg: 'bg-landing-aqua/10', border: 'border-landing-aqua/25', icon: 'text-landing-aqua-dark' },
    { bg: 'bg-landing-tropical/25', border: 'border-landing-tropical/40', icon: 'text-landing-mango-dark' },
    { bg: 'bg-landing-mango/10', border: 'border-landing-mango/30', icon: 'text-landing-mango-dark' },
  ];

  if (loading) {
    return (
      <DashboardShell variant="plain">
        <PageLoader variant="inline" message="Cargando recordatorios…" />
      </DashboardShell>
    );
  }

  const listTitle = selectedDate
    ? `Recordatorios del ${format(selectedDate, "d 'de' MMMM", { locale: es })}`
    : filterDate === 'overdue'
      ? 'Recordatorios vencidos'
      : filterDate === 'completed'
        ? 'Historial completados'
        : 'Próximos recordatorios';

  return (
    <DashboardShell variant="plain">
      <PageHeader
        variant="solid"
        accent="mint"
        title="Recordatorios"
        subtitle="Vacunas, citas, comidas y alertas personalizadas"
      >
        <div className="flex items-center gap-2">
          {pets.length > 0 && (
            <Button
              size="sm"
              onClick={() => setShowAddDialog(true)}
              data-blueprint-guided="create-reminder"
              className="bg-white text-gray-900 hover:bg-white/90 shadow-sm border-0"
            >
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Nuevo</span>
            </Button>
          )}
          <Bell className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
        </div>
      </PageHeader>

      {pushPermission !== 'granted' && pushPermission !== 'unsupported' && (
        <MobileSectionCard variant="plain" className="border-landing-mint/25 bg-landing-mint/5">
          <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-medium text-gray-900 text-sm">Activa las notificaciones push</p>
              <p className="text-xs text-gray-600 mt-0.5">
                Recibe alertas de vacunas, citas y comidas incluso con la app cerrada.
              </p>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link to="/ajustes">Configurar en Ajustes</Link>
            </Button>
          </div>
        </MobileSectionCard>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat, index) => {
          const style = statCardStyles[index % statCardStyles.length];
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={cn('rounded-2xl border p-4 bg-white', style.bg, style.border)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{stat.sub}</p>
                </div>
                <Icon className={cn('h-5 w-5 shrink-0 opacity-90', style.icon)} />
              </div>
            </div>
          );
        })}
      </div>

      <MobileSectionCard variant="plain">
        <div className="p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-4">
            <Filter className="w-4 h-4 text-landing-aqua-dark shrink-0" />
            Filtros
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="filter_pet">Mascota</Label>
              <Select value={filterPet} onValueChange={setFilterPet}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
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
              <Label htmlFor="filter_date">Fecha</Label>
              <Select value={filterDate} onValueChange={setFilterDate}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las fechas</SelectItem>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mes</SelectItem>
                  <SelectItem value="overdue">Vencidos</SelectItem>
                  <SelectItem value="completed">Completados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </MobileSectionCard>

      {stats.overdue > 0 && (
        <MobileSectionCard variant="plain" className="border-red-200/60">
          <div className="p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-base font-bold text-red-800 mb-4">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              Vencidos ({stats.overdue})
            </h3>
            <div className="space-y-3 max-h-[320px] overflow-y-auto">
              {filteredReminders.filter((r) => r.status === 'overdue').map((r) => renderReminderCard(r, 'overdue'))}
            </div>
          </div>
        </MobileSectionCard>
      )}

      {stats.pending > 0 && (
        <MobileSectionCard variant="plain">
          <div className="p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-base font-bold text-landing-mango-dark mb-4">
              <Clock className="w-5 h-5 shrink-0" />
              Pendientes ({stats.pending})
            </h3>
            <div className="space-y-3 max-h-[320px] overflow-y-auto">
              {filteredReminders.filter((r) => r.status === 'pending').map((r) => renderReminderCard(r, 'pending'))}
            </div>
          </div>
        </MobileSectionCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MobileSectionCard variant="plain">
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="flex items-center gap-2 text-base font-bold text-gray-900">
                <CalendarDays className="w-5 h-5 text-landing-aqua-dark shrink-0" />
                Calendario
              </h3>
              {selectedDate && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => setSelectedDate(undefined)}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Ver todos
                </Button>
              )}
            </div>
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-xl border border-gray-100 bg-white w-full"
              modifiers={{
                hasReminders: activeReminders.map((r) => startOfDay(parseISO(r.date))),
                hasOverdue: activeReminders.filter((r) => r.status === 'overdue').map((r) => startOfDay(parseISO(r.date))),
              }}
              modifiersClassNames={{
                hasReminders: 'bg-landing-aqua/20 text-landing-aqua-dark font-semibold border border-landing-aqua/30',
                hasOverdue: 'bg-red-200 text-red-900 font-bold border-2 border-red-400',
              }}
            />
            {selectedDate && (
              <div className="mt-4 p-3 rounded-xl bg-landing-mint/10 border border-landing-mint/20">
                <p className="text-sm font-medium text-landing-mint-dark">
                  {remindersForSelectedDate.length} recordatorio
                  {remindersForSelectedDate.length !== 1 ? 's' : ''} el{' '}
                  {format(selectedDate, "d 'de' MMMM", { locale: es })}
                </p>
              </div>
            )}
          </div>
        </MobileSectionCard>

        <div className="lg:col-span-2">
          <MobileSectionCard variant="plain">
            <div className="p-4 sm:p-5">
              <h3 className="text-base font-bold text-gray-900 mb-4">{listTitle}</h3>
              {listReminders.length === 0 ? (
                <RecordatoriosEmptyState
                  hasPets={pets.length > 0}
                  selectedDateLabel={
                    selectedDate ? format(selectedDate, "d 'de' MMMM", { locale: es }) : undefined
                  }
                  onCreateReminder={() => setShowAddDialog(true)}
                />
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {listReminders.map((reminder) => renderReminderCard(reminder))}
                </div>
              )}
            </div>
          </MobileSectionCard>
        </div>
      </div>

      {user?.id && (
        <ManualReminderDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          pets={pets}
          ownerId={user.id}
          onCreated={() => {
            toast.success('Recordatorio creado');
            loadData();
            void guidedTour?.notifySectionSaved('reminders');
          }}
        />
      )}
    </DashboardShell>
  );
};

export default Recordatorios;
