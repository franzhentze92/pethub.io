import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Phone, Mail, Users, Search, PawPrint } from 'lucide-react';
import { useShelters } from '@/hooks/useAdoption';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MobileSectionCard } from './mobile/MobileUi';
import { landingBtnPrimary } from '@/lib/landingTheme';
import { Skeleton } from '@/components/ui/skeleton';

const Shelters: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const navigate = useNavigate();
  const { data: shelters = [], isLoading: sheltersLoading } = useShelters();

  const filteredShelters = shelters.filter((shelter) => {
    const matchesSearch =
      shelter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (shelter.description && shelter.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLocation =
      !locationFilter ||
      (shelter.location && shelter.location.toLowerCase().includes(locationFilter.toLowerCase()));
    return matchesSearch && matchesLocation;
  });

  const handleContactShelter = (shelter: { phone?: string | null }, method: 'phone' | 'email') => {
    if (method === 'phone' && shelter.phone) {
      window.open(`tel:${shelter.phone}`, '_blank');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Albergues y refugios</h2>
        <p className="text-sm text-gray-500">Encuentra organizaciones cerca de ti</p>
      </div>

      {/* Search */}
      <MobileSectionCard className="p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 min-h-[44px] border-landing-aqua/20"
          />
        </div>
        <Input
          placeholder="Filtrar por ciudad..."
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="min-h-[44px] border-landing-aqua/20"
        />
      </MobileSectionCard>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4 text-landing-aqua-dark" />
          <span>{filteredShelters.length} albergue{filteredShelters.length !== 1 ? 's' : ''}</span>
        </div>
        {(searchTerm || locationFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm('');
              setLocationFilter('');
            }}
            className="text-landing-aqua-dark"
          >
            Limpiar
          </Button>
        )}
      </div>

      {sheltersLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <MobileSectionCard key={i} className="p-4">
              <div className="flex gap-3">
                <Skeleton className="w-20 h-20 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </div>
            </MobileSectionCard>
          ))}
        </div>
      ) : filteredShelters.length === 0 ? (
        <MobileSectionCard className="p-8 text-center">
          <Building2 className="w-14 h-14 mx-auto text-landing-aqua/30 mb-3" />
          <h3 className="font-bold text-gray-900 mb-1">
            {searchTerm || locationFilter ? 'Sin resultados' : 'No hay albergues'}
          </h3>
          <p className="text-sm text-gray-500">
            {searchTerm || locationFilter
              ? 'Prueba con otros términos de búsqueda.'
              : 'Aún no hay albergues registrados en la plataforma.'}
          </p>
        </MobileSectionCard>
      ) : (
        <div className="space-y-3">
          {filteredShelters.map((shelter) => (
            <MobileSectionCard key={shelter.id}>
              <div className="p-4">
                <div className="flex gap-3">
                  <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-landing-aqua/20 to-landing-mint/20 flex items-center justify-center">
                    {(shelter.primary_image_url || shelter.image_url) ? (
                      <img
                        src={shelter.primary_image_url || shelter.image_url || ''}
                        alt={shelter.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Building2 className="w-8 h-8 text-landing-aqua-dark" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{shelter.name}</h3>
                    {shelter.location && (
                      <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{shelter.location}</span>
                      </p>
                    )}
                    {shelter.description && (
                      <p className="text-xs text-gray-600 line-clamp-2 mt-1.5">{shelter.description}</p>
                    )}

                    <div className="flex items-center gap-1 mt-2">
                      {shelter.phone && (
                        <button
                          type="button"
                          onClick={() => handleContactShelter(shelter, 'phone')}
                          className="p-2 rounded-lg text-landing-aqua-dark hover:bg-landing-aqua/10"
                          aria-label="Llamar"
                        >
                          <Phone className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                        aria-label="Email"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100">
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-[40px] border-landing-aqua/30 text-landing-aqua-dark"
                    onClick={() => navigate(`/shelter/${shelter.id}?tab=pets`)}
                  >
                    <PawPrint className="w-4 h-4 mr-1.5" />
                    Mascotas
                  </Button>
                  <Button
                    size="sm"
                    className={`min-h-[40px] ${landingBtnPrimary}`}
                    onClick={() => navigate(`/shelter/${shelter.id}`)}
                  >
                    Ver albergue
                  </Button>
                </div>
              </div>
            </MobileSectionCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default Shelters;
