/** Opciones de radio de cobertura para paseadores (km) */
export const COVERAGE_RADIUS_OPTIONS = [1, 2, 3, 5, 8, 10] as const;

export const DEFAULT_COVERAGE_RADIUS_KM = 3;

export function isWithinWalkerCoverage(
  clientLat: number,
  clientLng: number,
  walkerLat: number,
  walkerLng: number,
  radiusKm: number,
): boolean {
  const R = 6371;
  const dLat = ((walkerLat - clientLat) * Math.PI) / 180;
  const dLon = ((walkerLng - clientLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((clientLat * Math.PI) / 180) *
      Math.cos((walkerLat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return distanceKm <= radiusKm;
}

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatWalkDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): string {
  const km = haversineDistanceKm(lat1, lng1, lat2, lng2);
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export interface WalkPickupCoords {
  lat: number;
  lng: number;
}

export function getWalkPickupPoint(request: {
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
}): WalkPickupCoords | null {
  if (
    request.pickup_latitude != null &&
    request.pickup_longitude != null &&
    Number.isFinite(request.pickup_latitude) &&
    Number.isFinite(request.pickup_longitude)
  ) {
    return { lat: request.pickup_latitude, lng: request.pickup_longitude };
  }
  return null;
}
