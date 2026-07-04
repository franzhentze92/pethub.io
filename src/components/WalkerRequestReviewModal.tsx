import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  Clock,
  PawPrint,
  Check,
  X,
  Phone,
  Navigation,
  User,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { plainPageAccentBtn, plainPageAccentOutlineBtn } from '@/lib/landingTheme';
import WalkPickupMap from '@/components/WalkPickupMap';
import type { DogWalkRequest } from '@/components/WalkerChatModal';
import { getPrimaryPetImageUrl } from '@/utils/petImages';
import { formatDogWalkPetNames, getDogWalkRequestPets } from '@/utils/dogWalkPets';
import { formatWalkDistance, getWalkPickupPoint } from '@/utils/dogWalks';

interface WalkerRequestReviewModalProps {
  request: DogWalkRequest | null;
  open: boolean;
  onClose: () => void;
  walkerLocation?: { lat: number; lng: number } | null;
  onAccept: (request: DogWalkRequest) => void;
  onReject: (request: DogWalkRequest) => void;
  onOpenChat?: (request: DogWalkRequest) => void;
  updating?: boolean;
}

const socialBtn = plainPageAccentBtn.mango;
const socialOutlineBtn = plainPageAccentOutlineBtn.mango;

const WalkerRequestReviewModal: React.FC<WalkerRequestReviewModalProps> = ({
  request,
  open,
  onClose,
  walkerLocation,
  onAccept,
  onReject,
  onOpenChat,
  updating = false,
}) => {
  if (!request) return null;

  const pets = getDogWalkRequestPets(request);
  const petNames = formatDogWalkPetNames(pets);
  const pickup = getWalkPickupPoint(request);
  const clientName = request.client_profile?.full_name?.trim() || 'Cliente';
  const clientPhone = request.client_profile?.phone?.trim();
  const distanceKm =
    pickup && walkerLocation
      ? formatWalkDistance(walkerLocation.lat, walkerLocation.lng, pickup.lat, pickup.lng)
      : null;

  const openExternalMaps = () => {
    if (!pickup) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${pickup.lat},${pickup.lng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={cn(
          'flex flex-col gap-0 p-0',
          'w-[calc(100vw-1.25rem)] max-w-lg',
          'max-h-[92dvh] overflow-y-auto overflow-x-hidden',
          'rounded-2xl',
        )}
      >
        <div className="p-4 border-b bg-landing-mango/10 shrink-0">
          <DialogHeader className="text-left pr-8">
            <DialogTitle className="text-lg">Solicitud de paseo</DialogTitle>
            <DialogDescription>
              Revisa la ubicación y los detalles antes de aceptar.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-4 space-y-4 min-w-0">
          <div className="flex items-start gap-3">
            <div className="flex -space-x-2 shrink-0">
              {pets.slice(0, 3).map((pet) => {
                const img = getPrimaryPetImageUrl(pet);
                return (
                  <div
                    key={pet.id}
                    className="w-11 h-11 rounded-xl overflow-hidden bg-gray-100 ring-2 ring-white"
                  >
                    {img ? (
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PawPrint className="w-4 h-4 text-landing-mango-dark" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-900">{petNames}</p>
              <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
                <User className="w-3.5 h-3.5 shrink-0" />
                {clientName}
              </p>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                {request.requested_date}
                {request.requested_time ? ` · ${request.requested_time.slice(0, 5)}` : ''}
                {' · '}
                {request.duration_minutes} min · Q.{request.price.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Punto de recogida
              </p>
              {distanceKm && (
                <Badge variant="outline" className="text-xs">
                  ~{distanceKm} de ti
                </Badge>
              )}
            </div>
            {pickup ? (
              <>
                <WalkPickupMap
                  pickup={pickup}
                  walker={walkerLocation ?? undefined}
                  height={200}
                />
                <p className="text-sm text-gray-700 flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 shrink-0 text-landing-mango-dark mt-0.5" />
                  <span className="break-words">
                    {request.pickup_address || request.client_profile?.address || 'Ubicación del cliente'}
                  </span>
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`w-full ${socialOutlineBtn}`}
                  onClick={openExternalMaps}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Abrir en Google Maps
                </Button>
              </>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-medium">Sin ubicación en mapa</p>
                <p className="text-xs mt-1 text-amber-800">
                  {request.pickup_address ||
                    request.client_profile?.address ||
                    request.message ||
                    'Pregunta al cliente por el punto de encuentro en el chat.'}
                </p>
              </div>
            )}
          </div>

          {request.message && (
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Mensaje del cliente</p>
              <p className="text-sm text-gray-700">{request.message}</p>
            </div>
          )}

          {clientPhone && (
            <Button
              type="button"
              variant="outline"
              className={`w-full ${socialOutlineBtn}`}
              onClick={() => window.open(`tel:${clientPhone}`)}
            >
              <Phone className="w-4 h-4 mr-2" />
              Llamar a {clientName}
            </Button>
          )}

          {request.status === 'pending' && (
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex gap-2">
                <Button
                  className={`flex-1 ${socialBtn}`}
                  disabled={updating}
                  onClick={() => onAccept(request)}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Aceptar paseo
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600"
                  disabled={updating}
                  onClick={() => onReject(request)}
                >
                  <X className="w-4 h-4 mr-1" />
                  Rechazar
                </Button>
              </div>
              {onOpenChat && (
                <Button
                  variant="outline"
                  className={`w-full ${socialOutlineBtn}`}
                  onClick={() => {
                    onOpenChat(request);
                    onClose();
                  }}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Ir al chat
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WalkerRequestReviewModal;
