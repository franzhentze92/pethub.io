import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, DollarSign, Footprints, Navigation, Loader2, Radius } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { DEFAULT_COVERAGE_RADIUS_KM, isWithinWalkerCoverage } from '@/utils/dogWalks';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export interface WalkerMapItem {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  location_label: string;
  hourly_rate: number;
  coverage_radius_km?: number;
  bio?: string | null;
  experience_years?: number;
  max_dogs?: number;
  profile?: {
    full_name: string;
    phone?: string | null;
    avatar_url?: string | null;
  };
}

interface WalkersMapProps {
  walkers: WalkerMapItem[];
  onWalkerClick?: (walker: WalkerMapItem) => void;
  onLocationSelect?: (lat: number, lng: number) => void;
  selectedLocation?: { lat: number; lng: number } | null;
  isSelectingLocation?: boolean;
  /** Radio de cobertura en km (vista previa al registrarse) */
  previewCoverageRadiusKm?: number;
  /** Ubicación del cliente para comparar con radios */
  clientLocation?: { lat: number; lng: number } | null;
  onClientLocationChange?: (lat: number, lng: number) => void;
  /** Mostrar círculos de cobertura de paseadores */
  showCoverageRadii?: boolean;
  className?: string;
  compact?: boolean;
}

const COVERAGE_STYLE = {
  color: '#f59e0b',
  fillColor: '#fbbf24',
  fillOpacity: 0.12,
  weight: 2,
  interactive: false,
};

const COVERAGE_IN_RANGE_STYLE = {
  color: '#22c55e',
  fillColor: '#86efac',
  fillOpacity: 0.18,
  weight: 2,
  interactive: false,
};

const PREVIEW_COVERAGE_STYLE = {
  color: '#6366f1',
  fillColor: '#818cf8',
  fillOpacity: 0.15,
  weight: 2,
  dashArray: '6 4',
  interactive: false,
};

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

