import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { formatSpeciesLabel } from '@/utils/petLabels';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
  image_url?: string;
  description?: string;
  contact_phone?: string;
  contact_email?: string;
  status: string;
  owner_id: string;
  created_at: string;
}

interface RealMapProps {
  lostPets: LostPet[];
  onLocationSelect?: (lat: number, lng: number) => void;
  selectedLocation?: { lat: number; lng: number } | null;
  isSelectingLocation?: boolean;
  viewMode?: 'list' | 'map';
  onPetClick?: (pet: LostPet) => void;
  className?: string;
}

function MapFlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 15, { duration: 0.5 });
  }, [lat, lng, map]);
  return null;
}

function MapClickHandler({
  isSelectingLocation,
  onLocationSelect,
}: {
  isSelectingLocation: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      if (isSelectingLocation && onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

const RealMap: React.FC<RealMapProps> = ({ 
  lostPets, 
  onLocationSelect, 
  selectedLocation,
  isSelectingLocation = false,
  viewMode = 'map',
  onPetClick,
  className,
}) => {
  // Default center for Guatemala City
  const defaultCenter: [number, number] = [14.6349, -90.5069];
  const defaultZoom = 11;

  // Create custom icons for different pet statuses
  const createCustomIcon = (status: string) => {
    const color = status === 'lost' ? 'red' : status === 'found' ? 'green' : 'gray';
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'lost': return 'Perdido';
      case 'found': return 'Encontrado';
      case 'cancelled': return 'Cancelado';
      default: return 'Desconocido';
    }
  };

  const mapCenter: [number, number] =
    selectedLocation && isSelectingLocation
      ? [selectedLocation.lat, selectedLocation.lng]
      : defaultCenter;

  const mapZoom = selectedLocation && isSelectingLocation ? 15 : defaultZoom;

  if (viewMode === 'list') {
    // List view - show as cards
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {lostPets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-6xl mb-4">🐾</div>
            <h3 className="text-lg font-medium mb-2">No hay mascotas perdidas reportadas</h3>
            <p className="text-gray-400">Sé el primero en reportar una mascota perdida</p>
          </div>
        ) : (
          lostPets.map((pet) => (
            <div
              key={pet.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onPetClick?.(pet)}
            >
              <div className="flex items-start space-x-4">
                {pet.image_url ? (
                  <img
                    src={pet.image_url}
                    alt={pet.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🐾</span>
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{pet.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      pet.status === 'lost' ? 'bg-red-100 text-red-800' :
                      pet.status === 'found' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {getStatusText(pet.status)}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">Especie:</span> {formatSpeciesLabel(pet.species)} - {pet.breed}</p>
                    <p><span className="font-medium">Última vez visto:</span> {formatDate(pet.last_seen)}</p>
                    <p><span className="font-medium">Ubicación:</span> {pet.last_location}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  // Map view
  return (
    <div className={`relative w-full h-full ${className ?? ''}`} style={{ minHeight: isSelectingLocation ? undefined : '400px' }}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%', minHeight: isSelectingLocation ? '100%' : '400px', zIndex: 0 }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {isSelectingLocation && (
          <MapClickHandler
            isSelectingLocation={isSelectingLocation}
            onLocationSelect={onLocationSelect}
          />
        )}

        {selectedLocation && isSelectingLocation && (
          <MapFlyTo lat={selectedLocation.lat} lng={selectedLocation.lng} />
        )}
        
        {/* Lost Pet Markers */}
        {lostPets.map((pet) => (
          <Marker
            key={pet.id}
            position={[pet.latitude, pet.longitude]}
            icon={createCustomIcon(pet.status)}
            eventHandlers={{
              click: () => onPetClick?.(pet)
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <div className="flex items-center space-x-3 mb-3">
                  {pet.image_url ? (
                    <img
                      src={pet.image_url}
                      alt={pet.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-xl">🐾</span>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="font-semibold text-gray-900">{pet.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      pet.status === 'lost' ? 'bg-red-100 text-red-800' :
                      pet.status === 'found' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {getStatusText(pet.status)}
                    </span>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 space-y-1 mb-3">
                  <p><span className="font-medium">Especie:</span> {formatSpeciesLabel(pet.species)} - {pet.breed}</p>
                  <p><span className="font-medium">Edad:</span> {pet.age} años</p>
                  <p><span className="font-medium">Color:</span> {pet.color}</p>
                  <p><span className="font-medium">Perdido:</span> {formatDate(pet.last_seen)}</p>
                  <p><span className="font-medium">Ubicación:</span> {pet.last_location}</p>
                </div>
                
                {pet.description && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-700">{pet.description}</p>
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <button
                    className="flex-1 bg-landing-aqua text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                    onClick={() => onPetClick?.(pet)}
                  >
                    Ver detalles
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
        
        {/* Selected Location Marker (for location selection mode) */}
        {selectedLocation && isSelectingLocation && (
          <Marker position={[selectedLocation.lat, selectedLocation.lng]}>
            <Popup>
              <div className="text-center">
                <p className="font-medium">Ubicación seleccionada</p>
                <p className="text-sm text-gray-600">
                  {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
      
      {isSelectingLocation && !selectedLocation && (
        <div className="absolute top-3 left-3 right-3 pointer-events-none bg-white/95 backdrop-blur-sm text-gray-800 px-4 py-3 rounded-xl shadow-lg border border-landing-aqua/15 z-[1000]">
          <div className="text-center">
            <div className="text-sm font-bold mb-0.5 text-landing-aqua-dark">Selecciona una ubicación</div>
            <div className="text-xs text-gray-600">Toca el mapa para marcar dónde se perdió tu mascota</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealMap;
