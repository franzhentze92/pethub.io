import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation } from 'lucide-react';
import { toast } from 'sonner';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationPickerProps {
  latitude?: number;
  longitude?: number;
  onLocationSelect: (lat: number, lng: number) => void;
  address?: string;
  city?: string;
  /** store = proveedor/tienda; delivery = dirección de entrega del cliente */
  mode?: 'store' | 'delivery';
  /** When true, map is view-only (no clicks / geolocation) */
  readOnly?: boolean;
}

const copyByMode = {
  store: {
    title: 'Ubicación de la Tienda',
    description:
      'Haz clic en el mapa para marcar la ubicación exacta de tu tienda. Esto ayudará a calcular mejor los costos de entrega.',
    savedHint: 'Las coordenadas se guardarán al actualizar tu perfil.',
  },
  delivery: {
    title: 'Punto de entrega',
    description:
      'Marca en el mapa dónde quieres recibir tus pedidos. Nos ayuda a calcular el costo de envío con más precisión.',
    savedHint: 'Las coordenadas se guardarán al guardar la dirección.',
  },
} as const;

// Component to handle map clicks
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);
    },
  });
  return null;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  latitude,
  longitude,
  onLocationSelect,
  address,
  city,
  mode = 'store',
  readOnly = false,
}) => {
  const copy = copyByMode[mode];
  const [selectedLat, setSelectedLat] = useState<number | undefined>(latitude);
  const [selectedLng, setSelectedLng] = useState<number | undefined>(longitude);
  const [isLocating, setIsLocating] = useState(false);

  // Update state when props change
  useEffect(() => {
    if (latitude && longitude) {
      setSelectedLat(latitude);
      setSelectedLng(longitude);
    }
  }, [latitude, longitude]);

  // Default center: Guatemala City
  const defaultCenter: [number, number] = [14.6349, -90.5069];
  const center: [number, number] = selectedLat && selectedLng 
    ? [selectedLat, selectedLng] 
    : defaultCenter;

  const handleMapClick = (lat: number, lng: number) => {
    if (readOnly) return;
    setSelectedLat(lat);
    setSelectedLng(lng);
    onLocationSelect(lat, lng);
  };

  const handleGetCurrentLocation = () => {
    if (readOnly) return;
    if (!navigator.geolocation) {
      toast.warning('La geolocalización no está disponible en tu navegador');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setSelectedLat(latitude);
        setSelectedLng(longitude);
        onLocationSelect(latitude, longitude);
        setIsLocating(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('No se pudo obtener tu ubicación. Por favor, haz clic en el mapa para seleccionarla.');
        setIsLocating(false);
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          {copy.title}
        </CardTitle>
        <CardDescription>
          {copy.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {readOnly && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg">
            Pulsa <strong>Editar</strong> o <strong>Editar Perfil</strong> para marcar la ubicación exacta de tu tienda en el mapa.
          </div>
        )}

        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleGetCurrentLocation}
              disabled={isLocating}
              className="flex items-center gap-2"
            >
              <Navigation className="w-4 h-4" />
              {isLocating ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual'}
            </Button>
            {selectedLat && selectedLng && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>
                  {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}
                </span>
              </div>
            )}
          </div>
        )}

        <div className={`relative w-full h-[240px] sm:h-[320px] rounded-lg overflow-hidden border ${readOnly ? 'opacity-90' : ''}`}>
          <MapContainer
            key={`${readOnly}-${selectedLat ?? 'x'}-${selectedLng ?? 'y'}`}
            center={center}
            zoom={selectedLat && selectedLng ? 15 : 12}
            style={{ height: '100%', width: '100%', minHeight: 240 }}
            className="z-0"
            scrollWheelZoom={!readOnly}
            dragging={!readOnly}
            doubleClickZoom={!readOnly}
            touchZoom={!readOnly}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {!readOnly && <MapClickHandler onLocationSelect={handleMapClick} />}
            {selectedLat && selectedLng && (
              <Marker position={[selectedLat, selectedLng]} />
            )}
          </MapContainer>
        </div>

        {address && city && (
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <p className="font-medium">Dirección registrada:</p>
            <p>{address}</p>
            <p>{city}</p>
          </div>
        )}

        {selectedLat && selectedLng && (
          <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
            <p className="font-medium">✓ Ubicación seleccionada</p>
            <p>{copy.savedHint}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LocationPicker;

