import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const pickupIcon = L.divIcon({
  className: 'walk-pickup-icon',
  html: `<div style="background:#3b82f6;width:22px;height:22px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:11px;">🐾</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const walkerIcon = L.divIcon({
  className: 'walk-walker-icon',
  html: `<div style="background:#f59e0b;width:22px;height:22px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:11px;">📍</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function FitBounds({
  points,
}: {
  points: { lat: number; lng: number }[];
}) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15, { animate: false });
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds.pad(0.25), { animate: false });
  }, [map, points]);
  return null;
}

export interface WalkPickupMapProps {
  pickup: { lat: number; lng: number };
  walker?: { lat: number; lng: number } | null;
  className?: string;
  height?: number | string;
  interactive?: boolean;
}

const WalkPickupMap: React.FC<WalkPickupMapProps> = ({
  pickup,
  walker,
  className = '',
  height = 160,
  interactive = false,
}) => {
  const points = useMemo(() => {
    const list = [{ lat: pickup.lat, lng: pickup.lng }];
    if (walker) list.push(walker);
    return list;
  }, [pickup, walker]);

  const line = walker
    ? [
        [pickup.lat, pickup.lng] as [number, number],
        [walker.lat, walker.lng] as [number, number],
      ]
    : null;

  return (
    <div
      className={`rounded-xl overflow-hidden border border-gray-200 ${className}`}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      <MapContainer
        center={[pickup.lat, pickup.lng]}
        zoom={15}
        className="h-full w-full"
        zoomControl={interactive}
        dragging={interactive}
        scrollWheelZoom={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} />
        {walker && <Marker position={[walker.lat, walker.lng]} icon={walkerIcon} />}
        {line && (
          <Polyline
            positions={line}
            pathOptions={{ color: '#6366f1', weight: 3, dashArray: '6 6', opacity: 0.8 }}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default WalkPickupMap;
