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
  DollarSign,
  Footprints,
  MessageCircle,
  Phone,
  Radius,
  PawPrint,
  User,
} from 'lucide-react';
import { plainPageAccentBtn, plainPageAccentOutlineBtn } from '@/lib/landingTheme';
import { cn } from '@/lib/utils';
import type { WalkerMapItem } from '@/components/WalkersMap';
import { DEFAULT_COVERAGE_RADIUS_KM } from '@/utils/dogWalks';

const socialBtn = plainPageAccentBtn.mango;
const socialOutlineBtn = plainPageAccentOutlineBtn.mango;

interface WalkerDetailsModalProps {
  walker: WalkerMapItem | null;
  open: boolean;
  onClose: () => void;
  onRequestWalk: (walker: WalkerMapItem) => void;
  inClientRange?: boolean;
}

const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 min-w-0">
    <span className="text-landing-mango-dark shrink-0 mt-0.5">{icon}</span>
    <div className="min-w-0 flex-1 overflow-hidden">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900 break-words">{value}</p>
    </div>
  </div>
);

const WalkerAvatar = ({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) => {
  const initial = (name.trim()[0] ?? 'P').toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="w-14 h-14 rounded-2xl object-cover shrink-0 ring-2 ring-white shadow-sm bg-gray-100"
      />
    );
  }

  return (
    <div className="w-14 h-14 rounded-2xl bg-landing-mango/30 flex items-center justify-center shrink-0 ring-2 ring-white shadow-sm">
      <span className="text-lg font-bold text-landing-mango-dark">{initial}</span>
    </div>
  );
};

const WalkerDetailsModal: React.FC<WalkerDetailsModalProps> = ({
  walker,
  open,
  onClose,
  onRequestWalk,
  inClientRange = false,
}) => {
  if (!walker) return null;

  const name = walker.profile?.full_name ?? 'Paseador';
  const radiusKm = walker.coverage_radius_km ?? DEFAULT_COVERAGE_RADIUS_KM;
  const phone = walker.profile?.phone?.trim();
  const avatarUrl = walker.profile?.avatar_url;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className={cn(
          'flex flex-col gap-0 p-0',
          'w-[calc(100vw-1.25rem)] max-w-md',
          'max-h-[92dvh] overflow-y-auto overflow-x-hidden',
          'rounded-2xl border-landing-mango/15',
        )}
      >
        <div className="bg-landing-mango/15 px-4 pt-4 pb-3 border-b border-landing-mango/20 shrink-0">
          <DialogHeader className="text-left space-y-2 pr-8">
            <div className="flex items-start gap-3 min-w-0">
              <WalkerAvatar name={name} avatarUrl={avatarUrl} />
              <div className="min-w-0 flex-1 overflow-hidden">
                <DialogTitle className="text-lg font-bold text-gray-900 break-words leading-tight">
                  {name}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600 flex items-start gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span className="break-words line-clamp-2">
                    {walker.location_label || 'Zona disponible'}
                  </span>
                </DialogDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-0.5 max-w-full">
              <Badge className="bg-landing-mango/20 text-landing-mango-dark border-landing-mango/30 text-xs">
                <DollarSign className="w-3 h-3 mr-0.5" />
                Q.{walker.hourly_rate}/hora
              </Badge>
              <Badge variant="outline" className="text-gray-700 text-xs">
                <Radius className="w-3 h-3 mr-0.5" />
                {radiusKm} km
              </Badge>
              {inClientRange && (
                <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                  En tu zona
                </Badge>
              )}
            </div>
          </DialogHeader>
        </div>

        <div className="p-4 space-y-3 min-w-0 overflow-x-hidden">
          {walker.bio ? (
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sobre mí</p>
              <p className="text-sm text-gray-700 leading-relaxed break-words">{walker.bio}</p>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-2 min-w-0">
            {walker.experience_years != null && walker.experience_years > 0 && (
              <InfoRow
                icon={<User className="w-4 h-4" />}
                label="Experiencia"
                value={`${walker.experience_years} año${walker.experience_years !== 1 ? 's' : ''} con perros`}
              />
            )}
            <InfoRow
              icon={<PawPrint className="w-4 h-4" />}
              label="Capacidad"
              value={`Hasta ${walker.max_dogs ?? 3} perro${(walker.max_dogs ?? 3) !== 1 ? 's' : ''} a la vez`}
            />
            <InfoRow
              icon={<Radius className="w-4 h-4" />}
              label="Zona de servicio"
              value={`Radio de ${radiusKm} km alrededor de su ubicación`}
            />
          </div>

          <div className="flex flex-col gap-2 pt-1 pb-1 min-w-0">
            <Button
              className={cn('w-full min-h-[44px]', socialBtn)}
              onClick={() => {
                onRequestWalk(walker);
                onClose();
              }}
            >
              <MessageCircle className="w-4 h-4 mr-2 shrink-0" />
              Solicitar paseo
            </Button>
            {phone && (
              <Button
                variant="outline"
                className={cn('w-full min-h-[44px]', socialOutlineBtn)}
                onClick={() => window.open(`tel:${phone}`)}
              >
                <Phone className="w-4 h-4 mr-2 shrink-0" />
                Llamar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WalkerDetailsModal;
