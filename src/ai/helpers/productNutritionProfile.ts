import type { ProductNutritionFields } from '@/config/productNutrition';
import { productHasNutritionData } from '@/config/productNutrition';
import type { NutritionFoodRow } from '@/utils/nutritionFoodCatalog';
import { foodDisplayLabel, matchFoodByName } from '@/utils/nutritionSession';

type ScorableProduct = ProductNutritionFields & {
  product_name: string;
  brand?: string | null;
};

export function resolveProductNutritionProfile(
  product: ScorableProduct,
  catalogFoods: NutritionFoodRow[],
): {
  source: 'marketplace' | 'catalog' | 'none';
  fat_pct: number | null;
  protein_pct: number | null;
  fiber_pct: number | null;
  calories_per_100g: number | null;
  ingredients: string | null;
  label: string | null;
} {
  if (productHasNutritionData(product)) {
    return {
      source: 'marketplace',
      fat_pct: product.nutrition_fat_pct ?? null,
      protein_pct: product.nutrition_protein_pct ?? null,
      fiber_pct: product.nutrition_fiber_pct ?? null,
      calories_per_100g: product.nutrition_calories_per_100g ?? null,
      ingredients: product.ingredients?.trim() || null,
      label: product.brand ? `${product.brand} - ${product.product_name}` : product.product_name,
    };
  }

  const attempts = [
    product.brand ? `${product.brand} ${product.product_name}` : product.product_name,
    product.product_name,
  ];
  for (const label of attempts) {
    const match = matchFoodByName(catalogFoods, label);
    if (match) {
      return {
        source: 'catalog',
        fat_pct: match.fat_per_100g ?? null,
        protein_pct: match.protein_per_100g ?? null,
        fiber_pct: match.fiber_per_100g ?? null,
        calories_per_100g: match.calories_per_100g ?? null,
        ingredients: null,
        label: foodDisplayLabel(match),
      };
    }
  }

  return {
    source: 'none',
    fat_pct: null,
    protein_pct: null,
    fiber_pct: null,
    calories_per_100g: null,
    ingredients: null,
    label: null,
  };
}

export function ingredientsMatchTokens(ingredients: string | null | undefined, tokens: string[]): number {
  if (!ingredients?.trim() || tokens.length === 0) return 0;
  const hay = ingredients.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (hay.includes(token)) score += 3;
  }
  return score;
}
