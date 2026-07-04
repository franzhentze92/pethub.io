import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  MapPin, Calendar, PawPrint, Users, Heart, ShieldCheck, Weight,
  Stethoscope, DollarSign, AlertCircle, CheckCircle, XCircle, Phone, Zap, Home,
} from 'lucide-react';
import { plainPageAccentBtn } from '@/lib/landingTheme';
import { cn } from '@/lib/utils';
import { formatSpeciesLabel } from '@/utils/petLabels';
import { PetPhotoCarousel } from '@/components/mobile/PetPhotoCarousel';

interface AdoptionPetDetailsProps {
  open: boolean;
  onClose: () => void;
  pet: any | null;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onApply?: () => void;
  applicationFeedback?: { type: 'success' | 'error'; message: string } | null;
  hasApplied?: boolean;
  isOwnListing?: boolean;
}

const TraitBadge = ({
  positive,
  children,
}: {
  positive: boolean;
  children: React.ReactNode;
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full border',
      positive
        ? 'bg-landing-mint/15 text-landing-mint-dark border-landing-mint/25'
        : 'bg-red-50 text-red-700 border-red-100'
    )}
  >
    {positive ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
    {children}
  </span>
);

const InfoChip = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/70 border border-gray-100">
    <span className="text-landing-mango-dark shrink-0 mt-0.5">{icon}</span>
    <div className="min-w-0">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">{children}</h4>
);

