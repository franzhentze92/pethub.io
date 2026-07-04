import React, { useEffect, useState } from 'react';
import { LandingSpinner } from '@/components/PageLoader';
import { AlertCircle, ChevronLeft, PawPrint } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MobileFormDialog, MobileFormActions } from '@/components/mobile/MobileFormDialog';
import { MobileSectionCard } from '@/components/mobile/MobileUi';
import { PetPhotoCarousel } from '@/components/mobile/PetPhotoCarousel';
import { formatSpeciesLabel } from '@/utils/petLabels';
import { type PetImageRow } from '@/utils/petImages';
import { useOfferPetForAdoption } from '@/hooks/useAdoption';
import { usePets, useUserProfile } from '@/hooks/useSettings';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

interface OfferPetForAdoptionDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  excludedPetIds?: string[];
}

type Step = 'select-pet' | 'details';

const STEPS: { id: Step; label: string }[] = [
  { id: 'select-pet', label: 'Mascota' },
  { id: 'details', label: 'Detalles' },
];

const OfferPetForAdoptionDialog: React.FC<OfferPetForAdoptionDialogProps> = ({
  open,
  onClose,
  onSuccess,
  excludedPetIds = [],
}) => {
  const { user } = useAuth();
  const { data: userPets = [], isLoading: petsLoading } = usePets(user?.id);
  const { data: userProfile } = useUserProfile(user?.id);
  const offerPet = useOfferPetForAdoption();

  const [step, setStep] = useState<Step>('select-pet');
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [adoptionFee, setAdoptionFee] = useState('');
  const [goodWithKids, setGoodWithKids] = useState(true);
  const [goodWithDogs, setGoodWithDogs] = useState(true);
  const [goodWithCats, setGoodWithCats] = useState(false);
  const [houseTrained, setHouseTrained] = useState(false);
  const [spayedNeutered, setSpayedNeutered] = useState(false);
  const [error, setError] = useState('');

  const excludedSet = new Set(excludedPetIds);
  const availablePets = userPets.filter((pet) => !excludedSet.has(pet.id));

  useEffect(() => {
    if (open && userProfile?.address) {
      setLocation(userProfile.address);
    }
  }, [open, userProfile?.address]);

  const resetDialog = () => {
    setStep('select-pet');
    setSelectedPet(null);
    setDescription('');
    setLocation(userProfile?.address || '');
    setAdoptionFee('');
    setGoodWithKids(true);
    setGoodWithDogs(true);
    setGoodWithCats(false);
    setHouseTrained(false);
    setSpayedNeutered(false);
    setError('');
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  const handlePetSelect = (pet: Pet) => {
    setSelectedPet(pet);
    setStep('details');
    setError('');
  };

  const handleSubmit = async () => {
    if (!selectedPet || !user?.id) return;

    if (!description.trim()) {
      setError('Cuéntanos por qué buscas un nuevo hogar para tu mascota');
      return;
    }

    setError('');

    try {
      await offerPet.mutateAsync({
        sourcePetId: selectedPet.id,
        ownerId: user.id,
        description: description.trim(),
        location: location.trim() || null,
        adoptionFee: adoptionFee.trim() || null,
        goodWithKids,
        goodWithDogs,
        goodWithCats,
        houseTrained,
        spayedNeutered,
      });

      toast.success(`${selectedPet.name} ya está disponible para adopción`);
      resetDialog();
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo publicar la mascota';
      setError(message);
      toast.error(message);
    }
  };

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  const stepTitle =
    step === 'select-pet' ? 'Ofrecer en adopción' : 'Detalles de la publicación';

  const stepDescription =
    step === 'select-pet'
      ? 'Elige cuál de tus mascotas quieres poner en adopción.'
      : 'Explica la situación y ayuda a encontrarle un buen hogar.';

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

    return (
      <MobileFormActions
        onCancel={() => setStep('select-pet')}
        cancelLabel="Volver"
        submitLabel={offerPet.isPending ? 'Publicando...' : 'Publicar en adopción'}
        loading={offerPet.isPending}
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
      <div className="flex items-center gap-2 mb-4">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={cn(
                'w-full h-1.5 rounded-full transition-colors',
                i <= stepIndex ? 'bg-landing-mango' : 'bg-gray-200'
              )}
            />
            <span
              className={cn(
                'text-[10px] font-medium',
                i === stepIndex ? 'text-landing-mango-dark' : 'text-gray-400'
              )}
            >
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
          {petsLoading ? (
            <MobileSectionCard className="p-8 text-center">
              <LandingSpinner size="md" className="mx-auto mb-3" />
              <p className="text-sm text-gray-500">Cargando tus mascotas…</p>
            </MobileSectionCard>
          ) : availablePets.length === 0 ? (
            <MobileSectionCard className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-landing-mango/40 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-900 mb-1">
                {userPets.length === 0 ? 'Sin mascotas registradas' : 'Todas tus mascotas ya están publicadas'}
              </h3>
              <p className="text-sm text-gray-500">
                {userPets.length === 0
                  ? 'Registra una mascota en Ajustes antes de ofrecerla en adopción.'
                  : 'Retira una publicación activa si quieres volver a publicar otra.'}
              </p>
            </MobileSectionCard>
          ) : (
            availablePets.map((pet) => (
              <button
                key={pet.id}
                type="button"
                onClick={() => handlePetSelect(pet as Pet)}
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
                  </div>
                </MobileSectionCard>
              </button>
            ))
          )}
        </div>
      )}

      {step === 'details' && selectedPet && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-landing-mango/5 border border-landing-mango/15">
            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
              <PetPhotoCarousel
                pet={selectedPet}
                alt={selectedPet.name}
                aspectClassName="h-12 w-12"
                showDots={false}
                showCounter={false}
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

          <div className="space-y-2">
            <Label htmlFor="adoption-reason">¿Por qué buscas un nuevo hogar? *</Label>
            <Textarea
              id="adoption-reason"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Me mudo y no puedo llevarla conmigo. Es cariñosa y se lleva bien con niños."
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adoption-location">Ubicación (ciudad o zona)</Label>
            <Input
              id="adoption-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ej: Ciudad, zona o barrio"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adoption-fee">Cuota de adopción (opcional)</Label>
            <Input
              id="adoption-fee"
              value={adoptionFee}
              onChange={(e) => setAdoptionFee(e.target.value)}
              placeholder="Gratis o Q500"
            />
          </div>

          <div className="space-y-3 rounded-xl border border-gray-100 bg-white/70 p-4">
            <p className="text-sm font-semibold text-gray-900">Comportamiento</p>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <Checkbox checked={goodWithKids} onCheckedChange={(v) => setGoodWithKids(!!v)} />
              Se lleva bien con niños
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <Checkbox checked={goodWithDogs} onCheckedChange={(v) => setGoodWithDogs(!!v)} />
              Se lleva bien con otros perros
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <Checkbox checked={goodWithCats} onCheckedChange={(v) => setGoodWithCats(!!v)} />
              Se lleva bien con gatos
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <Checkbox checked={houseTrained} onCheckedChange={(v) => setHouseTrained(!!v)} />
              Entrenada en casa
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <Checkbox checked={spayedNeutered} onCheckedChange={(v) => setSpayedNeutered(!!v)} />
              Esterilizada / castrada
            </label>
          </div>
        </div>
      )}
    </MobileFormDialog>
  );
};

export default OfferPetForAdoptionDialog;
