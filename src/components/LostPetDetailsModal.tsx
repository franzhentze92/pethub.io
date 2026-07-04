import React, { useEffect, useState } from 'react';
import { MapPin, Calendar, Phone, Mail, DollarSign, AlertTriangle, PawPrint, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { plainPageAccentBtn } from '@/lib/landingTheme';
import { cn } from '@/lib/utils';
import {
  PetPhotoCarousel,
  PetPhotoThumbnails,
} from '@/components/mobile/PetPhotoCarousel';
import { getPetImageUrls, getLostPetImageUrls, type PetImageRow, type LostPetWithImages } from '@/utils/petImages';
import { formatSpeciesLabel } from '@/utils/petLabels';
import type { CarouselApi } from '@/components/ui/carousel';

interface LostPet extends LostPetWithImages {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  color: string;
  last_seen: string;
  last_location: string;
  latitude: number;
  longitude: number;
  description: string;
  contact_phone: string;
  contact_email: string;
  reward?: number;
  image_url?: string;
  status: string;
  created_at: string;
}

interface LostPetDetailsModalProps {
  pet: LostPet | null;
  open: boolean;
  onClose: () => void;
  isOwner?: boolean;
  onMarkAsFound?: () => void;
}

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
      <p className="text-sm font-semibold text-gray-900 break-words">{value}</p>
    </div>
  </div>
);

const LostPetDetailsModal: React.FC<LostPetDetailsModalProps> = ({
  pet,
  open,
  onClose,
  isOwner = false,
  onMarkAsFound,
}) => {
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

  const images = getLostPetImageUrls(pet);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'lost':
        return 'bg-landing-mango/15 text-landing-mango-dark border-landing-mango/30';
      case 'found':
        return 'bg-landing-mint/15 text-landing-mint-dark border-landing-mint/30';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'lost': return 'Perdido';
      case 'found': return 'Encontrado';
      case 'cancelled': return 'Cancelado';
      default: return 'Desconocido';
    }
  };

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
        <div className="shrink-0 px-4 pt-4 pb-2 border-b border-gray-100">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <DialogTitle className="text-lg font-bold text-gray-900">{pet.name}</DialogTitle>
              <p className="text-sm text-gray-500 mt-0.5">
                {formatSpeciesLabel(pet.species)}
                {pet.breed ? ` · ${pet.breed}` : ''}
                {pet.age ? ` · ${pet.age} años` : ''}
              </p>
            </div>
            <Badge className={cn('text-xs border shrink-0', getStatusBadge(pet.status))}>
              {getStatusText(pet.status)}
            </Badge>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="px-4 pt-3 pb-2">
            <PetPhotoCarousel
              pet={pet}
              images={images}
              alt={pet.name}
              aspectClassName="aspect-[4/3] max-h-[260px]"
              className="rounded-xl bg-gray-100"
              imageClassName="object-contain"
              showCounter
              showArrows={images.length > 1}
              showDots={images.length > 1}
              setApi={setCarouselApi}
              fallback={
                <div className="w-full h-full bg-landing-mango/15 flex items-center justify-center rounded-xl">
                  <PawPrint className="w-16 h-16 text-white/80" />
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
                  Desliza, usa las flechas o toca una miniatura para ver todas las fotos
                </p>
              </div>
            )}
          </div>

          <div className="px-4 pb-4 space-y-4">
            <div className="rounded-xl bg-landing-mango/10 border border-landing-mango/20 p-4">
              <h4 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-landing-mango-dark" />
                Información de pérdida
              </h4>
              <div className="grid grid-cols-1 gap-2">
                <InfoChip icon={<Calendar className="w-4 h-4" />} label="Última vez visto" value={formatDate(pet.last_seen)} />
                <InfoChip icon={<MapPin className="w-4 h-4" />} label="Ubicación" value={pet.last_location} />
              </div>
            </div>

            {pet.color && (
              <div className="rounded-xl bg-white/70 border border-gray-100 p-3">
                <p className="text-xs text-gray-500">Color / señas</p>
                <p className="text-sm font-semibold text-gray-900">{pet.color}</p>
              </div>
            )}

            {pet.description && (
              <div className="rounded-xl bg-landing-mango/5 border border-landing-mango/15 p-4">
                <h4 className="font-bold text-gray-900 text-sm mb-2">Descripción</h4>
                <p className="text-sm text-gray-700 leading-relaxed">{pet.description}</p>
              </div>
            )}

            {pet.reward ? (
              <div className="rounded-xl bg-landing-mint/10 border border-landing-mint/20 p-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-landing-mint-dark" />
                <span className="font-semibold text-landing-mint-dark">Recompensa: Q.{pet.reward}</span>
              </div>
            ) : null}

            {(pet.contact_phone || pet.contact_email) && (
              <div className="rounded-xl bg-white/70 border border-gray-100 p-4 space-y-2">
                <h4 className="font-bold text-gray-900 text-sm">Contacto</h4>
                {pet.contact_phone && (
                  <a href={`tel:${pet.contact_phone}`} className="flex items-center gap-2 text-sm text-landing-mango-dark font-medium">
                    <Phone className="w-4 h-4" />
                    {pet.contact_phone}
                  </a>
                )}
                {pet.contact_email && (
                  <a href={`mailto:${pet.contact_email}`} className="flex items-center gap-2 text-sm text-landing-mango-dark font-medium break-all">
                    <Mail className="w-4 h-4 shrink-0" />
                    {pet.contact_email}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 p-4 border-t border-gray-100 bg-white/95 flex flex-col gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {isOwner && onMarkAsFound && pet.status === 'lost' && (
            <Button
              className={`w-full min-h-[48px] ${plainPageAccentBtn.mango}`}
              onClick={onMarkAsFound}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Marcar como encontrada
            </Button>
          )}
          {pet.contact_phone && (
            <Button
              className={`w-full min-h-[48px] ${plainPageAccentBtn.mango}`}
              onClick={() => window.open(`tel:${pet.contact_phone}`, '_self')}
            >
              <Phone className="w-4 h-4 mr-2" />
              Llamar al dueño
            </Button>
          )}
          <Button variant="outline" onClick={onClose} className="w-full min-h-[44px] border-landing-mango/30">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LostPetDetailsModal;
