import React from 'react';
import { MapPin, Calendar, Phone, Mail, DollarSign, PawPrint } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import RealMap from './RealMap';
import { formatSpeciesLabel } from '@/utils/petLabels';
import { cn } from '@/lib/utils';

interface LostPet {
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

interface SimpleMapProps {
  lostPets: LostPet[];
  onLocationSelect?: (lat: number, lng: number) => void;
  selectedLocation?: { lat: number; lng: number } | null;
  isSelectingLocation?: boolean;
  viewMode?: 'list' | 'map';
  onPetClick?: (pet: LostPet) => void;
  compact?: boolean;
  className?: string;
}

const SimpleMap: React.FC<SimpleMapProps> = ({
  lostPets,
  onLocationSelect,
  selectedLocation,
  isSelectingLocation = false,
  viewMode = 'list',
  onPetClick,
  compact = false,
  className,
}) => {
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'lost': return 'bg-landing-mango/15 text-landing-mango-dark border-landing-mango/30';
      case 'found': return 'bg-landing-mint/15 text-landing-mint-dark border-landing-mint/30';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
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

  if (viewMode === 'map' || isSelectingLocation) {
    return (
      <div className={cn('w-full h-full flex flex-col', className)}>
        {!compact && (
          <div className="shrink-0 bg-landing-mango text-gray-900 px-4 py-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Mapa de mascotas perdidas
            </h3>
            <p className="text-gray-700 text-xs mt-0.5">
              {lostPets.length} reporte{lostPets.length !== 1 ? 's' : ''} activo{lostPets.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
        <div className="flex-1 min-h-0">
          <RealMap
            lostPets={lostPets}
            onLocationSelect={onLocationSelect}
            selectedLocation={selectedLocation}
            isSelectingLocation={isSelectingLocation}
            viewMode="map"
            onPetClick={onPetClick}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full h-full flex flex-col rounded-2xl overflow-hidden border border-landing-aqua/15 bg-white', className)}>
      <div className="shrink-0 bg-landing-mango/10 px-4 py-3 border-b border-landing-mango/20">
        <p className="text-sm font-semibold text-gray-900">
          {lostPets.length} reporte{lostPets.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {lostPets.length === 0 ? (
          <div className="text-center py-10">
            <PawPrint className="w-12 h-12 mx-auto text-landing-aqua/30 mb-3" />
            <h3 className="text-base font-bold text-gray-900 mb-1">Sin reportes activos</h3>
            <p className="text-sm text-gray-500">Sé el primero en reportar una mascota perdida</p>
          </div>
        ) : (
          lostPets.map((pet) => (
            <button
              key={pet.id}
              type="button"
              onClick={() => onPetClick?.(pet)}
              className="w-full text-left bg-white rounded-xl border border-gray-100 p-3 shadow-sm active:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                {pet.image_url ? (
                  <img src={pet.image_url} alt={pet.name} className="w-14 h-14 object-cover rounded-xl shrink-0" />
                ) : (
                  <div className="w-14 h-14 bg-landing-mango/10 rounded-xl flex items-center justify-center shrink-0">
                    <PawPrint className="w-6 h-6 text-landing-mango-dark" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 truncate">{pet.name}</h3>
                    <Badge className={cn('text-[10px] shrink-0 border', getStatusColor(pet.status))}>
                      {getStatusText(pet.status)}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-xs text-gray-600">
                    <p>
                      {formatSpeciesLabel(pet.species)}
                      {pet.breed ? ` · ${pet.breed}` : ''}
                      {pet.age ? ` · ${pet.age} años` : ''}
                    </p>
                    <p className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 shrink-0" />
                      Perdido: {formatDate(pet.last_seen)}
                    </p>
                    <p className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{pet.last_location}</span>
                    </p>
                    {pet.reward ? (
                      <p className="flex items-center gap-1 text-landing-mint-dark font-medium">
                        <DollarSign className="w-3 h-3 shrink-0" />
                        Recompensa: Q.{pet.reward}
                      </p>
                    ) : null}
                  </div>

                  {(pet.contact_phone || pet.contact_email) && (
                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100">
                      {pet.contact_phone && (
                        <span className="flex items-center gap-1 text-landing-aqua-dark text-xs">
                          <Phone className="w-3 h-3" />
                          Llamar
                        </span>
                      )}
                      {pet.contact_email && (
                        <span className="flex items-center gap-1 text-landing-aqua-dark text-xs">
                          <Mail className="w-3 h-3" />
                          Correo
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default SimpleMap;
