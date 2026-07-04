import React, { useState, useEffect } from 'react';
import { MapPin, AlertCircle, PawPrint, ChevronLeft, CheckCircle2, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import RealMap from './RealMap';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { copyPetImagesToLostPet, getPrimaryPetImageUrl, type PetImageRow } from '@/utils/petImages';
import { formatSpeciesLabel } from '@/utils/petLabels';
import { MobileFormDialog, MobileFormActions } from '@/components/mobile/MobileFormDialog';
import { MobileSectionCard } from '@/components/mobile/MobileUi';
import { PetPhotoCarousel } from '@/components/mobile/PetPhotoCarousel';
import { plainPageAccentBtn } from '@/lib/landingTheme';
import { cn } from '@/lib/utils';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  color: string;
  image_url?: string;
  pet_images?: PetImageRow[] | null;
}

interface ReportLostPetDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'select-pet' | 'location' | 'details';

const STEPS: { id: Step; label: string }[] = [
  { id: 'select-pet', label: 'Mascota' },
  { id: 'location', label: 'Ubicación' },
  { id: 'details', label: 'Detalles' },
];

const ReportLostPetDialog: React.FC<ReportLostPetDialogProps> = ({ open, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('select-pet');
  const [userPets, setUserPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationText, setLocationText] = useState('');
  const [lastSeenDate, setLastSeenDate] = useState('');
  const [description, setDescription] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [reward, setReward] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && user?.id) {
      fetchUserPets();
    }
  }, [open, user?.id]);

  const fetchUserPets = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('pets')
        .select('*, pet_images(image_url, display_order)')
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setUserPets(data || []);
    } catch (err) {
      console.error('Error fetching user pets:', err);
      setError('Error al cargar tus mascotas');
    }
  };

  const handlePetSelect = (pet: Pet) => {
    setSelectedPet(pet);
    setStep('location');
    setError('');
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    setLocationText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('La geolocalización no está disponible en tu dispositivo');
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleLocationSelect(position.coords.latitude, position.coords.longitude);
        setLocating(false);
      },
      () => {
        setError('No se pudo obtener tu ubicación. Toca el mapa para marcar el punto.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleSubmit = async () => {
    if (!selectedPet || !selectedLocation || !lastSeenDate || !contactPhone) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: inserted, error: insertError } = await supabase
        .from('lost_pets')
        .insert({
          owner_id: user?.id,
          pet_id: selectedPet.id,
          name: selectedPet.name,
          species: selectedPet.species,
          breed: selectedPet.breed,
          age: selectedPet.age,
          color: selectedPet.color,
          last_seen: lastSeenDate,
          last_location: locationText,
          latitude: selectedLocation.lat,
          longitude: selectedLocation.lng,
          description: description,
          contact_phone: contactPhone,
          contact_email: contactEmail || null,
          reward: reward ? parseFloat(reward) : null,
          image_url: getPrimaryPetImageUrl(selectedPet),
          status: 'lost',
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      if (inserted?.id) {
        await copyPetImagesToLostPet(selectedPet.id, inserted.id);
      }

      resetDialog();
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error reporting lost pet:', err);
      setError('Error al reportar la mascota perdida. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const resetDialog = () => {
    setStep('select-pet');
    setSelectedPet(null);
    setSelectedLocation(null);
    setLocationText('');
    setLastSeenDate('');
    setDescription('');
    setContactPhone('');
    setContactEmail('');
    setReward('');
    setError('');
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  const stepTitle =
    step === 'select-pet'
      ? 'Reportar mascota perdida'
      : step === 'location'
        ? 'Marca la ubicación'
        : 'Detalles del reporte';

  const stepDescription =
    step === 'select-pet'
      ? 'Elige la mascota que se perdió de tu lista registrada.'
      : step === 'location'
        ? 'Toca el mapa para marcar dónde se perdió tu mascota.'
        : 'Completa la información de contacto y cuándo se perdió.';

  const renderFooter = () => {
    if (step === 'select-pet') {
      return (
        <button
          type="button"
          onClick={handleClose}
          className="w-full min-h-[48px] rounded-xl border border-gray-200 bg-white text-gray-700 font-medium"
        >
          Cancelar
        </button>
      );
    }

    if (step === 'location') {
      return (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setStep('details')}
            disabled={!selectedLocation}
            className={cn('w-full min-h-[48px] rounded-xl font-semibold disabled:opacity-50', plainPageAccentBtn.mango)}
          >
            Continuar
          </button>
          <button
            type="button"
            onClick={() => setStep('select-pet')}
            className="w-full min-h-[44px] rounded-xl border border-gray-200 bg-white text-gray-700 font-medium flex items-center justify-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Volver
          </button>
        </div>
      );
    }

    return (
      <MobileFormActions
        onCancel={() => setStep('location')}
        cancelLabel="Volver"
        submitLabel={loading ? 'Reportando...' : 'Publicar reporte'}
        loading={loading}
        submitType="button"
        onSubmit={handleSubmit}
      />
    );
  };

  return (
    <MobileFormDialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && handleClose()}
      title={stepTitle}
      description={stepDescription}
      footer={renderFooter()}
      accent="mango"
    >
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-4">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={cn(
                'w-full h-1.5 rounded-full transition-colors',
                i <= stepIndex ? 'bg-landing-mango' : 'bg-gray-200'
              )}
            />
            <span className={cn('text-[10px] font-medium', i === stepIndex ? 'text-landing-mango-dark' : 'text-gray-400')}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {step === 'select-pet' && (
        <div className="space-y-3">
          {userPets.length === 0 ? (
            <MobileSectionCard className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-landing-mango/40 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-900 mb-1">Sin mascotas registradas</h3>
              <p className="text-sm text-gray-500">
                Registra una mascota en Ajustes antes de reportarla como perdida.
              </p>
            </MobileSectionCard>
          ) : (
            userPets.map((pet) => (
              <button
                key={pet.id}
                type="button"
                onClick={() => handlePetSelect(pet)}
                className="w-full text-left"
              >
                <MobileSectionCard className="overflow-hidden active:scale-[0.99] transition-transform">
                  <PetPhotoCarousel
                    pet={pet}
                    alt={pet.name}
                    aspectClassName="aspect-[16/9]"
                    showCounter
                    fallback={
                      <div className="w-full h-full bg-landing-mango/10 flex items-center justify-center">
                        <PawPrint className="w-10 h-10 text-landing-mango-dark" />
                      </div>
                    }
                  />
                  <div className="p-3 space-y-1">
                    <h4 className="font-bold text-gray-900">{pet.name}</h4>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                      <Badge variant="outline" className="text-xs border-landing-mango/20 text-landing-mango-dark">
                        {formatSpeciesLabel(pet.species)}
                      </Badge>
                      {pet.breed && <span className="text-xs">{pet.breed}</span>}
                      {pet.age != null && <span className="text-xs">{pet.age} años</span>}
                    </div>
                    {pet.color && <p className="text-xs text-gray-500">Color: {pet.color}</p>}
                  </div>
                </MobileSectionCard>
              </button>
            ))
          )}
        </div>
      )}

      {step === 'location' && (
        <div className="space-y-3">
          {selectedPet && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-landing-mango/5 border border-landing-mango/15">
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
                <PetPhotoCarousel
                  pet={selectedPet}
                  alt={selectedPet.name}
                  aspectClassName="h-12 w-12"
                  showDots={false}
                  showCounter={false}
                  fallback={
                    <div className="w-full h-full bg-landing-mint/20 flex items-center justify-center">
                      <PawPrint className="w-5 h-5 text-landing-mango-dark" />
                    </div>
                  }
                />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{selectedPet.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {formatSpeciesLabel(selectedPet.species)}
                  {selectedPet.breed ? ` · ${selectedPet.breed}` : ''}
                </p>
              </div>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={handleUseCurrentLocation}
            disabled={locating}
            className="w-full min-h-[44px] border-landing-mango/30 text-landing-mango-dark"
          >
            <Navigation className="w-4 h-4 mr-2" />
            {locating ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual'}
          </Button>

          <div className="h-[280px] rounded-2xl overflow-hidden border border-landing-mango/15 shadow-inner">
            <RealMap
              lostPets={[]}
              onLocationSelect={handleLocationSelect}
              selectedLocation={selectedLocation}
              isSelectingLocation
              viewMode="map"
              className="h-full"
            />
          </div>

          {selectedLocation ? (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-landing-mint/10 border border-landing-mint/25">
              <CheckCircle2 className="w-5 h-5 text-landing-mint-dark shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-landing-mint-dark">Ubicación seleccionada</p>
                <p className="text-xs text-gray-600 break-all">{locationText}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-landing-mango/10 border border-landing-mango/20">
              <MapPin className="w-4 h-4 text-landing-mango-dark shrink-0" />
              <p className="text-sm text-gray-700">Toca el mapa para marcar el punto exacto</p>
            </div>
          )}
        </div>
      )}

      {step === 'details' && selectedPet && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-landing-mango/5 border border-landing-mango/15">
            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0">
              <PetPhotoCarousel
                pet={selectedPet}
                alt={selectedPet.name}
                aspectClassName="h-14 w-14"
                showDots={false}
                showCounter={false}
              />
            </div>
            <div>
              <p className="font-bold text-gray-900">{selectedPet.name}</p>
              <p className="text-xs text-gray-500">
                {formatSpeciesLabel(selectedPet.species)} · {selectedPet.breed} · {selectedPet.age} años
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lastSeenDate">Fecha cuando se perdió *</Label>
              <Input
                id="lastSeenDate"
                type="date"
                value={lastSeenDate}
                onChange={(e) => setLastSeenDate(e.target.value)}
                className="min-h-[44px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">Teléfono de contacto *</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+502 1234-5678"
                className="min-h-[44px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">Correo de contacto</Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="tu@email.com"
                className="min-h-[44px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reward">Recompensa (opcional)</Label>
              <Input
                id="reward"
                type="number"
                inputMode="decimal"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="min-h-[44px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción adicional</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Circunstancias, señas distintivas, collar, etc."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        </div>
      )}
    </MobileFormDialog>
  );
};

export default ReportLostPetDialog;
