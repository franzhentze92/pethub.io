import type { PetBuddyProductRecommendation } from '../types';

const MAX_UI_RECOMMENDATIONS = 6;

function fromMarketplaceRow(p: Record<string, unknown>): PetBuddyProductRecommendation | null {
  const productId = String(p.id ?? p.product_id ?? '');
  const productName = String(p.name ?? p.product_name ?? '');
  if (!productId || !productName) return null;

  const nutrition = p.nutrition as Record<string, unknown> | undefined;

  return {
    productId,
    productName,
    brand: (p.brand as string) ?? null,
    price: Number(p.price) || 0,
    currency: String(p.currency ?? 'GTQ'),
    stock: p.stock != null ? Number(p.stock) : p.stock_quantity != null ? Number(p.stock_quantity) : undefined,
    provider: (p.provider as string) ?? undefined,
    fatPct: nutrition?.fat_pct != null ? Number(nutrition.fat_pct) : null,
    proteinPct: nutrition?.protein_pct != null ? Number(nutrition.protein_pct) : null,
    hasDelivery: p.hasDelivery === true || p.has_delivery === true,
  };
}

export function extractPetBuddyProductRecommendations(
  toolName: string,
  toolResult: unknown,
): PetBuddyProductRecommendation[] {
  if (!toolResult || typeof toolResult !== 'object') return [];

  const data = toolResult as Record<string, unknown>;
  const out: PetBuddyProductRecommendation[] = [];

  if (toolName === 'nutrition_analyze_diet') {
    const marketplace = data.marketplace_recommendations as
      | { product_recommendations?: Array<Record<string, unknown>> }
      | undefined;
    for (const rec of marketplace?.product_recommendations ?? []) {
      const productId = String(rec.product_id ?? '');
      if (!productId) continue;
      const nutrition = rec.nutrition_match as Record<string, unknown> | undefined;
      out.push({
        productId,
        productName: String(rec.product_name ?? ''),
        brand: (rec.brand as string) ?? null,
        price: Number(rec.price) || 0,
        currency: String(rec.currency ?? 'GTQ'),
        stock: rec.stock != null ? Number(rec.stock) : undefined,
        provider: (rec.provider as string) ?? undefined,
        reason: String(rec.why_recommended ?? ''),
        fatPct: nutrition?.fat_as_fed_pct != null ? Number(nutrition.fat_as_fed_pct) : null,
        proteinPct: nutrition?.protein_as_fed_pct != null ? Number(nutrition.protein_as_fed_pct) : null,
        hasDelivery: rec.has_delivery === true,
      });
    }
    return out.slice(0, MAX_UI_RECOMMENDATIONS);
  }

  if (toolName === 'marketplace_search_products' || toolName === 'marketplace_search_semantic') {
    const products = data.products as Array<Record<string, unknown>> | undefined;
    for (const p of products ?? []) {
      const row = fromMarketplaceRow(p);
      if (row) out.push(row);
    }
    return out.slice(0, MAX_UI_RECOMMENDATIONS);
  }

  return [];
}

export function mergePetBuddyProductRecommendations(
  existing: PetBuddyProductRecommendation[],
  incoming: PetBuddyProductRecommendation[],
): PetBuddyProductRecommendation[] {
  const map = new Map<string, PetBuddyProductRecommendation>();
  for (const rec of [...existing, ...incoming]) {
    if (!rec.productId) continue;
    map.set(rec.productId, rec);
  }
  return [...map.values()].slice(0, MAX_UI_RECOMMENDATIONS);
}

export function attachProductRecommendations(
  response: { productRecommendations?: PetBuddyProductRecommendation[] },
  toolName: string,
  toolResult: unknown,
): void {
  const incoming = extractPetBuddyProductRecommendations(toolName, toolResult);
  if (incoming.length === 0) return;
  response.productRecommendations = mergePetBuddyProductRecommendations(
    response.productRecommendations ?? [],
    incoming,
  );
}
