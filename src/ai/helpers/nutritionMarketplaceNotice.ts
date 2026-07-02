import type { NutrientGap } from './nutritionMarketplaceRecommendations';
import { gapKindLabel } from './nutritionIntent';

export function buildMarketplaceAvailabilityNote(
  gaps: NutrientGap[],
  productCount: number,
  petName?: string | null,
): string | null {
  if (gaps.length === 0) return null;
  if (productCount > 0) return null;

  const pet = petName ? ` para **${petName}**` : '';
  const gapList = [...new Set(gaps.map((g) => gapKindLabel(g.kind)))].join(', ');
  const severity = gaps.some((g) => g.severity === 'significant')
    ? 'importantes'
    : gaps.some((g) => g.severity === 'moderate')
      ? 'moderadas'
      : 'leves';

  return (
    `Revisé el marketplace de PetHub${pet} y, aunque detecté posibles carencias (${gapList}) con prioridad ${severity}, ` +
    `**no hay productos activos con stock** en este momento que encajen bien con lo que necesita. ` +
    `Puedes volver a consultar más adelante cuando haya nuevos alimentos o suplementos publicados, ` +
    `o hablar con tu veterinario para elegir una opción fuera de la tienda. ` +
    `Si quieres, también puedo ayudarte a registrar mejor su alimentación o programar una consulta nutricional.`
  );
}

export function shouldAppendMarketplaceEmptyNotice(message: string, note: string): boolean {
  const lower = message.toLowerCase();
  if (lower.includes('no hay productos') || lower.includes('sin productos')) return false;
  if (lower.includes('marketplace') && (lower.includes('stock') || lower.includes('disponib'))) return false;
  return note.length > 0;
}
