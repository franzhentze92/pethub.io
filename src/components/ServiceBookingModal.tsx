import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Clock, MapPin, Building2, User } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { addDays, format, isAfter, isBefore, parseISO, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { getServicePricingConfig, hasServiceSizePricing } from '@/config/servicePricing';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { landingBadge, landingBtnSolid } from '@/lib/landingTheme';
import { fetchResolvedAvailability, fetchTimeSlotsForDate } from '@/lib/availabilityResolver';
import { ActionConfirmDialog } from '@/components/ui/ActionConfirmDialog';

const modalCardClass =
  'rounded-xl border border-landing-aqua/20 bg-landing-aqua/5 shadow-sm';
const modalCardHeaderClass = 'pb-3';
const modalCardTitleClass = 'flex items-center gap-2 text-base text-landing-aqua-dark';
const modalOutlineBtnClass =
  'border-landing-aqua/30 text-landing-aqua-dark hover:bg-landing-aqua/10';
const inputClass =
  'border-landing-aqua/25 focus-visible:ring-landing-aqua/40 focus-visible:border-landing-aqua/50';
const BOOKING_DAYS_AHEAD = 30;

const bookingCalendarClassNames = {
  months: 'flex flex-col w-full',
  month: 'space-y-3 w-full',
  caption: 'flex justify-center pt-1 relative items-center mb-2',
  caption_label: 'text-base font-semibold text-gray-800 capitalize',
  nav_button:
    'h-8 w-8 rounded-lg border border-landing-aqua/20 hover:bg-landing-aqua/10 transition-colors',
  table: 'w-full border-collapse',
  head_row: 'flex mb-1',
  head_cell: 'text-gray-500 rounded-md w-10 font-medium text-xs uppercase',
  row: 'flex w-full mt-1',
  cell: 'h-10 w-10 text-center p-0 relative flex items-center justify-center',
  day: 'h-10 w-10 rounded-lg text-sm font-medium hover:bg-landing-mint/15 transition-colors',
  day_selected:
    'bg-landing-aqua text-white font-bold shadow-sm hover:bg-landing-aqua-dark',
  day_today: 'bg-landing-aqua/10 text-landing-aqua-dark font-semibold border border-landing-aqua/30',
  day_outside: 'text-gray-300 opacity-50',
  day_disabled: 'text-gray-300 opacity-40 line-through',
};

interface ProviderService {
  id: string;
  service_name: string;
  service_category: string;
  description: string;
  detailed_description?: string;
  price: number; // Precio general (para retrocompatibilidad)
  price_small?: number | null;
  price_medium?: number | null;
  price_large?: number | null;
  price_extra_large?: number | null;
  currency: string;
  duration_minutes: number;
  is_active: boolean;
  uses_custom_availability?: boolean;
  created_at: string;
  provider_id: string;
  providers: {
    user_id: string;
    business_name: string;
    business_type: string;
    address: string;
    phone: string;
    profile_picture_url?: string;
    latitude?: number;
    longitude?: number;
    city_id?: number;
    has_delivery?: boolean;
    has_pickup?: boolean;
    delivery_fee?: number;
    guatemala_cities: {
      city_name: string;
    };
  };
}

interface ServiceBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ProviderService | null;
  onBookingSuccess: () => void;
}

interface TimeSlot {
  id: string;
  service_id: string;
  day_of_week: number;
  slot_start_time: string;
  slot_end_time: string;
  is_available: boolean;
  created_at: string;
}

interface Availability {
  id: string;
  service_id: string;
  day_of_week: number;
  slot_start_time: string;
  slot_end_time: string;
  is_available: boolean;
  created_at: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' }
];

