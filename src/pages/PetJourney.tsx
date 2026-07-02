import React, { useState, useEffect, useMemo } from 'react';
import PageLoader from '@/components/PageLoader';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Activity,
  Stethoscope,
  Utensils,
  ShoppingBag,
  Package,
  CreditCard,
  Eye,
  TrendingUp,
  MapPin,
  ArrowLeft,
  PawPrint,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import PageHeader from '@/components/PageHeader';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { MobileTabStrip, type MobileTabItem } from '@/components/mobile/MobileTabStrip';
import { MobileSectionCard } from '@/components/mobile/MobileUi';
import { landingCardThemes, landingFeatureGradients } from '@/lib/landingTheme';
import { cn } from '@/lib/utils';
import { getAppointmentTypeLabel } from '@/lib/veterinaryTypes';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { formatSpeciesLabel, formatPetOptionLabel, getPetSpeciesEmoji } from '@/utils/petLabels';
import PetJourneyOverview from '@/components/pet-journey/PetJourneyOverview';
interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  age: number | null;
  weight: number | null;
  image_url: string | null;
  owner_id: string;
  created_at: string;
}

interface TimelineEvent {
  id: string;
  type: 'product' | 'service' | 'veterinary' | 'exercise' | 'nutrition';
  title: string;
  description: string;
  date: string;
  cost: number;
  currency: string;
  metadata: any;
  icon: React.ReactNode;
}

interface PetStats {
  totalProducts: number;
  totalServices: number;
  totalVeterinaryVisits: number;
  totalExerciseSessions: number;
  totalNutritionSessions: number;
  totalCost: number;
  productsCost: number;
  servicesCost: number;
  veterinaryCost: number;
}

// Translation functions for English terms
const translateExerciseType = (type: string | null | undefined): string => {
  if (!type) return 'Actividad';
  
  const translations: { [key: string]: string } = {
    'agility': 'Agilidad',
    'walking': 'Caminata',
    'running': 'Correr',
    'swimming': 'Natación',
    'playing': 'Juego',
    'training': 'Entrenamiento',
    'hiking': 'Senderismo',
    'cycling': 'Ciclismo',
    'fetch': 'Buscar',
    'tug': 'Tirar',
    'obedience': 'Obediencia',
    'flyball': 'Flyball',
    'frisbee': 'Frisbee',
    'dock diving': 'Salto al agua',
    'rally': 'Rally',
    'nose work': 'Trabajo olfativo',
    'trick training': 'Entrenamiento de trucos',
    'other': 'Otro'
  };
  
  const lowerType = type.toLowerCase().trim();
  return translations[lowerType] || type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
};


const translateMealType = (type: string | null | undefined): string => {
  if (!type) return 'Comida';
  
  const translations: { [key: string]: string } = {
    'breakfast': 'Desayuno',
    'lunch': 'Almuerzo',
    'dinner': 'Cena',
    'snack': 'Merienda',
    'treat': 'Premio',
    'other': 'Otro'
  };
  
  const lowerType = type.toLowerCase().trim();
  return translations[lowerType] || type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
};

const translateIntensity = (intensity: string | null | undefined): string => {
  if (!intensity) return 'N/A';
  
  const translations: { [key: string]: string } = {
    'low': 'Baja',
    'medium': 'Media',
    'high': 'Alta'
  };
  
  const lowerIntensity = intensity.toLowerCase().trim();
  return translations[lowerIntensity] || intensity.charAt(0).toUpperCase() + intensity.slice(1).toLowerCase();
};

const eventGradientIndex: Record<TimelineEvent['type'], number> = {
  product: 0,
  service: 2,
  veterinary: 4,
  exercise: 1,
  nutrition: 3,
};

const getEventGradient = (type: TimelineEvent['type']) =>
  landingFeatureGradients[eventGradientIndex[type] % landingFeatureGradients.length];

const getEventTypeLabel = (type: TimelineEvent['type']) => {
  const labels: Record<TimelineEvent['type'], string> = {
    product: 'Producto',
    service: 'Servicio',
    veterinary: 'Veterinaria',
    exercise: 'Ejercicio',
    nutrition: 'Nutrición',
  };
  return labels[type];
};

const getPetEmoji = (species: string) => getPetSpeciesEmoji(species);

