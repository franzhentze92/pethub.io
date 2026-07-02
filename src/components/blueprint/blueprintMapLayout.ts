/** Posiciones fijas (% del contenedor) para cada módulo en el mapa radial. */
export const BLUEPRINT_MAP_NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  profile: { x: 50, y: 12 },
  nutrition: { x: 70, y: 15 },
  marketplace: { x: 84, y: 30 },
  adoption: { x: 88, y: 50 },
  pets: { x: 80, y: 70 },
  exercise: { x: 64, y: 84 },
  orders: { x: 50, y: 88 },
  breeding: { x: 36, y: 84 },
  addresses: { x: 22, y: 72 },
  veterinary: { x: 20, y: 52 },
  'payment-cards': { x: 24, y: 32 },
  reminders: { x: 38, y: 16 },
  'provider-profile': { x: 50, y: 12 },
  'provider-availability': { x: 22, y: 28 },
  'provider-services': { x: 78, y: 28 },
  'provider-products': { x: 88, y: 50 },
  'provider-appointments': { x: 72, y: 72 },
  'provider-orders': { x: 28, y: 72 },
  'shelter-profile': { x: 50, y: 10 },
  'shelter-media': { x: 82, y: 28 },
  'shelter-pets': { x: 86, y: 58 },
  'shelter-applications': { x: 50, y: 82 },
  'shelter-adoptions': { x: 18, y: 58 },
};

export function getBlueprintMapNodePosition(sectionId: string): { x: number; y: number } {
  return BLUEPRINT_MAP_NODE_POSITIONS[sectionId] ?? { x: 50, y: 50 };
}
