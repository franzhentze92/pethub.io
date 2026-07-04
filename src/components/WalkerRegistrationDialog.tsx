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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPin, Footprints, Radius } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import WalkersMap from '@/components/WalkersMap';
import { plainPageAccentBtn } from '@/lib/landingTheme';
import { reverseGeocode } from '@/utils/deliveryCost';
import {
  COVERAGE_RADIUS_OPTIONS,
  DEFAULT_COVERAGE_RADIUS_KM,
} from '@/utils/dogWalks';
import {
  dogWalkSchemaErrorHint,
  getSupabaseErrorMessage,
  isMissingDogWalkSchema,
} from '@/utils/supabaseErrors';

export interface DogWalkerProfile {
  id: string;
  user_id: string;
  bio: string | null;
  hourly_rate: number;
  latitude: number;
  longitude: number;
  location_label: string;
  is_active: boolean;
  max_dogs: number;
  experience_years: number;
  availability_notes: string | null;
  coverage_radius_km: number;
}

interface WalkerRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingProfile?: DogWalkerProfile | null;
  onSaved: () => void;
}

const socialBtn = plainPageAccentBtn.mango;

const WalkerRegistrationDialog: React.FC<WalkerRegistrationDialogProps> = ({
  open,
  onOpenChange,
  existingProfile,
  onSaved,
}) => {
  const { user } = useAuth();
  const [bio, setBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState('50');
  const [locationLabel, setLocationLabel] = useState('');
  const [maxDogs, setMaxDogs] = useState('3');
  const [experienceYears, setExperienceYears] = useState('0');
  const [availabilityNotes, setAvailabilityNotes] = useState('');
  const [coverageRadiusKm, setCoverageRadiusKm] = useState(String(DEFAULT_COVERAGE_RADIUS_KM));
  const [isActive, setIsActive] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'info' | 'map'>('info');

  useEffect(() => {
    if (!open) return;
    if (existingProfile) {
      setBio(existingProfile.bio ?? '');
      setHourlyRate(String(existingProfile.hourly_rate));
      setLocationLabel(existingProfile.location_label);
      setMaxDogs(String(existingProfile.max_dogs));
      setExperienceYears(String(existingProfile.experience_years));
      setAvailabilityNotes(existingProfile.availability_notes ?? '');
      setCoverageRadiusKm(String(existingProfile.coverage_radius_km ?? DEFAULT_COVERAGE_RADIUS_KM));
      setIsActive(existingProfile.is_active);
      setSelectedLocation({
        lat: existingProfile.latitude,
        lng: existingProfile.longitude,
      });
    } else {
      setBio('');
      setHourlyRate('50');
      setLocationLabel('');
      setMaxDogs('3');
      setExperienceYears('0');
      setAvailabilityNotes('');
      setCoverageRadiusKm(String(DEFAULT_COVERAGE_RADIUS_KM));
      setIsActive(true);
      setSelectedLocation(null);
    }
    setStep('info');
  }, [open, existingProfile]);

  const handleLocationSelect = async (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    try {
      const address = await reverseGeocode(lat, lng);
      if (address) setLocationLabel(address);
    } catch {
      setLocationLabel(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    if (!selectedLocation) {
      toast.error('Selecciona tu ubicación en el mapa');
      setStep('map');
      return;
    }
    if (!locationLabel.trim()) {
      toast.error('Indica la zona donde ofreces paseos');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        bio: bio.trim() || null,
        hourly_rate: parseFloat(hourlyRate) || 50,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        location_label: locationLabel.trim(),
        is_active: isActive,
        max_dogs: parseInt(maxDogs, 10) || 3,
        experience_years: parseInt(experienceYears, 10) || 0,
        availability_notes: availabilityNotes.trim() || null,
        coverage_radius_km: parseFloat(coverageRadiusKm) || DEFAULT_COVERAGE_RADIUS_KM,
        updated_at: new Date().toISOString(),
      };

      if (existingProfile) {
        const { error } = await supabase
          .from('dog_walker_profiles')
          .update(payload)
          .eq('id', existingProfile.id);
        if (error) throw error;
        toast.success('Perfil de paseador actualizado');
      } else {
        const { error } = await supabase.from('dog_walker_profiles').insert(payload);
        if (error) throw error;
        toast.success('¡Ya eres paseador! Los clientes podrán encontrarte en el mapa');
      }

      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving walker profile:', error);
      if (isMissingDogWalkSchema(error)) {
        toast.error(dogWalkSchemaErrorHint(), { duration: 8000 });
      } else {
        toast.error(`No se pudo guardar: ${getSupabaseErrorMessage(error)}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Footprints className="w-5 h-5 text-landing-mango-dark" />
            {existingProfile ? 'Editar perfil de paseador' : 'Ofrecerme como paseador'}
          </DialogTitle>
          <DialogDescription>
            Configura tu zona, tarifa y disponibilidad para que otros dueños te encuentren.
          </DialogDescription>
        </DialogHeader>

        {step === 'info' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bio">Presentación</Label>
              <Textarea
                id="bio"
                placeholder="Cuéntale a los dueños sobre tu experiencia con perros..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Tarifa por hora (Q.)</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  min="0"
                  step="5"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDogs">Máx. perros</Label>
                <Input
                  id="maxDogs"
                  type="number"
                  min="1"
                  max="10"
                  value={maxDogs}
                  onChange={(e) => setMaxDogs(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Años de experiencia</Label>
              <Input
                id="experience"
                type="number"
                min="0"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="availability">Disponibilidad</Label>
              <Textarea
                id="availability"
                placeholder="Ej: Lunes a viernes 7am–6pm, fines de semana flexible"
                value={availabilityNotes}
                onChange={(e) => setAvailabilityNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <p className="text-sm font-medium">Perfil activo</p>
                <p className="text-xs text-gray-500">Visible en el mapa de paseadores</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Radius className="w-4 h-4" />
                Radio de cobertura (km)
              </Label>
              <Select value={coverageRadiusKm} onValueChange={setCoverageRadiusKm}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COVERAGE_RADIUS_OPTIONS.map((km) => (
                    <SelectItem key={km} value={String(km)}>
                      {km} km {km <= 3 ? '(barrio)' : km <= 5 ? '(zona)' : '(ciudad)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Los clientes verán un círculo en el mapa con el área donde puedes pasear perros.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                Punto central de tu zona
              </Label>
              {selectedLocation ? (
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-2">{locationLabel || 'Ubicación seleccionada'}</p>
              ) : (
                <p className="text-sm text-amber-600">Aún no has seleccionado ubicación</p>
              )}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setStep('map')}
              >
                <MapPin className="w-4 h-4 mr-2" />
                {selectedLocation ? 'Cambiar ubicación en mapa' : 'Seleccionar en mapa'}
              </Button>
            </div>

            <Button className={`w-full ${socialBtn}`} onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : existingProfile ? 'Guardar cambios' : 'Publicar perfil'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Toca el mapa para marcar la zona donde ofreces paseos, o usa el botón de ubicación.</p>
            <WalkersMap
              walkers={[]}
              isSelectingLocation
              selectedLocation={selectedLocation}
              previewCoverageRadiusKm={parseFloat(coverageRadiusKm) || DEFAULT_COVERAGE_RADIUS_KM}
              onLocationSelect={handleLocationSelect}
              compact
              className="h-[320px]"
            />
            {selectedLocation && (
              <Input
                placeholder="Nombre de la zona (ej: Zona 10, Guatemala)"
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
              />
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('info')}>
                Volver
              </Button>
              <Button
                className={`flex-1 ${socialBtn}`}
                disabled={!selectedLocation}
                onClick={() => setStep('info')}
              >
                Confirmar ubicación
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WalkerRegistrationDialog;
