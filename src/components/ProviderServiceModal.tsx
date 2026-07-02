import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, Info, AlertCircle, Star, Loader2, Sparkles } from 'lucide-react';
import { ProviderService, ProviderServiceAvailability, ProviderServiceTimeSlot } from '@/hooks/useProvider';
import { getServicePricingConfig, hasServiceSizePricing } from '@/config/servicePricing';
import { ProductMultipleImagesUpload } from './ProductMultipleImagesUpload';
import { generateCatalogImage } from '@/lib/generateCatalogImage';
import { useToast } from '@/hooks/use-toast';
import {
  AvailabilityScheduleEditor,
  type ScheduleAvailabilityRow,
  type ScheduleTimeSlotRow,
} from '@/components/availability/AvailabilityScheduleEditor';
import { cn } from '@/lib/utils';
import { landingBtnPrimary } from '@/lib/landingTheme';
import { ActionConfirmDialog } from '@/components/ui/ActionConfirmDialog';

const modalTabListClass =
  'grid w-full bg-landing-aqua/10 p-1 rounded-xl border border-landing-aqua/15 h-auto gap-1';
const modalTabTriggerClass =
  'rounded-lg text-gray-600 data-[state=active]:bg-white data-[state=active]:text-landing-aqua-dark data-[state=active]:shadow-sm py-2.5 text-xs sm:text-sm';
const modalOutlineBtnClass =
  'border-landing-aqua/30 text-landing-aqua-dark hover:bg-landing-aqua/10';

interface ProviderServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (service: Omit<ProviderService, 'id' | 'provider_id' | 'created_at' | 'updated_at'>, availability?: Omit<ProviderServiceAvailability, 'id' | 'service_id' | 'created_at'>[], timeSlots?: Omit<ProviderServiceTimeSlot, 'id' | 'service_id' | 'created_at'>[]) => Promise<void>;
  service?: ProviderService | null;
  isEditing?: boolean;
  onSaveAvailability?: (serviceId: string, availability: Omit<ProviderServiceAvailability, 'id' | 'service_id' | 'created_at'>[]) => Promise<void>;
  onSaveTimeSlots?: (serviceId: string, timeSlots: Omit<ProviderServiceTimeSlot, 'id' | 'service_id' | 'created_at'>[]) => Promise<void>;
  onFetchAvailability?: (serviceId: string) => Promise<ProviderServiceAvailability[]>;
  onFetchTimeSlots?: (serviceId: string) => Promise<ProviderServiceTimeSlot[]>;
}

const SERVICE_CATEGORIES = [
  { value: 'veterinaria', label: 'Veterinaria', icon: '🐕' },
  { value: 'grooming', label: 'Grooming', icon: '✂️' },
  { value: 'entrenamiento', label: 'Entrenamiento', icon: '🎾' },
  { value: 'alojamiento', label: 'Alojamiento', icon: '🏠' },
  { value: 'transporte', label: 'Transporte', icon: '🚗' },
  { value: 'fisioterapia', label: 'Fisioterapia', icon: '💆' },
  { value: 'nutricion', label: 'Nutrición', icon: '🥩' },
  { value: 'otro', label: 'Otro', icon: '🔧' }
];