const walkerIcon = L.divIcon({
  className: 'walker-div-icon',
  html: `<div style="background-color: #f59e0b; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; font-size:14px; cursor:pointer;">🐕</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const clientIcon = L.divIcon({
  className: 'client-div-icon',
  html: `<div style="background-color: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.35);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const WalkersMap: React.FC<WalkersMapProps> = ({
  walkers,
  onWalkerClick,
  onLocationSelect,
  selectedLocation,
  isSelectingLocation = false,
  previewCoverageRadiusKm = DEFAULT_COVERAGE_RADIUS_KM,
  clientLocation,
  onClientLocationChange,
  showCoverageRadii = true,
  className,
  compact = false,
}) => {
  const [isLocating, setIsLocating] = useState(false);

  const defaultCenter: [number, number] = [14.6349, -90.5069];
  const flyTarget = clientLocation ?? (isSelectingLocation ? selectedLocation : null);
  const mapCenter: [number, number] = flyTarget
    ? [flyTarget.lat, flyTarget.lng]
    : defaultCenter;
  const mapZoom = flyTarget ? 14 : 11;

  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.warning('La geolocalización no está disponible en tu navegador');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (isSelectingLocation && onLocationSelect) {
          onLocationSelect(latitude, longitude);
        } else if (onClientLocationChange) {
          onClientLocationChange(latitude, longitude);
        }
        setIsLocating(false);
        toast.success('Ubicación detectada');
      },
      () => {
        toast.error('No se pudo obtener tu ubicación.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, [isSelectingLocation, onLocationSelect, onClientLocationChange]);

  const showLocateButton =
    isSelectingLocation ? !!onLocationSelect : !!onClientLocationChange;

  const getWalkerInRange = (walker: WalkerMapItem) => {
    if (!clientLocation) return false;
    const radius = walker.coverage_radius_km ?? DEFAULT_COVERAGE_RADIUS_KM;
    return isWithinWalkerCoverage(
      clientLocation.lat,
      clientLocation.lng,
      walker.latitude,
      walker.longitude,
      radius,
    );
  };

  return (
    <div className={cn('w-full flex flex-col', className)}>
      {!compact && (
        <div className="shrink-0 bg-landing-mango text-gray-900 px-4 py-3 rounded-t-2xl">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Footprints className="w-4 h-4" />
            Mapa de paseadores
          </h3>
          <p className="text-gray-700 text-xs mt-0.5">
            {walkers.length} paseador{walkers.length !== 1 ? 'es' : ''} · los círculos muestran su zona de cobertura
          </p>
        </div>
      )}
      <div className="relative flex-1 min-h-[360px] rounded-b-2xl overflow-hidden border border-gray-100">
        {showLocateButton && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="absolute top-3 right-3 z-[1000] shadow-md bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 h-9 px-3"
            onClick={handleGetCurrentLocation}
            disabled={isLocating}
          >
            {isLocating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            <span className="ml-1.5 text-xs font-medium">
              {isLocating ? 'Ubicando…' : 'Mi ubicación'}
            </span>
          </Button>
        )}
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%', minHeight: 360 }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler
            isSelectingLocation={isSelectingLocation}
            onLocationSelect={onLocationSelect}
          />

          {flyTarget && <MapFlyTo lat={flyTarget.lat} lng={flyTarget.lng} />}

          {selectedLocation && isSelectingLocation && (
            <>
              <Marker position={[selectedLocation.lat, selectedLocation.lng]} />
              <Circle
                center={[selectedLocation.lat, selectedLocation.lng]}
                radius={previewCoverageRadiusKm * 1000}
                pathOptions={PREVIEW_COVERAGE_STYLE}
              />
            </>
          )}

          {clientLocation && !isSelectingLocation && (
            <Marker position={[clientLocation.lat, clientLocation.lng]} icon={clientIcon} />
          )}

          {walkers.map((walker) => {
            const radiusKm = walker.coverage_radius_km ?? DEFAULT_COVERAGE_RADIUS_KM;
            const inRange = getWalkerInRange(walker);

            return (
              <React.Fragment key={walker.id}>
                {showCoverageRadii && !isSelectingLocation && (
                  <Circle
                    center={[walker.latitude, walker.longitude]}
                    radius={radiusKm * 1000}
                    pathOptions={inRange ? COVERAGE_IN_RANGE_STYLE : COVERAGE_STYLE}
                  />
                )}
                <Marker
                  position={[walker.latitude, walker.longitude]}
                  icon={walkerIcon}
                  zIndexOffset={1000}
                  eventHandlers={{
                    click: (e) => {
                      L.DomEvent.stopPropagation(e);
                      onWalkerClick?.(walker);
                    },
                  }}
                >
                  <Popup>
                    <div className="min-w-[180px] space-y-2">
                      <p className="font-bold text-sm">
                        {walker.profile?.full_name ?? 'Paseador'}
                      </p>
                      <p className="text-xs text-gray-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {walker.location_label || 'Zona disponible'}
                      </p>
                      <p className="text-xs text-gray-600 flex items-center gap-1">
                        <Radius className="w-3 h-3" />
                        Cobertura: {radiusKm} km
                        {clientLocation && (
                          <span className={inRange ? 'text-green-600 font-medium' : 'text-gray-400'}>
                            {inRange ? ' · En tu zona' : ' · Fuera de tu zona'}
                          </span>
                        )}
                      </p>
                      <Badge className="text-[10px] bg-landing-mango/15 text-landing-mango-dark border-landing-mango/30">
                        <DollarSign className="w-3 h-3 mr-0.5" />
                        Q.{walker.hourly_rate}/hora
                      </Badge>
                      {walker.bio && (
                        <p className="text-xs text-gray-500 line-clamp-2">{walker.bio}</p>
                      )}
                      <Button
                        size="sm"
                        className="w-full h-8 text-xs bg-landing-mango hover:bg-landing-mango-dark text-gray-900"
                        onClick={(e) => {
                          e.stopPropagation();
                          onWalkerClick?.(walker);
                        }}
                      >
                        Ver perfil
                      </Button>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default WalkersMap;
