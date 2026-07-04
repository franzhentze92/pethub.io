/**
 * Calculate delivery cost based on distance between provider and client addresses
 */

// Distance-based pricing tiers (in kilometers)
const DELIVERY_PRICING = [
  { maxKm: 5, price: 15 },    // 0-5 km: Q15
  { maxKm: 10, price: 30 },    // 5-10 km: Q30
  { maxKm: 20, price: 60 },   // 10-20 km: Q60
  { maxKm: 30, price: 100 },   // 20-30 km: Q100
];

/**
 * Calculate the distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get coordinates from an address using geocoding
 * Uses OpenStreetMap Nominatim (free, no API key required)
 * Can be replaced with Google Maps Geocoding API if you have an API key
 */
export async function geocodeAddress(address: string, city: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const fullAddress = `${address}, ${city}, Guatemala`;
    
    // Use OpenStreetMap Nominatim (free, but has rate limits)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`,
      {
        headers: {
          'User-Agent': 'PetHub-SaaS/1.0' // Required by Nominatim
        }
      }
    );
    
    if (!response.ok) {
      console.error('Geocoding API error:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      const result = data[0];
      return {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon)
      };
    }
    
    // If OpenStreetMap fails, you can try Google Maps Geocoding API (requires API key):
    // const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    // if (GOOGLE_API_KEY) {
    //   const googleResponse = await fetch(
    //     `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${GOOGLE_API_KEY}`
    //   );
    //   const googleData = await googleResponse.json();
    //   if (googleData.results && googleData.results.length > 0) {
    //     const location = googleData.results[0].geometry.location;
    //     return { lat: location.lat, lon: location.lng };
    //   }
    // }
    
    console.warn('No geocoding results found for:', fullAddress);
    return null;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

/** Geocode a freeform address string (e.g. full pickup label) */
export async function geocodeFreeformAddress(query: string): Promise<{ lat: number; lon: number } | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=1`,
      { headers: { 'User-Agent': 'PetHub-SaaS/1.0' } },
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (data?.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

/** Reverse geocode coordinates to a short address label */
export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16`,
      { headers: { 'User-Agent': 'PetHub-SaaS/1.0' } },
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data?.display_name?.split(',').slice(0, 3).join(', ') ?? null;
  } catch {
    return null;
  }
}

/**
 * Calculate delivery cost based on distance
 * @param distanceKm Distance in kilometers
 * @returns Delivery cost in quetzales, or null if distance exceeds 30 km (delivery not available)
 */
export function calculateDeliveryCost(distanceKm: number): number | null {
  if (distanceKm <= 0) {
    return 0;
  }
  
  // Maximum delivery distance is 30 km
  if (distanceKm > 30) {
    return null; // Delivery not available for distances > 30 km
  }
  
  // Find the appropriate pricing tier
  for (const tier of DELIVERY_PRICING) {
    if (distanceKm <= tier.maxKm) {
      return tier.price;
    }
  }
  
  // This should not happen if DELIVERY_PRICING covers up to 30 km
  // But as a fallback, return the maximum price
  return DELIVERY_PRICING[DELIVERY_PRICING.length - 1].price;
}

/**
 * Calculate delivery cost for multiple providers
 * This handles the case where items in cart come from different providers
 * @param providerAddresses Array of provider addresses with coordinates
 * @param clientAddress Client address with coordinates
 * @returns Map of provider_id -> delivery_cost
 */
export function calculateDeliveryCostsForProviders(
  providerAddresses: Array<{ provider_id: string; lat: number; lon: number }>,
  clientAddress: { lat: number; lon: number }
): Map<string, number> {
  const costs = new Map<string, number>();
  
  providerAddresses.forEach(provider => {
    const distance = calculateDistance(
      provider.lat,
      provider.lon,
      clientAddress.lat,
      clientAddress.lon
    );
    const cost = calculateDeliveryCost(distance);
    costs.set(provider.provider_id, cost);
  });
  
  return costs;
}

/**
 * Format address for geocoding
 */
export function formatAddressForGeocoding(address: string, city: string): string {
  return `${address}, ${city}, Guatemala`;
}

