import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Clock, PawPrint, MessageCircle, MapPin, Navigation, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { dispatchNotificationsUpdated } from '@/utils/notificationEvents';
import { plainPageAccentBtn } from '@/lib/landingTheme';
import { cn } from '@/lib/utils';
import type { WalkerMapItem } from '@/components/WalkersMap';
import WalkersMap from '@/components/WalkersMap';
import { getPrimaryPetImageUrl } from '@/utils/petImages';
import { formatDogWalkPetNames } from '@/utils/dogWalkPets';
import { geocodeFreeformAddress, reverseGeocode } from '@/utils/deliveryCost';
import {
  dogWalkSchemaErrorHint,
  getSupabaseErrorMessage,
  isMissingDogWalkSchema,
} from '@/utils/supabaseErrors';

interface Pet {
  id: string;
  name: string;
  breed?: string;
  image_url?: string;
  pet_images?: unknown;
}

interface WalkerRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walker: WalkerMapItem | null;
  onRequestSent: () => void;
}

const socialBtn = plainPageAccentBtn.mango;

const WalkerRequestDialog: React.FC<WalkerRequestDialogProps> = ({
  open,
  onOpenChange,
  walker,
  onRequestSent,
}) => {
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [requestedDate, setRequestedDate] = useState('');
  const [requestedTime, setRequestedTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [sending, setSending] = useState(false);
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingPickup, setLocatingPickup] = useState(false);
  const [showPickupMap, setShowPickupMap] = useState(false);

  const maxDogs = walker?.max_dogs ?? 3;

  useEffect(() => {
    if (!open || !user?.id) return;
    const loadPets = async () => {
      const { data } = await supabase
        .from('pets')
        .select('id, name, breed, image_url, pet_images(image_url, display_order)')
        .eq('owner_id', user.id);
      const loaded = data ?? [];
      setPets(loaded);
      if (loaded.length === 1) setSelectedPetIds([loaded[0].id]);
      else setSelectedPetIds([]);
    };
    const loadPickupDefaults = async () => {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('address')
        .eq('user_id', user.id)
        .maybeSingle();

      const address = profile?.address?.trim() ?? '';
      setPickupAddress(address);
      setPickupLocation(null);
      setShowPickupMap(false);

      if (address) {
        const coords = await geocodeFreeformAddress(`${address}, Guatemala`);
        if (coords) {
          setPickupLocation({ lat: coords.lat, lng: coords.lon });
        }
      }
    };
    void loadPets();
    void loadPickupDefaults();
  }, [open, user?.id]);

  useEffect(() => {
    if (open) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setRequestedDate(tomorrow.toISOString().split('T')[0]);
      setMessage('');
    }
  }, [open]);

  const togglePet = (petId: string) => {
    setSelectedPetIds((prev) => {
      if (prev.includes(petId)) return prev.filter((id) => id !== petId);
      if (prev.length >= maxDogs) {
        toast.error(`Este paseador acepta máximo ${maxDogs} perro${maxDogs !== 1 ? 's' : ''} a la vez`);
        return prev;
      }
      return [...prev, petId];
    });
  };

  const estimatedPrice = walker
    ? (parseFloat(durationMinutes) / 60) * walker.hourly_rate
    : 0;

  const selectedPets = pets.filter((p) => selectedPetIds.includes(p.id));

  const handlePickupLocationSelect = async (lat: number, lng: number) => {
    setPickupLocation({ lat, lng });
    const label = await reverseGeocode(lat, lng);
    if (label) setPickupAddress(label);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalización no disponible');
      return;
    }
    setLocatingPickup(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await handlePickupLocationSelect(pos.coords.latitude, pos.coords.longitude);
        setLocatingPickup(false);
        setShowPickupMap(true);
        toast.success('Ubicación de recogida detectada');
      },
      () => {
        toast.error('No se pudo obtener tu ubicación');
        setLocatingPickup(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const handleGeocodeAddress = async () => {
    if (!pickupAddress.trim()) {
      toast.error('Escribe la dirección de recogida');
      return;
    }
    const coords = await geocodeFreeformAddress(`${pickupAddress.trim()}, Guatemala`);
    if (!coords) {
      toast.error('No se encontró esa dirección. Marca el punto en el mapa.');
      setShowPickupMap(true);
      return;
    }
    setPickupLocation({ lat: coords.lat, lng: coords.lon });
    setShowPickupMap(true);
    toast.success('Dirección ubicada en el mapa');
  };

  const handleSubmit = async () => {
    if (!user?.id || !walker) return;
    if (selectedPetIds.length === 0) {
      toast.error('Selecciona al menos una mascota');
      return;
    }
    if (selectedPetIds.length > maxDogs) {
      toast.error(`Máximo ${maxDogs} mascota${maxDogs !== 1 ? 's' : ''} por solicitud`);
      return;
    }
    if (!requestedDate) {
      toast.error('Indica la fecha del paseo');
      return;
    }
    if (!pickupLocation) {
      toast.error('Indica dónde recogerás al perro (mapa o dirección)');
      setShowPickupMap(true);
      return;
    }
    if (!pickupAddress.trim()) {
      toast.error('Escribe la dirección o punto de encuentro');
      return;
    }

    setSending(true);
    try {
      const price = Math.round(estimatedPrice * 100) / 100;
      const petNames = formatDogWalkPetNames(selectedPets);

      const { data: request, error: requestError } = await supabase
        .from('dog_walk_requests')
        .insert({
          client_id: user.id,
          walker_id: walker.user_id,
          pet_id: selectedPetIds[0],
          message: message.trim() || null,
          requested_date: requestedDate,
          requested_time: requestedTime,
          duration_minutes: parseInt(durationMinutes, 10) || 60,
          price,
          status: 'pending',
          pickup_latitude: pickupLocation.lat,
          pickup_longitude: pickupLocation.lng,
          pickup_address: pickupAddress.trim(),
        })
        .select()
        .single();

      if (requestError) throw requestError;

      const { error: petsError } = await supabase.from('dog_walk_request_pets').insert(
        selectedPetIds.map((petId) => ({
          request_id: request.id,
          pet_id: petId,
        })),
      );

      if (petsError) {
        console.error('Error linking pets to walk request:', petsError);
      }

      const { data: chatRoom, error: chatError } = await supabase
        .from('chat_rooms')
        .insert({
          dog_walk_request_id: request.id,
          owner1_id: user.id,
          owner2_id: walker.user_id,
        })
        .select()
        .single();

      if (chatError) {
        console.error('Chat room error:', chatError);
      } else if (chatRoom) {
        const intro =
          message.trim() ||
          `¡Hola! Me gustaría que pasees a ${petNames}. ¿Estás disponible el ${requestedDate}?`;
        await supabase.from('chat_messages').insert({
          chat_room_id: chatRoom.id,
          sender_id: user.id,
          message: intro,
          message_type: 'text',
        });
      }

      toast.success('Solicitud enviada. El paseador recibirá tu mensaje.');
      dispatchNotificationsUpdated();
      onRequestSent();
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending walk request:', error);
      if (isMissingDogWalkSchema(error)) {
        toast.error(dogWalkSchemaErrorHint(), { duration: 8000 });
      } else {
        toast.error(`No se pudo enviar: ${getSupabaseErrorMessage(error)}`);
      }
    } finally {
      setSending(false);
    }
  };

  if (!walker) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex flex-col gap-0 p-0',
          'w-[calc(100vw-1.25rem)] max-w-md',
          'max-h-[92dvh] overflow-y-auto overflow-x-hidden',
          'rounded-2xl',
        )}
      >
        <div className="p-4 pb-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-landing-mango-dark" />
              Solicitar paseo
            </DialogTitle>
            <DialogDescription>
              Envía una solicitud a {walker.profile?.full_name ?? 'el paseador'} para cuidar a tu mascota.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 p-4 pt-3">
          <div className="rounded-xl bg-landing-mango/10 border border-landing-mango/20 p-3 text-sm min-w-0">
            <p className="font-medium">{walker.profile?.full_name ?? 'Paseador'}</p>
            <p className="text-gray-600 text-xs mt-0.5 break-words">{walker.location_label}</p>
            <p className="text-landing-mango-dark font-semibold mt-1">
              Q.{walker.hourly_rate}/hora · estimado Q.{estimatedPrice.toFixed(2)}
            </p>
          </div>

          <div className="space-y-2">
            <Label>
              Mascotas{' '}
              <span className="text-gray-400 font-normal">
                (máx. {maxDogs}, {selectedPetIds.length} seleccionada
                {selectedPetIds.length !== 1 ? 's' : ''})
              </span>
            </Label>
            {pets.length === 0 ? (
              <p className="text-sm text-amber-600">Registra una mascota primero en tu perfil.</p>
            ) : (
              <div className="space-y-2">
                {pets.map((pet) => {
                  const checked = selectedPetIds.includes(pet.id);
                  const imageUrl = getPrimaryPetImageUrl(pet);
                  return (
                    <label
                      key={pet.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors min-w-0',
                        checked
                          ? 'border-landing-mango bg-landing-mango/10'
                          : 'border-gray-200 hover:border-landing-mango/40',
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => togglePet(pet.id)}
                      />
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 shrink-0">
                        {imageUrl ? (
                          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <PawPrint className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium truncate">{pet.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Fecha
              </Label>
              <Input
                type="date"
                value={requestedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setRequestedDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Hora
              </Label>
              <Input
                type="time"
                value={requestedTime}
                onChange={(e) => setRequestedTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Duración (minutos)</Label>
            <Select value={durationMinutes} onValueChange={setDurationMinutes}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="60">1 hora</SelectItem>
                <SelectItem value="90">1.5 horas</SelectItem>
                <SelectItem value="120">2 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              Punto de recogida del perro
            </Label>
            <Input
              placeholder="Dirección o referencia (ej: Portal Santo Domingo, Fraijanes)"
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                disabled={locatingPickup}
                onClick={handleUseMyLocation}
              >
                {locatingPickup ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <Navigation className="w-3.5 h-3.5 mr-1" />
                )}
                Mi ubicación
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={handleGeocodeAddress}
              >
                <MapPin className="w-3.5 h-3.5 mr-1" />
                Buscar dirección
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-xs text-landing-mango-dark"
              onClick={() => setShowPickupMap((v) => !v)}
            >
              {showPickupMap ? 'Ocultar mapa' : pickupLocation ? 'Ajustar en mapa' : 'Marcar en mapa'}
            </Button>
            {showPickupMap && (
              <WalkersMap
                walkers={[]}
                isSelectingLocation
                selectedLocation={pickupLocation}
                onLocationSelect={handlePickupLocationSelect}
                compact
                className="h-[180px]"
              />
            )}
            {pickupLocation && !showPickupMap && (
              <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-2 py-1.5">
                Ubicación marcada. El paseador verá el mapa antes de aceptar.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Mensaje al paseador</Label>
            <Textarea
              placeholder="Cuéntale sobre tu mascota, necesidades especiales, punto de encuentro..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            className={`w-full ${socialBtn}`}
            onClick={handleSubmit}
            disabled={sending || pets.length === 0 || selectedPetIds.length === 0}
          >
            {sending ? 'Enviando...' : 'Enviar solicitud'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WalkerRequestDialog;
