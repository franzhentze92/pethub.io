import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail, MapPin, PawPrint, Phone, User } from 'lucide-react';
import { PetPhotoCarousel } from '@/components/mobile/PetPhotoCarousel';
import { formatSpeciesLabel } from '@/utils/petLabels';
import { getPetImageUrls, type PetImageRow } from '@/utils/petImages';
import { landingBtnPrimary } from '@/lib/landingTheme';
import { cn } from '@/lib/utils';

export interface AdoptionUserProfile {
  user_id?: string;
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  avatar_url?: string | null;
}

export interface AdoptionRegisteredPet {
  id: string;
  name: string;
  species: string;
  breed?: string | null;
  age?: number | null;
  weight?: number | null;
  gender?: string | null;
  color?: string | null;
  image_url?: string | null;
  pet_images?: PetImageRow[] | null;
}

interface AdoptionUserProfileDialogProps {
  open: boolean;
  onClose: () => void;
  profile: AdoptionUserProfile | null;
  pets?: AdoptionRegisteredPet[];
  title?: string;
  subtitle?: string;
  onViewPet?: (pet: AdoptionRegisteredPet) => void;
}

export const AdoptionUserProfileDialog: React.FC<AdoptionUserProfileDialogProps> = ({
  open,
  onClose,
  profile,
  pets = [],
  title = 'Perfil del dueño',
  subtitle,
  onViewPet,
}) => {
  if (!profile) return null;

  const displayName =
    profile.full_name?.trim() ||
    profile.email?.split('@')[0] ||
    'Usuario';

  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[calc(100vw-0.5rem)] max-w-lg max-h-[92dvh] flex flex-col gap-0 p-0 overflow-hidden rounded-2xl">
        <div className="shrink-0 px-4 pt-5 pb-3 border-b border-gray-100 bg-gradient-to-r from-landing-aqua/5 to-landing-mint/5">
          <DialogTitle className="text-lg font-bold text-gray-900">{title}</DialogTitle>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-landing-aqua/30 to-landing-mint/30 ring-2 ring-white shadow flex items-center justify-center shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-landing-aqua-dark">{initials}</span>
              )}
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-500">Dueño registrado en PetHub</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {profile.phone && (
              <a href={`tel:${profile.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 p-3 rounded-xl bg-white border border-gray-100">
                <Phone className="w-4 h-4 text-landing-aqua-dark shrink-0" />
                <span className="text-gray-800">{profile.phone}</span>
              </a>
            )}
            {profile.email && (
              <a href={`mailto:${profile.email}`} className="flex items-center gap-2 p-3 rounded-xl bg-white border border-gray-100">
                <Mail className="w-4 h-4 text-landing-aqua-dark shrink-0" />
                <span className="text-gray-800 truncate">{profile.email}</span>
              </a>
            )}
            {profile.address && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-white border border-gray-100">
                <MapPin className="w-4 h-4 text-landing-aqua-dark shrink-0 mt-0.5" />
                <span className="text-gray-800">{profile.address}</span>
              </div>
            )}
            {!profile.phone && !profile.email && !profile.address && (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-gray-200 text-gray-400">
                <User className="w-4 h-4 shrink-0" />
                Sin datos de contacto públicos
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Mascotas registradas ({pets.length})
            </p>
            {pets.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-gray-50 border border-gray-100">
                <PawPrint className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">Sin mascotas registradas</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {pets.map((pet) => (
                  <button
                    key={pet.id}
                    type="button"
                    onClick={() => onViewPet?.(pet)}
                    className="text-left rounded-xl overflow-hidden border border-gray-100 bg-white active:scale-[0.99] transition-transform"
                  >
                    <PetPhotoCarousel
                      pet={pet}
                      alt={pet.name}
                      aspectClassName="aspect-square"
                      showDots={false}
                      showCounter={false}
                      fallback={
                        <div className="w-full h-full bg-landing-aqua/10 flex items-center justify-center">
                          <PawPrint className="w-6 h-6 text-landing-aqua-dark" />
                        </div>
                      }
                    />
                    <div className="p-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{pet.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{pet.breed || formatSpeciesLabel(pet.species)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 p-4 border-t border-gray-100">
          <Button type="button" variant="outline" className="w-full min-h-[44px]" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface AdoptionRegisteredPetDialogProps {
  open: boolean;
  onClose: () => void;
  pet: AdoptionRegisteredPet | null;
  ownerName?: string;
}

export const AdoptionRegisteredPetDialog: React.FC<AdoptionRegisteredPetDialogProps> = ({
  open,
  onClose,
  pet,
  ownerName,
}) => {
  if (!pet) return null;

  const images = getPetImageUrls(pet);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[calc(100vw-0.5rem)] max-w-lg max-h-[92dvh] flex flex-col gap-0 p-0 overflow-hidden rounded-2xl">
        <div className="shrink-0 px-4 pt-5 pb-3 border-b border-gray-100">
          <DialogTitle className="text-lg font-bold text-gray-900">{pet.name}</DialogTitle>
          <p className="text-sm text-gray-500">
            {formatSpeciesLabel(pet.species)}
            {pet.breed ? ` · ${pet.breed}` : ''}
            {ownerName ? ` · Dueño: ${ownerName}` : ''}
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
          <PetPhotoCarousel
            pet={pet}
            alt={pet.name}
            aspectClassName="aspect-square max-h-56"
            showCounter={images.length > 1}
            className="rounded-xl"
          />

          <div className="grid grid-cols-2 gap-2">
            {pet.age != null && (
              <div className="p-3 rounded-xl bg-white border border-gray-100">
                <p className="text-xs text-gray-500">Edad</p>
                <p className="text-sm font-semibold text-gray-900">{pet.age} años</p>
              </div>
            )}
            {pet.weight != null && (
              <div className="p-3 rounded-xl bg-white border border-gray-100">
                <p className="text-xs text-gray-500">Peso</p>
                <p className="text-sm font-semibold text-gray-900">{pet.weight} kg</p>
              </div>
            )}
            {pet.gender && (
              <div className="p-3 rounded-xl bg-white border border-gray-100">
                <p className="text-xs text-gray-500">Sexo</p>
                <p className="text-sm font-semibold text-gray-900">
                  {pet.gender === 'macho' || pet.gender === 'M' ? 'Macho' : 'Hembra'}
                </p>
              </div>
            )}
            {pet.color && (
              <div className="p-3 rounded-xl bg-white border border-gray-100">
                <p className="text-xs text-gray-500">Color</p>
                <p className="text-sm font-semibold text-gray-900">{pet.color}</p>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 p-4 border-t border-gray-100">
          <Button type="button" className={cn('w-full min-h-[44px]', landingBtnPrimary)} onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