const ServiceBookingModal: React.FC<ServiceBookingModalProps> = ({
  isOpen,
  onClose,
  service,
  onBookingSuccess
}) => {
  const { user } = useAuth();
  const { addItem } = useCart();
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showBookingConfirm, setShowBookingConfirm] = useState(false);
  const [clientInfo, setClientInfo] = useState({
    name: '',
    phone: '',
    email: user?.email || '',
    notes: ''
  });

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [availableDaysOfWeek, setAvailableDaysOfWeek] = useState<number[]>([]);
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false);
  const [availabilitySource, setAvailabilitySource] = useState<'service' | 'provider' | 'none'>('none');

  const minBookingDate = startOfDay(addDays(new Date(), 1));
  const maxBookingDate = startOfDay(addDays(new Date(), BOOKING_DAYS_AHEAD));

  const isDateSelectable = (date: Date) => {
    const day = startOfDay(date);
    if (isBefore(day, minBookingDate) || isAfter(day, maxBookingDate)) return false;
    if (!availabilityLoaded) return false;
    if (availableDaysOfWeek.length === 0) return false;
    return availableDaysOfWeek.includes(day.getDay());
  };

  // Calculate price based on selected size
  const getServicePrice = (): number => {
    if (!service) return 0;
    
    const pricingConfig = getServicePricingConfig(service.service_category);
    const hasSizePricing = pricingConfig.system === 'dog_size';
    
    if (hasSizePricing && selectedSize) {
      const sizePriceMap: { [key: string]: number | null | undefined } = {
        'small': service.price_small,
        'medium': service.price_medium,
        'large': service.price_large,
        'extra_large': service.price_extra_large
      };
      
      const sizePrice = sizePriceMap[selectedSize];
      if (sizePrice !== null && sizePrice !== undefined) {
        return sizePrice;
      }
    }
    
    // Fallback to general price
    return service.price || 0;
  };

  // Auto-select first available size when service changes
  useEffect(() => {
    if (service) {
      const pricingConfig = getServicePricingConfig(service.service_category);
      const hasSizePricing = pricingConfig.system === 'dog_size';
      
      if (hasSizePricing && pricingConfig.sizeOptions) {
        // Find first available size
        const availableSize = pricingConfig.sizeOptions.find(size => {
          const sizeKey = size.key;
          const sizePriceMap: { [key: string]: number | null | undefined } = {
            'small': service.price_small,
            'medium': service.price_medium,
            'large': service.price_large,
            'extra_large': service.price_extra_large
          };
          return sizePriceMap[sizeKey] !== null && sizePriceMap[sizeKey] !== undefined;
        });
        
        if (availableSize) {
          setSelectedSize(availableSize.key);
        } else if (service.price && service.price > 0) {
          // If no size prices but general price exists, don't require size
          setSelectedSize(null);
        } else {
          setSelectedSize(null);
        }
      } else {
        setSelectedSize(null);
      }
    }
  }, [service]);

  useEffect(() => {
    if (!service?.id || !service.provider_id) {
      setAvailableDaysOfWeek([]);
      setAvailabilityLoaded(false);
      setAvailabilitySource('none');
      return;
    }

    const loadAvailability = async () => {
      setAvailabilityLoaded(false);
      try {
        const resolved = await fetchResolvedAvailability(supabase, {
          serviceId: service.id,
          providerId: service.provider_id,
          usesCustomAvailability: Boolean(service.uses_custom_availability),
        });
        setAvailableDaysOfWeek(resolved.availableDaysOfWeek);
        setAvailabilitySource(resolved.source);
      } catch (error) {
        console.error('Error fetching resolved availability:', error);
        setAvailableDaysOfWeek([]);
        setAvailabilitySource('none');
      } finally {
        setAvailabilityLoaded(true);
      }
    };

    loadAvailability();
  }, [service?.id, service?.provider_id, service?.uses_custom_availability]);

  // Fetch user profile information on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) {
        console.log('No user ID, skipping profile fetch');
        return;
      }

      console.log('Fetching user profile for:', user.id, user.email);
      try {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('full_name, phone')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.log('No profile found, using auth user data');
          // If no profile exists, use auth user data directly
          const newInfo = {
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
            phone: '',
            email: user.email || ''
          };
          console.log('Setting client info from auth user:', newInfo);
          setClientInfo(prev => ({ ...prev, ...newInfo }));
        } else {
          const newInfo = {
            name: profile.full_name || '',
            phone: profile.phone || '',
            email: user.email || ''
          };
          console.log('Setting client info from profile:', newInfo);
          setClientInfo(prev => ({ ...prev, ...newInfo }));
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Fallback: use basic user info
        const fallbackInfo = {
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
          phone: '',
          email: user.email || ''
        };
        console.log('Using fallback client info:', fallbackInfo);
        setClientInfo(prev => ({ ...prev, ...fallbackInfo }));
      }
    };

    fetchUserProfile();
  }, [user]);

  // Fetch available time slots for selected date
  useEffect(() => {
    if (service && selectedDate) {
      fetchAvailableTimeSlots();
    }
  }, [service, selectedDate]);

  const fetchAvailableTimeSlots = async () => {
    if (!service || !selectedDate) return;

    try {
      setLoading(true);
      const dayOfWeek = parseISO(selectedDate).getDay();
      const durationMinutes = service.duration_minutes || 60;

      const resolvedSlots = await fetchTimeSlotsForDate(supabase, {
        serviceId: service.id,
        providerId: service.provider_id,
        usesCustomAvailability: Boolean(service.uses_custom_availability),
        dayOfWeek,
        durationMinutes,
        selectedDate,
      });

      let finalSlots: TimeSlot[] = resolvedSlots.map((slot) => ({
        id: slot.id,
        service_id: service.id,
        day_of_week: slot.day_of_week,
        slot_start_time: slot.slot_start_time,
        slot_end_time: slot.slot_end_time,
        is_available: slot.is_available,
        created_at: new Date().toISOString(),
      }));

      try {
        const { data: existingBookings, error: bookingsError } = await supabase
          .from('service_appointments')
          .select('time_slot_id, appointment_time, status')
          .eq('service_id', service.id)
          .eq('appointment_date', selectedDate);

        if (!bookingsError && existingBookings) {
          const bookedTimes = existingBookings
            .filter((b) => b.status === 'confirmed' || b.status === 'pending')
            .map((b) => b.appointment_time || '')
            .filter(Boolean);

          finalSlots = finalSlots.filter(
            (slot) => !bookedTimes.some((bookedTime) => slot.slot_start_time === bookedTime.substring(0, 5))
          );
        }
      } catch (error) {
        console.warn('Error checking existing bookings:', error);
      }

      setAvailableTimeSlots(finalSlots);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      toast.error('No se pudieron cargar los horarios disponibles');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = () => {
    if (!service || !selectedDate || !selectedTimeSlot || !user) {
      toast.error("Por favor selecciona una fecha y horario");
      return;
    }

    if (!clientInfo.name || !clientInfo.email) {
      toast.error("No se pudo obtener tu información de perfil. Por favor actualiza tu perfil primero.");
      return;
    }

    const pricingConfig = getServicePricingConfig(service.service_category);
    const hasSizePricing = pricingConfig.system === 'dog_size';

    if (hasSizePricing && !selectedSize && !service.price) {
      toast.error("Por favor selecciona un tamaño de perro");
      return;
    }

    const finalPrice = getServicePrice();
    if (finalPrice <= 0) {
      toast.error("El precio del servicio no está configurado correctamente");
      return;
    }

    const selectedSlot = availableTimeSlots.find(slot => slot.id === selectedTimeSlot);
    if (!selectedSlot) {
      toast.error("No se pudo encontrar el horario seleccionado");
      return;
    }

    setShowBookingConfirm(true);
  };

  const confirmBooking = async () => {
    if (!service || !selectedDate || !selectedTimeSlot || !user) return;

    setShowBookingConfirm(false);

    try {
      setBookingLoading(true);

      const { data: providerData, error: providerError } = await supabase
        .from('providers')
        .select('user_id')
        .eq('id', service.provider_id)
        .single();

      if (providerError) {
        console.error('Error fetching provider user_id:', providerError);
        throw providerError;
      }

      const pricingConfig = getServicePricingConfig(service.service_category);
      const selectedSlot = availableTimeSlots.find(slot => slot.id === selectedTimeSlot)!;
      const finalPrice = getServicePrice();
      const sizeLabel = selectedSize ? pricingConfig.sizeOptions?.find(s => s.key === selectedSize)?.label : null;
      const serviceName = sizeLabel ? `${service.service_name} (${sizeLabel})` : service.service_name;

      const serviceBookingItem = {
        id: `service-${service.id}${selectedSize ? `_${selectedSize}` : ''}-${Date.now()}`,
        type: 'service' as const,
        name: serviceName,
        price: finalPrice,
        currency: service.currency,
        provider_id: providerData.user_id,
        provider_name: service.providers.business_name,
        description: service.description,
        service_size: selectedSize || undefined,
        service_id: service.id,
        service_data: {
          service_id: service.id,
          appointment_date: selectedDate,
          time_slot_id: selectedTimeSlot,
          appointment_time: selectedSlot.slot_start_time,
          slot_end_time: selectedSlot.slot_end_time,
          client_name: clientInfo.name,
          client_phone: clientInfo.phone,
          client_email: clientInfo.email,
          notes: clientInfo.notes
        }
      };

      for (let i = 0; i < quantity; i++) {
        addItem(serviceBookingItem);
      }

      toast.success(`${quantity} ${quantity === 1 ? 'servicio' : 'servicios'} de ${service.service_name} agregado${quantity === 1 ? '' : 's'} al carrito`);

      onBookingSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding service to cart:', error);
      toast.error("No se pudo agregar el servicio al carrito. Inténtalo de nuevo.");
    } finally {
      setBookingLoading(false);
    }
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: currency || 'GTQ',
      minimumFractionDigits: 2
    }).format(price);
  };

  if (!service) return null;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border-landing-aqua/20 shadow-xl p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-landing-aqua/10 bg-landing-aqua/10">
          <DialogTitle className="flex items-center gap-2 text-xl text-gray-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-landing-aqua text-white shadow-sm">
              <CalendarIcon className="w-5 h-5" />
            </span>
            Reservar Servicio
          </DialogTitle>
          <DialogDescription className="text-gray-600 pl-11">
            Selecciona la fecha y hora para tu reserva
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 p-6">
          {/* Service Information */}
          <Card className={modalCardClass}>
            <CardHeader className={modalCardHeaderClass}>
              <CardTitle className={modalCardTitleClass}>
                <Building2 className="w-5 h-5 text-landing-aqua" />
                Información del Servicio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">{service.service_name}</h3>
                <p className="text-gray-600 text-sm mt-1">{service.description}</p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building2 className="w-4 h-4 text-landing-aqua-dark shrink-0" />
                  <span>{service.providers.business_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-landing-aqua-dark shrink-0" />
                  <span>{service.providers.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-landing-aqua-dark shrink-0" />
                  <span>{service.duration_minutes} minutos</span>
                </div>
                <div className="pt-1">
                  <Badge className={cn(landingBadge, 'font-semibold text-sm px-3 py-1')}>
                    Precio: {(() => {
                      const pricingConfig = getServicePricingConfig(service.service_category);
                      const hasSizePricing = pricingConfig.system === 'dog_size';
                      
                      if (hasSizePricing) {
                        const sizePrices = [
                          service.price_small,
                          service.price_medium,
                          service.price_large,
                          service.price_extra_large
                        ].filter((p): p is number => p !== null && p !== undefined);
                        
                        if (sizePrices.length > 0) {
                          const minPrice = Math.min(...sizePrices);
                          const maxPrice = Math.max(...sizePrices);
                          const currencySymbol = service.currency === 'GTQ' ? 'Q.' : '$';
                          
                          if (minPrice === maxPrice) {
                            return `${currencySymbol}${minPrice.toFixed(2)}`;
                          } else {
                            return `${currencySymbol}${minPrice.toFixed(2)} - ${currencySymbol}${maxPrice.toFixed(2)}`;
                          }
                        }
                      }
                      
                      const currencySymbol = service.currency === 'GTQ' ? 'Q.' : '$';
                      return `${currencySymbol}${service.price.toFixed(2)}`;
                    })()}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Form */}
          <Card className={modalCardClass}>
            <CardHeader className={modalCardHeaderClass}>
              <CardTitle className={modalCardTitleClass}>
                <User className="w-5 h-5 text-landing-aqua" />
                Información de Reserva
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date Selection */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Seleccionar Fecha *</Label>
                <div className="mt-2 rounded-xl border border-landing-aqua/20 bg-white p-3 sm:p-4">
                  <CalendarComponent
                    mode="single"
                    locale={es}
                    selected={selectedDate ? parseISO(selectedDate) : undefined}
                    onSelect={(date) => {
                      if (!date) return;
                      setSelectedDate(format(date, 'yyyy-MM-dd'));
                      setSelectedTimeSlot('');
                    }}
                    fromDate={minBookingDate}
                    toDate={maxBookingDate}
                    disabled={(date) => !isDateSelectable(date)}
                    className="w-full p-0"
                    classNames={bookingCalendarClassNames}
                    modifiers={{
                      available: (date) => isDateSelectable(date),
                    }}
                    modifiersClassNames={{
                      available:
                        'bg-landing-mint/25 text-landing-aqua-dark font-semibold border border-landing-mint/40 hover:bg-landing-mint/35',
                    }}
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500 border-t border-landing-aqua/10 pt-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded border border-landing-mint/40 bg-landing-mint/25" />
                      Disponible
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded bg-landing-aqua" />
                      Seleccionado
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded bg-gray-100 border border-gray-200 opacity-60" />
                      No disponible
                    </span>
                  </div>
                  {selectedDate && (
                    <p className="mt-3 text-sm font-medium text-landing-aqua-dark capitalize">
                      {format(parseISO(selectedDate), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                    </p>
                  )}
                  {availabilityLoaded && availableDaysOfWeek.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      Días con horario:{' '}
                      {availableDaysOfWeek
                        .sort((a, b) => a - b)
                        .map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.short)
                        .join(', ')}
                      {availabilitySource === 'provider' && ' · Horario del negocio'}
                    </p>
                  )}
                  {availabilityLoaded && availableDaysOfWeek.length === 0 && (
                    <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      Este proveedor aún no tiene horario configurado. Contacta al negocio para agendar.
                    </p>
                  )}
                </div>
              </div>

              {/* Time Slot Selection */}
              {selectedDate && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Seleccionar Horario *</Label>
                  {loading ? (
                    <div className="mt-2 p-4 text-center text-gray-500 rounded-lg bg-landing-aqua/5 border border-landing-aqua/15">
                      Cargando horarios disponibles...
                    </div>
                  ) : availableTimeSlots.length > 0 ? (
                    <div className="mt-2 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {availableTimeSlots.map(slot => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setSelectedTimeSlot(slot.id)}
                          className={cn(
                            'p-2.5 text-sm border rounded-lg transition-all duration-200',
                            selectedTimeSlot === slot.id
                              ? 'bg-landing-aqua text-white border-transparent shadow-sm'
                              : 'bg-white text-gray-700 border-landing-aqua/25 hover:bg-landing-aqua/10 hover:border-landing-aqua/40'
                          )}
                        >
                          {formatTime(slot.slot_start_time)} - {formatTime(slot.slot_end_time)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 p-4 text-center text-gray-500 rounded-lg bg-gray-50 border border-gray-200">
                      No hay horarios disponibles para esta fecha
                    </div>
                  )}
                </div>
              )}

              {/* Profile Information Notice */}
              <div className="rounded-xl border border-landing-aqua/20 bg-landing-aqua/10 p-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-landing-aqua-dark" />
                  <p className="text-sm text-landing-aqua-dark font-medium">
                    Información de tu perfil
                  </p>
                </div>
                <p className="text-xs text-gray-600 mt-1 pl-6">
                  Los datos de contacto se obtienen automáticamente de tu perfil. Solo necesitas agregar notas adicionales si las tienes.
                </p>
              </div>

              {/* Client Information */}
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Nombre Completo</Label>
                  <Input
                    type="text"
                    value={clientInfo.name}
                    readOnly
                    className={cn(inputClass, 'mt-1 bg-landing-aqua/5 text-gray-600')}
                    placeholder="Cargando información del perfil..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Información de tu perfil</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700">Teléfono</Label>
                  <Input
                    type="tel"
                    value={clientInfo.phone}
                    readOnly
                    className={cn(inputClass, 'mt-1 bg-landing-aqua/5 text-gray-600')}
                    placeholder="Cargando información del perfil..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Información de tu perfil</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Email</Label>
                  <Input
                    type="email"
                    value={clientInfo.email}
                    readOnly
                    className={cn(inputClass, 'mt-1 bg-landing-aqua/5 text-gray-600')}
                    placeholder="Cargando información del perfil..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Información de tu perfil</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Notas Adicionales</Label>
                  <Textarea
                    value={clientInfo.notes}
                    onChange={(e) => setClientInfo(prev => ({ ...prev, notes: e.target.value }))}
                    className={cn(inputClass, 'mt-1 resize-none')}
                    placeholder="Información adicional sobre tu mascota o necesidades especiales"
                    rows={3}
                  />
                </div>
              </div>

              {/* Size Selection */}
              {(() => {
                const pricingConfig = getServicePricingConfig(service.service_category);
                const hasSizePricing = pricingConfig.system === 'dog_size';
                
                if (hasSizePricing && pricingConfig.sizeOptions) {
                  return (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Tamaño de Perro *</Label>
                      <Select value={selectedSize || ''} onValueChange={setSelectedSize}>
                        <SelectTrigger className={inputClass}>
                          <SelectValue placeholder="Selecciona el tamaño" />
                        </SelectTrigger>
                        <SelectContent className="z-[10000]">
                          {pricingConfig.sizeOptions.map((size) => {
                            const sizePriceMap: { [key: string]: number | null | undefined } = {
                              'small': service.price_small,
                              'medium': service.price_medium,
                              'large': service.price_large,
                              'extra_large': service.price_extra_large
                            };
                            const sizePrice = sizePriceMap[size.key];
                            
                            if (sizePrice === null || sizePrice === undefined) {
                              return null;
                            }
                            
                            return (
                              <SelectItem key={size.key} value={size.key}>
                                {size.label} {size.description && `(${size.description})`} - {formatPrice(sizePrice, service.currency)}
                              </SelectItem>
                            );
                          })}
                          {service.price && service.price > 0 && (
                            <SelectItem value="general">
                              Precio General - {formatPrice(service.price, service.currency)}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Quantity Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Cantidad de Servicios</Label>
                <div className="flex items-center space-x-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className={modalOutlineBtnClass}
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    -
                  </Button>
                  <span className="w-12 text-center font-semibold text-landing-aqua-dark">{quantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className={modalOutlineBtnClass}
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    +
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  {quantity === 1 ? '1 servicio' : `${quantity} servicios`} — Total:{' '}
                  <span className="font-semibold text-landing-aqua-dark">
                    {formatPrice(getServicePrice() * quantity, service.currency)}
                  </span>
                </p>
              </div>

              {/* Booking Button */}
              <Button
                onClick={handleBooking}
                disabled={
                  !selectedDate || 
                  !selectedTimeSlot || 
                  !clientInfo.name || 
                  !clientInfo.email || 
                  bookingLoading ||
                  (hasServiceSizePricing(service.service_category) && !selectedSize && !service.price)
                }
                className={cn(landingBtnSolid, 'w-full border-0 min-h-[48px] text-base')}
              >
                {bookingLoading ? 'Agregando al Carrito...' : 'Agregar al Carrito'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>

    <ActionConfirmDialog
      open={showBookingConfirm}
      onOpenChange={setShowBookingConfirm}
      title="Confirmar cita"
      description="Revisa los detalles antes de agregar al carrito."
      confirmLabel="Agregar al carrito"
      fields={[
        { label: 'Servicio', value: service?.service_name || '—' },
        { label: 'Proveedor', value: service?.providers?.business_name || '—' },
        {
          label: 'Fecha',
          value: selectedDate
            ? format(parseISO(selectedDate), "EEEE d 'de' MMMM yyyy", { locale: es })
            : '—',
        },
        {
          label: 'Horario',
          value: availableTimeSlots.find((s) => s.id === selectedTimeSlot)
            ? formatTime(availableTimeSlots.find((s) => s.id === selectedTimeSlot)!.slot_start_time)
            : '—',
        },
        { label: 'Cantidad', value: String(quantity) },
        {
          label: 'Precio',
          value: service
            ? formatPrice(getServicePrice() * quantity, service.currency)
            : '—',
        },
      ]}
      onConfirm={confirmBooking}
      loading={bookingLoading}
      onEdit={() => setShowBookingConfirm(false)}
    />
    </>
  );
};

export default ServiceBookingModal;