const PetJourney: React.FC = () => {
  const { petId } = useParams<{ petId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [stats, setStats] = useState<PetStats>({
    totalProducts: 0,
    totalServices: 0,
    totalVeterinaryVisits: 0,
    totalExerciseSessions: 0,
    totalNutritionSessions: 0,
    totalCost: 0,
    productsCost: 0,
    servicesCost: 0,
    veterinaryCost: 0
  });
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (petId && user) {
      loadPetData();
    }
  }, [petId, user]);

  const loadPetData = async () => {
    try {
      setLoading(true);
      
      // Load pet
      const { data: petData, error: petError } = await supabase
        .from('pets')
        .select('*')
        .eq('id', petId)
        .eq('owner_id', user?.id)
        .single();

      if (petError) throw petError;
      if (!petData) {
        toast.error('Mascota no encontrada');
        navigate('/dashboard');
        return;
      }

      setPet(petData);
      await loadTrazabilidadData(petData);
    } catch (error) {
      console.error('Error loading pet:', error);
      toast.error('Error al cargar la información de la mascota');
    } finally {
      setLoading(false);
    }
  };

  const loadTrazabilidadData = async (pet: Pet) => {
    try {
      const allEvents: TimelineEvent[] = [];
      let productsCost = 0;
      let servicesCost = 0;
      let veterinaryCost = 0;
      let totalProducts = 0;
      let totalServices = 0;
      let totalVeterinaryVisits = 0;
      let totalExerciseSessions = 0;
      let totalNutritionSessions = 0;

      // 1. Load products purchased for this pet using order_item_pets
      try {
        const { data: orderItemPets } = await supabase
          .from('order_item_pets')
          .select(`
            *,
            order_items (
              *,
              orders (
                id,
                order_number,
                created_at,
                currency
              )
            )
          `)
          .eq('pet_id', pet.id);

        if (orderItemPets) {
          orderItemPets.forEach((itemPet: any) => {
            const orderItem = itemPet.order_items;
            const order = orderItem?.orders;
            
            if (orderItem && order) {
              const cost = itemPet.price_per_pet || orderItem.total_price || 0;
              productsCost += cost;
              totalProducts += itemPet.quantity || 1;

              allEvents.push({
                id: `product-${itemPet.id}`,
                type: 'product',
                title: orderItem.item_name || 'Producto',
                description: `Cantidad: ${itemPet.quantity} | Orden: ${order.order_number}`,
                date: order.created_at,
                cost: cost,
                currency: order.currency || 'GTQ',
                metadata: { orderItem, order, itemPet },
                icon: <Package className="w-5 h-5" />,
              });
            }
          });
        }
      } catch (error) {
        console.warn('Error loading products (order_item_pets table might not exist):', error);
      }

      // 2. Load services linked to this pet via order_item_pets → order_item_id
      try {
        const { data: petOrderItems } = await supabase
          .from('order_item_pets')
          .select('order_item_id')
          .eq('pet_id', pet.id);

        const linkedOrderItemIds = (petOrderItems ?? [])
          .map((row: { order_item_id: string }) => row.order_item_id)
          .filter(Boolean);

        if (linkedOrderItemIds.length > 0) {
          const { data: services } = await supabase
            .from('service_appointments')
            .select(`
              *,
              provider_services (
                service_name,
                service_category,
                description,
                price,
                currency,
                duration_minutes,
                providers (
                  business_name,
                  address,
                  phone
                )
              )
            `)
            .eq('client_id', user?.id)
            .in('order_item_id', linkedOrderItemIds)
            .order('appointment_date', { ascending: false });

          if (services) {
            services.forEach((service: any) => {
              const cost = service.provider_services?.price || 0;
              servicesCost += cost;
              totalServices += 1;

              allEvents.push({
                id: `service-${service.id}`,
                type: 'service',
                title: service.provider_services?.service_name || 'Servicio',
                description: `${service.provider_services?.providers?.business_name || 'Proveedor'} | ${service.appointment_time || ''}`,
                date: service.appointment_date || service.created_at,
                cost: cost,
                currency: service.provider_services?.currency || 'GTQ',
                metadata: service,
                icon: <ShoppingBag className="w-5 h-5" />,
              });
            });
          }
        }
      } catch (error) {
        console.warn('Error loading services:', error);
      }

      // 3. Load veterinary visits
      const { data: vetSessions } = await supabase
        .from('veterinary_sessions')
        .select('*')
        .eq('pet_id', pet.id)
        .order('date', { ascending: false });

      if (vetSessions) {
        vetSessions.forEach((session: any) => {
          const cost = session.cost || 0;
          veterinaryCost += cost;
          totalVeterinaryVisits += 1;

          allEvents.push({
            id: `vet-${session.id}`,
            type: 'veterinary',
            title: `Visita Veterinaria: ${getAppointmentTypeLabel(session.appointment_type)}`,
            description: `${session.veterinarian_name || 'Veterinario'}${session.veterinary_clinic ? ` - ${session.veterinary_clinic}` : ''}`,
            date: session.date,
            cost: cost,
            currency: 'GTQ',
            metadata: session,
            icon: <Stethoscope className="w-5 h-5" />,
          });
        });
      }

      // 4. Load exercise sessions
      const { data: exerciseSessions } = await supabase
        .from('exercise_sessions')
        .select('*')
        .eq('pet_id', pet.id)
        .order('date', { ascending: false });

      if (exerciseSessions) {
        exerciseSessions.forEach((session: any) => {
          totalExerciseSessions += 1;

          allEvents.push({
            id: `exercise-${session.id}`,
            type: 'exercise',
            title: `Ejercicio: ${translateExerciseType(session.exercise_type)}`,
            description: `${session.duration_minutes || 0} minutos${session.calories_burned ? ` | ${session.calories_burned} calorías` : ''}`,
            date: session.date || session.session_date || session.created_at,
            cost: 0,
            currency: 'GTQ',
            metadata: session,
            icon: <Activity className="w-5 h-5" />,
          });
        });
      }

      // 5. Load nutrition sessions (feeding schedules and meal records)
      const { data: feedingSchedules } = await supabase
        .from('pet_feeding_schedules')
        .select('*')
        .eq('pet_id', pet.id)
        .order('created_at', { ascending: false });

      if (feedingSchedules) {
        feedingSchedules.forEach((schedule: any) => {
          totalNutritionSessions += 1;

          allEvents.push({
            id: `nutrition-${schedule.id}`,
            type: 'nutrition',
            title: `Alimentación: ${schedule.food_name || 'Alimento'}`,
            description: `${schedule.quantity_per_meal || 0} ${schedule.unit || 'g'} - ${schedule.times_per_day || 0} veces al día`,
            date: schedule.created_at,
            cost: 0,
            currency: 'GTQ',
            metadata: schedule,
            icon: <Utensils className="w-5 h-5" />,
          });
        });
      }

      // Try to load meal records if table exists
      try {
        const { data: mealRecords } = await supabase
          .from('meal_records')
          .select('*')
          .eq('pet_id', pet.id)
          .order('fed_at', { ascending: false })
          .limit(100);

        if (mealRecords) {
          mealRecords.forEach((meal: any) => {
            totalNutritionSessions += 1;

            allEvents.push({
              id: `meal-${meal.id}`,
              type: 'nutrition',
              title: `${translateMealType(meal.meal_type)}: ${meal.food_name || 'Alimento'}`,
              description: `${meal.quantity || 0}g${meal.notes ? ` | ${meal.notes}` : ''}`,
              date: meal.fed_at,
              cost: 0,
              currency: 'GTQ',
              metadata: meal,
              icon: <Utensils className="w-5 h-5" />,
            });
          });
        }
      } catch (error) {
        // Table might not exist, skip
      }

      // Sort all events by date (newest first)
      allEvents.sort((a, b) => {
        const dateA = parseISO(a.date);
        const dateB = parseISO(b.date);
        return dateB.getTime() - dateA.getTime();
      });

      setEvents(allEvents);
      setStats({
        totalProducts,
        totalServices,
        totalVeterinaryVisits,
        totalExerciseSessions,
        totalNutritionSessions,
        totalCost: productsCost + servicesCost + veterinaryCost,
        productsCost,
        servicesCost,
        veterinaryCost
      });
    } catch (error) {
      console.error('Error loading trazabilidad data:', error);
      toast.error('Error al cargar la trazabilidad');
    }
  };

  const formatPrice = (amount: number, currency: string = 'GTQ') => {
    return `${currency === 'GTQ' ? 'Q' : '$'}${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'HH:mm');
    } catch {
      return '';
    }
  };

  const journeyTabs: MobileTabItem[] = useMemo(
    () => [
      { id: 'overview', label: 'Resumen', shortLabel: 'Resumen', icon: TrendingUp, gradientIndex: 0 },
      { id: 'timeline', label: 'Timeline', shortLabel: 'Timeline', icon: Calendar, gradientIndex: 2 },
    ],
    [],
  );

  const journeyEvents = useMemo(
    () =>
      events.map(({ id, type, title, description, date, cost, currency }) => ({
        id,
        type,
        title,
        description,
        date,
        cost,
        currency,
      })),
    [events],
  );

  if (loading) {
    return (
      <DashboardShell>
        <PageLoader variant="inline" message="Cargando Pet Journey…" />
      </DashboardShell>
    );
  }

  if (!pet) {
    return (
      <DashboardShell>
        <PageHeader title="Pet Journey" subtitle="Historial completo de tu mascota">
          <PawPrint className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
        </PageHeader>
        <MobileSectionCard>
          <div className="text-center py-10 px-4">
            <PawPrint className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-800">Mascota no encontrada</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">No pudimos cargar la información de esta mascota.</p>
            <Button variant="outline" className="min-h-[44px]" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
            </Button>
          </div>
        </MobileSectionCard>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <PageHeader
        title={`Pet Journey · ${pet.name}`}
        subtitle="Historial completo de actividades, cuidado y gastos"
      >
        <MapPin className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
      </PageHeader>

      <MobileSectionCard>
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-4">
            {pet.image_url ? (
              <img
                src={pet.image_url}
                alt={pet.name}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-4 border-white shadow-lg shrink-0"
              />
            ) : (
              <div
                className={cn(
                  'w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white text-2xl border-4 border-white shadow-lg shrink-0 bg-gradient-to-r',
                  landingFeatureGradients[0],
                )}
              >
                {getPetEmoji(pet.species)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{pet.name}</h2>
              <p className="text-sm text-gray-500 truncate">
                {[pet.breed, formatSpeciesLabel(pet.species)].filter(Boolean).join(' · ')}
                {pet.age != null ? ` · ${pet.age} años` : ''}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Miembro desde {format(parseISO(pet.created_at), "d 'de' MMMM yyyy", { locale: es })}
              </p>
            </div>
          </div>
        </div>
      </MobileSectionCard>

      <MobileTabStrip tabs={journeyTabs} activeTab={activeTab} onChange={setActiveTab} columns={2} />

      {activeTab === 'overview' && (
        <PetJourneyOverview
          pet={pet}
          stats={stats}
          events={journeyEvents}
          formatPrice={formatPrice}
          onViewTimeline={() => setActiveTab('timeline')}
          onEventSelect={(event) => {
            const full = events.find((e) => e.id === event.id);
            if (full) {
              setSelectedEvent(full);
              setShowDetails(true);
            }
          }}
        />
      )}

      {activeTab === 'timeline' && (
        <MobileSectionCard>
          <div className="p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-4">
              <Calendar className="w-5 h-5 text-landing-aqua-dark shrink-0" />
              Timeline de actividades
            </h3>

            {events.length === 0 ? (
              <div className="text-center py-10 px-2">
                <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium text-gray-700">No hay actividades registradas</p>
                <p className="text-sm text-gray-500 mt-1">
                  Las compras, visitas, ejercicios y comidas de {pet.name} aparecerán aquí.
                </p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-5 sm:left-6 top-2 bottom-2 w-0.5 bg-gradient-to-b from-landing-aqua/40 via-landing-mint/30 to-landing-mango/20" />

                <div className="space-y-4">
                  {events.map((event) => (
                    <div key={event.id} className="relative flex items-start gap-3 sm:gap-4 pl-1">
                      <div
                        className={cn(
                          'relative z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white shadow-md shrink-0 bg-gradient-to-r',
                          getEventGradient(event.type),
                        )}
                      >
                        {event.icon}
                      </div>

                      <div className="flex-1 min-w-0 rounded-xl border border-white/60 bg-white/70 p-3 sm:p-4 hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900 text-sm sm:text-base">{event.title}</h4>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {getEventTypeLabel(event.type)}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2 leading-relaxed">{event.description}</p>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 shrink-0" />
                                {formatDate(event.date)}
                              </span>
                              {event.cost > 0 && (
                                <span className="inline-flex items-center gap-1 font-medium text-landing-mango-dark">
                                  <CreditCard className="w-3.5 h-3.5 shrink-0" />
                                  {formatPrice(event.cost, event.currency)}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowDetails(true);
                            }}
                            className="shrink-0 min-h-[36px] text-xs"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Detalles
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </MobileSectionCard>
      )}

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent?.icon}
              {selectedEvent?.title}
            </DialogTitle>
            <DialogDescription>
              {formatDate(selectedEvent?.date || '')}
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              {/* Product Details */}
              {selectedEvent.type === 'product' && selectedEvent.metadata?.orderItem && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Producto</label>
                      <p className="text-gray-900">{selectedEvent.metadata.orderItem.item_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Cantidad</label>
                      <p className="text-gray-900">{selectedEvent.metadata.itemPet.quantity}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Precio Unitario</label>
                      <p className="text-gray-900">{formatPrice(selectedEvent.metadata.orderItem.unit_price || 0, selectedEvent.currency)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Total</label>
                      <p className="text-gray-900 font-semibold">{formatPrice(selectedEvent.cost, selectedEvent.currency)}</p>
                    </div>
                  </div>
                  {selectedEvent.metadata.orderItem.item_description && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Descripción</label>
                      <p className="text-gray-900">{selectedEvent.metadata.orderItem.item_description}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-500">Orden</label>
                    <p className="text-gray-900">{selectedEvent.metadata.order.order_number}</p>
                  </div>
                </div>
              )}

              {/* Service Details */}
              {selectedEvent.type === 'service' && selectedEvent.metadata && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Servicio</label>
                      <p className="text-gray-900">{selectedEvent.metadata.provider_services?.service_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Precio</label>
                      <p className="text-gray-900 font-semibold">{formatPrice(selectedEvent.cost, selectedEvent.currency)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Proveedor</label>
                      <p className="text-gray-900">{selectedEvent.metadata.provider_services?.providers?.business_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Duración</label>
                      <p className="text-gray-900">{selectedEvent.metadata.provider_services?.duration_minutes || 0} minutos</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Fecha</label>
                      <p className="text-gray-900">{formatDate(selectedEvent.metadata.appointment_date || selectedEvent.date)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Hora</label>
                      <p className="text-gray-900">{selectedEvent.metadata.appointment_time || formatTime(selectedEvent.date)}</p>
                    </div>
                  </div>
                  {selectedEvent.metadata.provider_services?.description && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Descripción</label>
                      <p className="text-gray-900">{selectedEvent.metadata.provider_services.description}</p>
                    </div>
                  )}
                  {selectedEvent.metadata.notes && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Notas</label>
                      <p className="text-gray-900">{selectedEvent.metadata.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Veterinary Details */}
              {selectedEvent.type === 'veterinary' && selectedEvent.metadata && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Tipo de Visita</label>
                      <p className="text-gray-900">{getAppointmentTypeLabel(selectedEvent.metadata.appointment_type)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Costo</label>
                      <p className="text-gray-900 font-semibold">{formatPrice(selectedEvent.cost, selectedEvent.currency)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Veterinario</label>
                      <p className="text-gray-900">{selectedEvent.metadata.veterinarian_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Clínica</label>
                      <p className="text-gray-900">{selectedEvent.metadata.veterinary_clinic || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Diagnóstico</label>
                      <p className="text-gray-900">{selectedEvent.metadata.diagnosis || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Tratamiento</label>
                      <p className="text-gray-900">{selectedEvent.metadata.treatment || 'N/A'}</p>
                    </div>
                  </div>
                  {selectedEvent.metadata.notes && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Notas</label>
                      <p className="text-gray-900">{selectedEvent.metadata.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Exercise Details */}
              {selectedEvent.type === 'exercise' && selectedEvent.metadata && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Tipo de Ejercicio</label>
                      <p className="text-gray-900">{translateExerciseType(selectedEvent.metadata.exercise_type)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Duración</label>
                      <p className="text-gray-900">{selectedEvent.metadata.duration_minutes || 0} minutos</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Calorías</label>
                      <p className="text-gray-900">{selectedEvent.metadata.calories_burned || 0} cal</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Intensidad</label>
                      <p className="text-gray-900">{translateIntensity(selectedEvent.metadata.intensity)}</p>
                    </div>
                  </div>
                  {selectedEvent.metadata.notes && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Notas</label>
                      <p className="text-gray-900">{selectedEvent.metadata.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Nutrition Details */}
              {selectedEvent.type === 'nutrition' && selectedEvent.metadata && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Alimento</label>
                      <p className="text-gray-900">{selectedEvent.metadata.food_name || 'Alimento'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Cantidad</label>
                      <p className="text-gray-900">{selectedEvent.metadata.quantity_per_meal || selectedEvent.metadata.quantity || 0} {selectedEvent.metadata.unit || 'g'}</p>
                    </div>
                    {selectedEvent.metadata.times_per_day && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Veces al Día</label>
                        <p className="text-gray-900">{selectedEvent.metadata.times_per_day}</p>
                      </div>
                    )}
                    {selectedEvent.metadata.meal_type && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Tipo de Comida</label>
                        <p className="text-gray-900">{translateMealType(selectedEvent.metadata.meal_type)}</p>
                      </div>
                    )}
                  </div>
                  {selectedEvent.metadata.notes && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Notas</label>
                      <p className="text-gray-900">{selectedEvent.metadata.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
};

export default PetJourney;
