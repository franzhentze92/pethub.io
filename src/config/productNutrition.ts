/** Categories where providers should enter ingredients + guaranteed analysis. */
export const NUTRITION_PROFILE_CATEGORIES = ['alimentos', 'medicamentos'] as const;

export type NutritionProfileCategory = (typeof NUTRITION_PROFILE_CATEGORIES)[number];

export interface ProductNutritionFields {
  ingredients?: string | null;
  nutrition_protein_pct?: number | null;
  nutrition_fat_pct?: number | null;
  nutrition_fiber_pct?: number | null;
  nutrition_moisture_pct?: number | null;
  nutrition_ash_pct?: number | null;
  nutrition_calories_per_100g?: number | null;
}

export function categoryRequiresNutritionProfile(category: string): boolean {
  return NUTRITION_PROFILE_CATEGORIES.includes(category as NutritionProfileCategory);
}

/** Alimentos must list ingredients; medicamentos/suplementos strongly recommended. */
export function categoryRequiresIngredients(category: string): boolean {
  return category === 'alimentos';
}

export function productHasNutritionData(product: ProductNutritionFields): boolean {
  return Boolean(
    product.ingredients?.trim() ||
      product.nutrition_fat_pct != null ||
      product.nutrition_protein_pct != null ||
      product.nutrition_calories_per_100g != null,
  );
}

export function formatGuaranteedAnalysis(product: ProductNutritionFields): string | null {
  const parts: string[] = [];
  if (product.nutrition_protein_pct != null) parts.push(`Proteína ${product.nutrition_protein_pct}%`);
  if (product.nutrition_fat_pct != null) parts.push(`Grasa ${product.nutrition_fat_pct}%`);
  if (product.nutrition_fiber_pct != null) parts.push(`Fibra ${product.nutrition_fiber_pct}%`);
  if (product.nutrition_moisture_pct != null) parts.push(`Humedad ${product.nutrition_moisture_pct}%`);
  if (product.nutrition_ash_pct != null) parts.push(`Cenizas ${product.nutrition_ash_pct}%`);
  if (product.nutrition_calories_per_100g != null) {
    parts.push(`${product.nutrition_calories_per_100g} kcal/100g`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function parseOptionalNutritionPct(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 100) / 100;
}

export function parseOptionalCalories(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  if (!Number.isFinite(n) || n <= 0 || n > 9999) return null;
  return Math.round(n * 10) / 10;
}