const AdoptionPetDetails: React.FC<AdoptionPetDetailsProps> = ({
  open,
  onClose,
  pet,
  isFavorite,
  onToggleFavorite,
  onApply,
  applicationFeedback,
  hasApplied,
  isOwnListing,
}) => {
  if (!pet) return null;

  const ageText = pet.age ? `${pet.age} ${pet.age === 1 ? 'año' : 'años'}` : '—';
  const weightText = pet.weight ? `${pet.weight} kg` : '—';
  const adoptionFeeText = pet.adoption_fee || 'Gratis';
  const speciesLabel = formatSpeciesLabel(pet.species);

  const hasBehavior =
    typeof pet.good_with_kids === 'boolean' ||
    typeof pet.good_with_dogs === 'boolean' ||
    typeof pet.good_with_cats === 'boolean';

  const hasHealth =
    typeof pet.house_trained === 'boolean' ||
    typeof pet.spayed_neutered === 'boolean';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={cn(
          'flex flex-col gap-0 p-0 overflow-hidden',
          'w-[calc(100vw-0.5rem)] max-w-lg',
          'max-h-[96dvh] sm:max-h-[92dvh]',
          'rounded-2xl border-landing-mango/15'
        )}
      >
        {/* Hero image */}
        <div className="relative h-48 sm:h-56 w-full shrink-0">
          <PetPhotoCarousel
            pet={pet}
            alt={pet.name}
            aspectClassName="h-full"
            className="h-full"
            showCounter
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <button
            type="button"
            className={cn(
              'absolute top-3 left-3 rounded-full p-2.5 shadow-md transition-colors z-10',
              isFavorite
                ? 'bg-landing-mango text-white'
                : 'bg-white/95 text-gray-500 hover:text-landing-mango'
            )}
            onClick={onToggleFavorite}
            aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          >
            <Heart className={cn('w-5 h-5', isFavorite && 'fill-current')} />
          </button>
          {pet.status && pet.status !== 'available' && (
            <div className="absolute top-3 left-14 bg-landing-mango text-white px-2.5 py-1 rounded-full text-xs font-semibold z-10">
              {pet.status === 'adopted' ? 'Adoptado' : pet.status === 'hold' ? 'Reservado' : pet.status}
            </div>
          )}
          <div className="absolute bottom-3 left-4 right-4">
            <DialogTitle className="text-2xl font-bold text-white drop-shadow-sm">{pet.name}</DialogTitle>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {pet.species && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full bg-white/90 text-gray-800">
                  <PawPrint className="w-3 h-3" />
                  {speciesLabel}
                </span>
              )}
              {pet.breed && (
                <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-white/90 text-gray-800">
                  {pet.breed}
                </span>
              )}
              {pet.color && (
                <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-white/90 text-gray-800">
                  {pet.color}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-5">
          {pet.description && (
            <div className="rounded-xl bg-landing-mango/5 border border-landing-mango/15 p-4">
              <SectionTitle>Descripción</SectionTitle>
              <p className="text-sm text-gray-700 mt-2 leading-relaxed">{pet.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <InfoChip icon={<Calendar className="w-4 h-4" />} label="Edad" value={ageText} />
            {pet.sex && (
              <InfoChip
                icon={<ShieldCheck className="w-4 h-4" />}
                label="Sexo"
                value={pet.sex === 'M' ? 'Macho' : 'Hembra'}
              />
            )}
            {pet.weight && (
              <InfoChip icon={<Weight className="w-4 h-4" />} label="Peso" value={weightText} />
            )}
            {pet.size && (
              <InfoChip icon={<PawPrint className="w-4 h-4" />} label="Tamaño" value={pet.size} />
            )}
            {pet.energy_level && (
              <InfoChip icon={<Zap className="w-4 h-4" />} label="Energía" value={pet.energy_level} />
            )}
            <InfoChip icon={<DollarSign className="w-4 h-4" />} label="Adopción" value={adoptionFeeText} />
          </div>

          {hasBehavior && (
            <div className="space-y-2.5">
              <SectionTitle>Comportamiento</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {typeof pet.good_with_kids === 'boolean' && (
                  <TraitBadge positive={pet.good_with_kids}>
                    {pet.good_with_kids ? 'Apto con niños' : 'Mejor sin niños'}
                  </TraitBadge>
                )}
                {typeof pet.good_with_dogs === 'boolean' && (
                  <TraitBadge positive={pet.good_with_dogs}>
                    {pet.good_with_dogs ? 'Sociable con perros' : 'No sociable con perros'}
                  </TraitBadge>
                )}
                {typeof pet.good_with_cats === 'boolean' && (
                  <TraitBadge positive={pet.good_with_cats}>
                    {pet.good_with_cats ? 'Sociable con gatos' : 'No sociable con gatos'}
                  </TraitBadge>
                )}
              </div>
            </div>
          )}

          {hasHealth && (
            <div className="space-y-2.5">
              <SectionTitle>Salud y cuidados</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {typeof pet.house_trained === 'boolean' && (
                  <InfoChip
                    icon={<Home className="w-4 h-4" />}
                    label="Entrenado en casa"
                    value={pet.house_trained ? 'Sí' : 'No'}
                  />
                )}
                {typeof pet.spayed_neutered === 'boolean' && (
                  <InfoChip
                    icon={<Stethoscope className="w-4 h-4" />}
                    label="Esterilizado"
                    value={pet.spayed_neutered ? 'Sí' : 'No'}
                  />
                )}
              </div>
            </div>
          )}

          {pet.special_needs && (
            <div className="rounded-xl bg-landing-tropical/15 border border-landing-mango/25 p-4">
              <h4 className="font-semibold text-landing-mango-dark mb-1.5 flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4" />
                Necesidades especiales
              </h4>
              <p className="text-sm text-gray-700">
                {pet.special_needs_description || 'Esta mascota requiere cuidados especiales.'}
              </p>
            </div>
          )}

          {pet.medical_notes && (
            <div className="rounded-xl bg-landing-mango/5 border border-landing-mango/20 p-4">
              <h4 className="font-semibold text-landing-mango-dark mb-1.5 flex items-center gap-2 text-sm">
                <Stethoscope className="w-4 h-4" />
                Notas médicas
              </h4>
              <p className="text-sm text-gray-700">{pet.medical_notes}</p>
            </div>
          )}

          {pet.shelters?.name ? (
            <div className="rounded-xl border border-gray-100 bg-white/70 p-4">
              <SectionTitle>Albergue</SectionTitle>
              <div className="flex items-start gap-3 mt-3">
                <div className="w-11 h-11 rounded-full bg-landing-mango text-gray-900 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900">{pet.shelters.name}</p>
                  {pet.shelters.location && (
                    <p className="flex items-center gap-1.5 text-sm text-gray-600 mt-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-landing-mango-dark" />
                      {pet.shelters.location}
                    </p>
                  )}
                  {pet.shelters.phone && (
                    <p className="flex items-center gap-1.5 text-sm text-gray-600 mt-1">
                      <Phone className="w-3.5 h-3.5 shrink-0 text-landing-mango-dark" />
                      {pet.shelters.phone}
                    </p>
                  )}
                  {pet.shelters.description && (
                    <p className="text-sm text-gray-600 mt-2 leading-relaxed">{pet.shelters.description}</p>
                  )}
                </div>
              </div>
            </div>
          ) : !pet.shelter_id ? (
            <div className="rounded-xl border border-landing-mango/15 bg-landing-mango/5 p-4">
              <SectionTitle>Dueño particular</SectionTitle>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                Esta mascota la ofrece directamente su dueño actual, no un albergue.
                Puedes enviar una solicitud y coordinar la adopción por chat si te aprueban.
              </p>
            </div>
          ) : null}

          {pet.location && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
              <MapPin className="w-4 h-4 text-landing-mango-dark shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Ubicación</p>
                <p className="text-sm font-medium text-gray-800">{pet.location}</p>
              </div>
            </div>
          )}

          {applicationFeedback && (
            <div
              className={cn(
                'p-3 rounded-xl text-sm font-medium',
                applicationFeedback.type === 'success'
                  ? 'bg-landing-mint/15 border border-landing-mint/30 text-landing-mint-dark'
                  : 'bg-red-50 border border-red-200 text-red-700'
              )}
            >
              <div className="flex items-center gap-2">
                {applicationFeedback.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                {applicationFeedback.message}
              </div>
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 px-4 py-3 border-t border-gray-100 bg-white/95 backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <button
              type="button"
              className="w-full sm:flex-1 min-h-[48px] rounded-xl border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors text-sm"
              onClick={onToggleFavorite}
            >
              {isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            </button>
            <button
              type="button"
              className={cn(
                'w-full sm:flex-1 min-h-[48px] rounded-xl font-semibold text-sm transition-colors',
                hasApplied || isOwnListing
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : plainPageAccentBtn.aqua
              )}
              data-blueprint-guided={!hasApplied && !isOwnListing ? 'apply-adoption' : undefined}
              onClick={onApply}
              disabled={hasApplied || isOwnListing}
            >
              {isOwnListing ? 'Tu publicación' : hasApplied ? 'Solicitud enviada' : 'Solicitar adopción'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdoptionPetDetails;
