import React, { useEffect, useState } from 'react';
import { Calendar, Edit, Home, PawPrint, Trash2, Heart } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  plainPageAccentBtn,
  plainPageAccentOutlineBtn,
  plainPageAccentUi,
  type PlainPageAccent,
} from '@/lib/landingTheme';
import { cn } from '@/lib/utils';
import {
  PetPhotoCarousel,
  PetPhotoThumbnails,
} from '@/components/mobile/PetPhotoCarousel';
import { getPetImageUrls, type PetImageRow } from '@/utils/petImages';
import { formatSpeciesLabel, formatGenderLabel } from '@/utils/petLabels';
import type { CarouselApi } from '@/components/ui/carousel';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  age: number | null;
  weight: number | null;
  gender?: string | null;
  microchip: string | null;
  available_for_breeding: boolean;
  image_url?: string | null;
  pet_images?: PetImageRow[] | null;
}

interface PetDetailsModalProps {
  pet: Pet | null;
  open: boolean;
  onClose: () => void;
  onEdit: (pet: Pet) => void;
  onDelete: (pet: Pet) => void;
  onJourney: (petId: string) => void;
  accent?: PlainPageAccent;
}

const InfoChip = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="p-3 rounded-xl bg-white/70 border border-gray-100">
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-sm font-semibold text-gray-900">{value}</p>
  </div>
);

const PetDetailsModal: React.FC<PetDetailsModalProps> = ({
  pet,
  open,
  onClose,
  onEdit,
  onDelete,
  onJourney,
  accent = 'aqua',
}) => {
  const ui = plainPageAccentUi(accent);
  const primaryBtnClass = plainPageAccentBtn[accent];
  const outlineBtnClass = plainPageAccentOutlineBtn[accent];
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentPhoto, setCurrentPhoto] = useState(0);

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setCurrentPhoto(carouselApi.selectedScrollSnap());
    onSelect();
    carouselApi.on('select', onSelect);
    return () => {
      carouselApi.off('select', onSelect);
    };
  }, [carouselApi]);

  useEffect(() => {
    if (open) setCurrentPhoto(0);
  }, [open, pet?.id]);

  if (!pet) return null;

  const images = getPetImageUrls(pet);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={cn(
          'flex flex-col gap-0 p-0 overflow-hidden',
          'w-[calc(100vw-0.5rem)] max-w-lg',
          'max-h-[96dvh] sm:max-h-[92dvh]',
          'rounded-2xl border',
          ui.borderLight,
        )}
      >
        <div className={cn('shrink-0 px-4 pt-4 pb-2 border-b', ui.bgSoft, ui.borderLight)}>
          <DialogTitle className="text-lg font-bold text-gray-900">{pet.name}</DialogTitle>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatSpeciesLabel(pet.species)}
            {pet.breed ? ` · ${pet.breed}` : ''}
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="px-4 pt-3">
            <PetPhotoCarousel
              pet={pet}
              alt={pet.name}
              aspectClassName="aspect-[5/3] max-h-[160px]"
              showCounter
              showArrows={images.length > 1}
              showDots={images.length > 1}
              setApi={setCarouselApi}
              className="rounded-xl"
              fallback={
                <div className={cn('w-full h-full flex items-center justify-center rounded-xl', ui.bgLight)}>
                  <PawPrint className={cn('w-10 h-10', ui.iconMuted)} />
                </div>
              }
            />

            {images.length > 1 && (
              <div className="mt-3 space-y-2">
                <PetPhotoThumbnails
                  images={images}
                  current={currentPhoto}
                  onSelect={(index) => carouselApi?.scrollTo(index)}
                  alt={pet.name}
                />
                <p className="text-xs text-gray-400 text-center">
                  Toca las miniaturas o usa las flechas para cambiar de foto
                </p>
              </div>
            )}
          </div>

          <div className="px-4 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {pet.age != null && <InfoChip label="Edad" value={`${pet.age} años`} />}
              {pet.weight != null && <InfoChip label="Peso" value={`${pet.weight} kg`} />}
              <InfoChip label="Especie" value={formatSpeciesLabel(pet.species)} />
              {pet.gender && <InfoChip label="Género" value={formatGenderLabel(pet.gender)} />}
              {pet.breed && <InfoChip label="Raza" value={pet.breed} />}
            </div>

            {pet.microchip && <InfoChip label="Microchip" value={pet.microchip} />}

            {pet.available_for_breeding && (
              <div className={cn('flex items-center gap-2 p-3 rounded-xl border', ui.bgSoft, ui.borderLight)}>
                <Heart className={cn('w-4 h-4', ui.text)} />
                <span className={cn('text-sm font-medium', ui.text)}>Disponible para reproducción</span>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 p-4 border-t border-gray-100 bg-white/95 flex flex-col gap-2">
          <Button
            className={cn('w-full min-h-[48px] border-0', primaryBtnClass)}
            onClick={() => {
              onClose();
              onJourney(pet.id);
            }}
          >
            <Home className="w-4 h-4 mr-2" />
            Ver Journey
          </Button>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              className={cn('min-h-[44px] text-xs', outlineBtnClass)}
              onClick={() => {
                onClose();
                onJourney(pet.id);
              }}
            >
              <Calendar className="w-4 h-4 mr-1 shrink-0" />
              Historial
            </Button>
            <Button
              variant="outline"
              className={cn('min-h-[44px] text-xs', outlineBtnClass)}
              onClick={() => {
                onClose();
                onEdit(pet);
              }}
            >
              <Edit className="w-4 h-4 mr-1 shrink-0" />
              Editar
            </Button>
            <Button
              variant="outline"
              className="min-h-[44px] text-red-500 border-red-200 hover:bg-red-50 text-xs"
              onClick={() => {
                onClose();
                onDelete(pet);
              }}
            >
              <Trash2 className="w-4 h-4 mr-1 shrink-0" />
              Eliminar
            </Button>
          </div>
          <Button variant="ghost" onClick={onClose} className="w-full min-h-[40px] text-gray-500">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PetDetailsModal;