const ProviderServiceModal: React.FC<ProviderServiceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  service,
  isEditing = false,
  onSaveAvailability,
  onSaveTimeSlots,
  onFetchAvailability,
  onFetchTimeSlots
}) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({
    service_name: '',
    service_category: '',
    description: '',
    detailed_description: '',
    price: '', // Precio general (opcional)
    price_small: '',
    price_medium: '',
    price_large: '',
    price_extra_large: '',
    currency: 'GTQ',
    duration_minutes: '',
    preparation_instructions: '',
    cancellation_policy: '',
    max_advance_booking_days: '30',
    min_advance_booking_hours: '2',
    is_active: true,
    service_image_url: '',
    secondary_images: [] as string[],
  });

  const [availability, setAvailability] = useState<ScheduleAvailabilityRow[]>([]);
  const [timeSlots, setTimeSlots] = useState<ScheduleTimeSlotRow[]>([]);
  const [useCustomAvailability, setUseCustomAvailability] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [pendingSave, setPendingSave] = useState<{
    service: Omit<ProviderService, 'id' | 'provider_id' | 'created_at' | 'updated_at'>;
    availability: Omit<ProviderServiceAvailability, 'id' | 'service_id' | 'created_at'>[];
    timeSlots: Omit<ProviderServiceTimeSlot, 'id' | 'service_id' | 'created_at'>[];
  } | null>(null);

  useEffect(() => {
    if (service && isEditing) {
      setFormData({
        service_name: service.service_name,
        service_category: service.service_category,
        description: service.description || '',
        detailed_description: service.detailed_description || '',
        price: service.price?.toString() || '',
        price_small: service.price_small?.toString() || '',
        price_medium: service.price_medium?.toString() || '',
        price_large: service.price_large?.toString() || '',
        price_extra_large: service.price_extra_large?.toString() || '',
        currency: service.currency || 'GTQ',
        duration_minutes: service.duration_minutes.toString(),
        preparation_instructions: service.preparation_instructions || '',
        cancellation_policy: service.cancellation_policy || '',
        max_advance_booking_days: service.max_advance_booking_days?.toString() || '30',
        min_advance_booking_hours: service.min_advance_booking_hours?.toString() || '2',
        is_active: service.is_active,
        service_image_url: service.service_image_url || '',
        secondary_images: service.secondary_images || [],
      });

      setUseCustomAvailability(Boolean(service.uses_custom_availability));

      // Load availability and time slots for existing service (only if functions are provided)
      if (onFetchAvailability && onFetchTimeSlots && typeof onFetchAvailability === 'function' && typeof onFetchTimeSlots === 'function') {
        const loadAvailabilityData = async () => {
          try {
            const [availabilityData, timeSlotsData] = await Promise.all([
              onFetchAvailability(service.id),
              onFetchTimeSlots(service.id)
            ]);
            setAvailability(
              (availabilityData || []).map((item, index) => ({
                id: item.id || `avail-${index}`,
                day_of_week: item.day_of_week,
                start_time: item.start_time ? item.start_time.substring(0, 5) : '09:00',
                end_time: item.end_time ? item.end_time.substring(0, 5) : '17:00',
                is_available: item.is_available !== false,
              }))
            );
            setTimeSlots(
              (timeSlotsData || []).map((item, index) => ({
                id: item.id || `slot-${index}`,
                day_of_week: item.day_of_week,
                slot_start_time: item.slot_start_time ? item.slot_start_time.substring(0, 5) : '09:00',
                slot_end_time: item.slot_end_time ? item.slot_end_time.substring(0, 5) : '10:00',
                is_available: item.is_available !== false,
                max_bookings_per_slot: item.max_bookings_per_slot || 1,
              }))
            );
          } catch (error) {
            setAvailability([]);
            setTimeSlots([]);
          }
        };
        loadAvailabilityData();
      } else {
        setAvailability([]);
        setTimeSlots([]);
      }
    } else {
      setFormData({
        service_name: '',
        service_category: '',
        description: '',
        detailed_description: '',
        price: '',
        price_small: '',
        price_medium: '',
        price_large: '',
        price_extra_large: '',
        currency: 'GTQ',
        duration_minutes: '',
        preparation_instructions: '',
        cancellation_policy: '',
        max_advance_booking_days: '30',
        min_advance_booking_hours: '2',
        is_active: true,
        service_image_url: '',
        secondary_images: [],
      });
      setAvailability([]);
      setTimeSlots([]);
      setUseCustomAvailability(false);
    }
  }, [service, isEditing, onFetchAvailability, onFetchTimeSlots]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.service_name.trim()) {
        throw new Error('El nombre del servicio es requerido');
      }
      if (!formData.service_category) {
        throw new Error('La categoría del servicio es requerida');
      }
      if (!formData.description.trim()) {
        throw new Error('La descripción del servicio es requerida');
      }
      // Validate pricing based on category
      const pricingConfig = getServicePricingConfig(formData.service_category);
      const hasSizePricing = pricingConfig.system === 'dog_size';
      
      if (hasSizePricing) {
        // For size-based pricing, at least one size price must be set
        const hasGeneralPrice = formData.price && parseFloat(formData.price) > 0;
        const hasSizePrices = formData.price_small || formData.price_medium || 
                              formData.price_large || formData.price_extra_large;
        
        if (!hasGeneralPrice && !hasSizePrices) {
          throw new Error('Debes definir un precio general o al menos un precio por tamaño');
        }
      } else {
        // For single pricing, general price is required
        if (!formData.price || parseFloat(formData.price) <= 0) {
          throw new Error('El precio del servicio debe ser mayor a 0');
        }
      }

      const availabilityData = useCustomAvailability
        ? availability.map((item) => ({
            day_of_week: item.day_of_week,
            start_time: item.start_time.substring(0, 5),
            end_time: item.end_time.substring(0, 5),
            is_available: item.is_available !== false,
          }))
        : [];

      const timeSlotsData = useCustomAvailability
        ? timeSlots.map((item) => ({
            day_of_week: item.day_of_week,
            slot_start_time: item.slot_start_time.substring(0, 5),
            slot_end_time: item.slot_end_time.substring(0, 5),
            is_available: item.is_available !== false,
            max_bookings_per_slot: item.max_bookings_per_slot || 1,
          }))
        : [];

      if (useCustomAvailability && availabilityData.length === 0 && timeSlotsData.length === 0) {
        throw new Error('Agrega al menos un horario o desactiva el horario personalizado');
      }
      const servicePayload = {
        service_name: formData.service_name,
        service_category: formData.service_category,
        description: formData.description,
        detailed_description: formData.detailed_description,
        price: formData.price ? parseFloat(formData.price) : 0,
        price_small: formData.price_small ? parseFloat(formData.price_small) : null,
        price_medium: formData.price_medium ? parseFloat(formData.price_medium) : null,
        price_large: formData.price_large ? parseFloat(formData.price_large) : null,
        price_extra_large: formData.price_extra_large ? parseFloat(formData.price_extra_large) : null,
        currency: formData.currency,
        duration_minutes: parseInt(formData.duration_minutes) || 0,
        preparation_instructions: formData.preparation_instructions,
        cancellation_policy: formData.cancellation_policy,
        max_advance_booking_days: parseInt(formData.max_advance_booking_days) || 30,
        min_advance_booking_hours: parseInt(formData.min_advance_booking_hours) || 2,
        is_active: formData.is_active,
        uses_custom_availability: useCustomAvailability,
        service_image_url: formData.service_image_url || undefined,
        secondary_images: formData.secondary_images,
      };

      setPendingSave({
        service: servicePayload,
        availability: availabilityData,
        timeSlots: timeSlotsData,
      });
      setShowSaveConfirm(true);
    } catch (error) {
      console.error('Error saving service:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Service validation/save error:', errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const confirmSave = async () => {
    if (!pendingSave) return;
    setShowSaveConfirm(false);
    setLoading(true);
    try {
      await onSave(pendingSave.service, pendingSave.availability, pendingSave.timeSlots);
      onClose();
    } catch (error) {
      console.error('Error saving service:', error);
    } finally {
      setLoading(false);
      setPendingSave(null);
    }
  };

  const handleGenerateServiceImage = async () => {
    if (!service?.id) {
      toast({
        title: 'Guarda el servicio primero',
        description: 'La imagen con IA se puede generar después de crear el servicio.',
        variant: 'destructive',
      });
      return;
    }

    setGeneratingImage(true);
    try {
      const result = await generateCatalogImage({
        type: 'service',
        id: service.id,
        force: Boolean(formData.service_image_url),
      });

      if (result.imageUrl) {
        handleInputChange('service_image_url', result.imageUrl);
        toast({
          title: result.skipped ? 'Ya tenía imagen' : 'Imagen generada',
          description: result.skipped
            ? 'Este servicio ya tenía una imagen principal.'
            : `Se creó una imagen para "${result.name ?? formData.service_name}".`,
        });
      }
    } catch (error) {
      toast({
        title: 'No se pudo generar la imagen',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      });
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto rounded-2xl border-landing-aqua/20 shadow-xl p-0 gap-0"
        aria-describedby="service-modal-description"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-landing-aqua/10 bg-gradient-to-r from-landing-aqua/5 to-landing-mint/5">
          <DialogTitle className="text-xl flex items-center gap-2 text-gray-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-landing-aqua to-landing-mint text-white shadow-md">
              <Star className="w-5 h-5" />
            </span>
            {isEditing ? 'Editar Servicio' : 'Agregar Nuevo Servicio'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-5" id="service-modal-description">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={cn(modalTabListClass, 'grid-cols-2 sm:grid-cols-4')}>
              <TabsTrigger value="basic" className={modalTabTriggerClass}>Información Básica</TabsTrigger>
              <TabsTrigger value="details" className={modalTabTriggerClass}>Detalles</TabsTrigger>
              <TabsTrigger value="availability" className={modalTabTriggerClass}>Disponibilidad</TabsTrigger>
              <TabsTrigger value="policies" className={modalTabTriggerClass}>Políticas</TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="service-name">Nombre del Servicio *</Label>
                  <Input
                    id="service-name"
                    value={formData.service_name}
                    onChange={(e) => handleInputChange('service_name', e.target.value)}
                    placeholder="Ej: Consulta Veterinaria General"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="service-category">Categoría *</Label>
                  <Select value={formData.service_category} onValueChange={(value) => handleInputChange('service_category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent className="z-[10000]">
                      {SERVICE_CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          <span className="mr-2">{category.icon}</span>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-xl border border-landing-aqua/15 bg-landing-aqua/5 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-base font-semibold">Imágenes del servicio</Label>
                  {isEditing && service?.id && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={modalOutlineBtnClass}
                      disabled={loading || generatingImage}
                      onClick={handleGenerateServiceImage}
                    >
                      {generatingImage ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      {formData.service_image_url ? 'Regenerar con IA' : 'Generar con IA'}
                    </Button>
                  )}
                </div>
                <ProductMultipleImagesUpload
                  mainImageUrl={formData.service_image_url}
                  secondaryImages={formData.secondary_images}
                  onMainImageUpload={(url) => handleInputChange('service_image_url', url || '')}
                  onSecondaryImagesChange={(urls) =>
                    setFormData((prev) => ({ ...prev, secondary_images: urls }))
                  }
                  disabled={loading || generatingImage}
                  storageBucket="service-images"
                  storageFolder="service-images"
                  mainLabel="servicio"
                  entityLabel="servicio"
                />
                <p className="text-xs text-gray-500">
                  Sube una imagen principal y hasta 5 fotos adicionales del servicio
                </p>
              </div>

              <div>
                <Label htmlFor="service-description">Descripción Corta *</Label>
                <Textarea
                  id="service-description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descripción breve del servicio..."
                  rows={2}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="service-duration">Duración (min) *</Label>
                  <Input
                    id="service-duration"
                    type="number"
                    min="1"
                    value={formData.duration_minutes}
                    onChange={(e) => handleInputChange('duration_minutes', e.target.value)}
                    placeholder="30"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="service-currency">Moneda</Label>
                  <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GTQ">GTQ - Quetzales</SelectItem>
                      <SelectItem value="USD">USD - Dólares</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Pricing Section - Dynamic based on category */}
              {(() => {
                const pricingConfig = getServicePricingConfig(formData.service_category);
                const hasSizePricing = pricingConfig.system === 'dog_size';
                const currencySymbol = formData.currency === 'GTQ' ? 'Q.' : '$';

                if (hasSizePricing && pricingConfig.sizeOptions) {
                  return (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <Label className="text-base font-semibold">Precio General (Opcional)</Label>
                        <p className="text-sm text-gray-600 mb-3">Usa este campo si el servicio no requiere diferenciación por tamaño de perro.</p>
                        <div className="relative max-w-xs">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                            {currencySymbol}
                          </span>
                          <Input
                            id="service-price-general"
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.price}
                            onChange={(e) => handleInputChange('price', e.target.value)}
                            placeholder="0.00"
                            className="pl-8"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-base font-semibold">Precios por Tamaño de Perro</Label>
                        <p className="text-sm text-gray-600 mb-3">Define precios específicos para cada tamaño de perro.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {pricingConfig.sizeOptions.map((size) => {
                            const fieldName = `price_${size.key}` as keyof typeof formData;
                            return (
                              <div key={size.key} className="space-y-2">
                                <Label htmlFor={`service-price-${size.key}`}>
                                  {size.label} {size.description && `(${size.description})`}
                                </Label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                    {currencySymbol}
                                  </span>
                                  <Input
                                    id={`service-price-${size.key}`}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData[fieldName] as string}
                                    onChange={(e) => handleInputChange(fieldName, e.target.value)}
                                    placeholder="0.00"
                                    className="pl-8"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // Single price
                  return (
                    <div>
                      <Label htmlFor="service-price">Precio ({currencySymbol}) *</Label>
                      <div className="relative max-w-xs">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                          {currencySymbol}
                        </span>
                        <Input
                          id="service-price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.price}
                          onChange={(e) => handleInputChange('price', e.target.value)}
                          placeholder="0.00"
                          className="pl-8"
                          required
                        />
                      </div>
                    </div>
                  );
                }
              })()}

              <div className="flex items-center space-x-2">
                <Switch
                  id="service-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                />
                <Label htmlFor="service-active">Servicio Activo</Label>
              </div>
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4">
              <div>
                <Label htmlFor="service-detailed-description">Descripción Detallada</Label>
                <Textarea
                  id="service-detailed-description"
                  value={formData.detailed_description}
                  onChange={(e) => handleInputChange('detailed_description', e.target.value)}
                  placeholder="Describe el servicio en detalle, incluyendo qué incluye, beneficios, etc..."
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Esta información será visible para los clientes al seleccionar el servicio
                </p>
              </div>

              <div>
                <Label htmlFor="service-preparation">Instrucciones de Preparación</Label>
                <Textarea
                  id="service-preparation"
                  value={formData.preparation_instructions}
                  onChange={(e) => handleInputChange('preparation_instructions', e.target.value)}
                  placeholder="¿Qué debe preparar el cliente antes de la cita? (ej: ayuno, traer documentos, etc.)"
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ayuda a los clientes a estar preparados para su cita
                </p>
              </div>
            </TabsContent>

            {/* Availability Tab */}
            <TabsContent value="availability" className="space-y-4">
              <div className="rounded-xl border border-landing-aqua/20 bg-gradient-to-r from-landing-aqua/10 to-landing-mint/10 p-4">
                <div className="flex items-start gap-2 text-landing-aqua-dark">
                  <Info className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="text-sm space-y-1">
                    <p className="font-medium">Horario del negocio por defecto</p>
                    <p className="text-gray-600">
                      Este servicio usa el horario general configurado en tu perfil (pestaña Perfil).
                      Activa la opción de abajo solo si este servicio necesita horarios distintos.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-landing-aqua/15 p-4">
                <div>
                  <Label htmlFor="custom-availability" className="font-medium text-gray-800">
                    Horario personalizado para este servicio
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">
                    Desactivado = hereda el horario del negocio
                  </p>
                </div>
                <Switch
                  id="custom-availability"
                  checked={useCustomAvailability}
                  onCheckedChange={setUseCustomAvailability}
                />
              </div>

              {useCustomAvailability ? (
                <AvailabilityScheduleEditor
                  availability={availability}
                  timeSlots={timeSlots}
                  onAvailabilityChange={setAvailability}
                  onTimeSlotsChange={setTimeSlots}
                />
              ) : (
                <div className="rounded-xl border border-dashed border-landing-aqua/25 bg-landing-aqua/5 p-6 text-center text-sm text-gray-600">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-landing-aqua" />
                  Los clientes verán el horario del negocio al reservar este servicio.
                </div>
              )}
            </TabsContent>

            {/* Policies Tab */}
            <TabsContent value="policies" className="space-y-4">
              <div>
                <Label htmlFor="service-cancellation">Política de Cancelación</Label>
                <Textarea
                  id="service-cancellation"
                  value={formData.cancellation_policy}
                  onChange={(e) => handleInputChange('cancellation_policy', e.target.value)}
                  placeholder="Ej: Cancelaciones con al menos 24 horas de anticipación. No se reembolsan cancelaciones de último momento."
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Informa a los clientes sobre las condiciones de cancelación
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="service-max-advance">Reserva Máxima (días)</Label>
                  <Input
                    id="service-max-advance"
                    type="number"
                    min="1"
                    max="365"
                    value={formData.max_advance_booking_days}
                    onChange={(e) => handleInputChange('max_advance_booking_days', e.target.value)}
                    placeholder="30"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Con cuántos días de anticipación pueden reservar los clientes
                  </p>
                </div>

                <div>
                  <Label htmlFor="service-min-notice">Aviso Mínimo (horas)</Label>
                  <Input
                    id="service-min-notice"
                    type="number"
                    min="1"
                    max="72"
                    value={formData.min_advance_booking_hours}
                    onChange={(e) => handleInputChange('min_advance_booking_hours', e.target.value)}
                    placeholder="2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Tiempo mínimo requerido para reservar una cita
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="-mx-6 -mb-5 mt-2 flex justify-end gap-3 px-6 py-4 border-t border-landing-aqua/10 bg-gray-50/80">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className={modalOutlineBtnClass}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} data-blueprint-guided="save-service" className={cn(landingBtnPrimary, 'border-0 min-w-[160px]')}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditing ? 'Actualizando...' : 'Creando...'}
                </>
              ) : (
                isEditing ? 'Actualizar Servicio' : 'Crear Servicio'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <ActionConfirmDialog
      open={showSaveConfirm}
      onOpenChange={setShowSaveConfirm}
      title={isEditing ? 'Confirmar actualización de servicio' : 'Confirmar creación de servicio'}
      description="Revisa los datos del servicio antes de guardar."
      confirmLabel={isEditing ? 'Actualizar' : 'Crear servicio'}
      fields={
        pendingSave
          ? [
              { label: 'Nombre', value: pendingSave.service.service_name },
              { label: 'Categoría', value: pendingSave.service.service_category },
              { label: 'Precio', value: `Q${pendingSave.service.price}` },
              { label: 'Duración', value: `${pendingSave.service.duration_minutes} min` },
              { label: 'Activo', value: pendingSave.service.is_active ? 'Sí' : 'No' },
              ...(pendingSave.availability.length > 0
                ? [{ label: 'Horarios personalizados', value: `${pendingSave.availability.length} bloques` }]
                : []),
            ]
          : []
      }
      onConfirm={confirmSave}
      loading={loading}
      onEdit={() => setShowSaveConfirm(false)}
    />
    </>
  );
};

export default ProviderServiceModal;
