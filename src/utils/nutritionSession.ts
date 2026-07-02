export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

import {
  collectFoodNameMatches,
  pickBestFoodMatch,
} from './nutritionFoodEnrichment';

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snack: 'Merienda',
};

export function normalizeMealType(raw?: string): MealType {
  const v = (raw ?? 'snack').toLowerCase().trim();
  const map: Record<string, MealType> = {
    breakfast: 'breakfast',
    desayuno: 'breakfast',
    lunch: 'lunch',
    almuerzo: 'lunch',
    dinner: 'dinner',
    cena: 'dinner',
    snack: 'snack',
    merienda: 'snack',
  };
  return map[v] ?? (['breakfast', 'lunch', 'dinner', 'snack'].includes(v) ? (v as MealType) : 'snack');
}

export function mealTypeLabel(type?: string | null): string {
  if (!type) return 'Comida';
  return MEAL_TYPE_LABELS[normalizeMealType(type)] ?? type;
}

export interface PetFoodRecord {
  name: string;
  brand?: string | null;
  food_type?: string | null;
  calories_per_100g?: number | null;
  protein_per_100g?: number | null;
  fat_per_100g?: number | null;
  carbs_per_100g?: number | null;
  fiber_per_100g?: number | null;
  vitamin_a_per_100g?: number | null;
  vitamin_d_per_100g?: number | null;
  vitamin_e_per_100g?: number | null;
  vitamin_k_per_100g?: number | null;
  vitamin_b1_per_100g?: number | null;
  vitamin_b2_per_100g?: number | null;
  vitamin_b3_per_100g?: number | null;
  vitamin_b6_per_100g?: number | null;
  vitamin_b12_per_100g?: number | null;
  vitamin_c_per_100g?: number | null;
  calcium_per_100g?: number | null;
  phosphorus_per_100g?: number | null;
  magnesium_per_100g?: number | null;
  iron_per_100g?: number | null;
  zinc_per_100g?: number | null;
  copper_per_100g?: number | null;
  manganese_per_100g?: number | null;
  selenium_per_100g?: number | null;
  sodium_per_100g?: number | null;
  potassium_per_100g?: number | null;
  iodine_per_100g?: number | null;
  ash_per_100g?: number | null;
  moisture_per_100g?: number | null;
}

function calcTotal(per100g: number | null | undefined, quantityGrams: number): number | null {
  if (per100g == null) return null;
  return per100g * (quantityGrams / 100);
}

export function buildNutritionSessionPayload(params: {
  petId: string;
  ownerId: string;
  food: PetFoodRecord;
  quantityGrams: number;
  date: string;
  feedingTime: string;
  mealType: MealType;
  notes?: string | null;
}) {
  const { food, quantityGrams } = params;

  const totalFrom = (per100g: number | null | undefined, fallback: number) =>
    calcTotal(per100g, quantityGrams) ?? quantityGrams * fallback;

  return {
    pet_id: params.petId,
    owner_id: params.ownerId,
    quantity_grams: quantityGrams,
    date: params.date,
    feeding_time: params.feedingTime,
    meal_type: params.mealType,
    notes: params.notes?.trim() || null,
    food_name: food.brand ? `${food.brand} - ${food.name}` : food.name,
    food_category: food.food_type || 'dry_food',
    calories_per_100g: food.calories_per_100g ?? 350,
    protein_per_100g: food.protein_per_100g ?? 25,
    fat_per_100g: food.fat_per_100g ?? 15,
    carbs_per_100g: food.carbs_per_100g ?? 40,
    fiber_per_100g: food.fiber_per_100g ?? 5,
    total_calories: totalFrom(food.calories_per_100g, 3.5),
    total_protein: totalFrom(food.protein_per_100g, 0.25),
    total_fat: totalFrom(food.fat_per_100g, 0.15),
    total_carbs: totalFrom(food.carbs_per_100g, 0.4),
    total_fiber: totalFrom(food.fiber_per_100g, 0.05),
  };
}

/** Row shape accepted by nutrition_sessions table (no vitamin/mineral columns). */
export function buildNutritionSessionInsertRow(
  params: Parameters<typeof buildNutritionSessionPayload>[0],
) {
  return buildNutritionSessionPayload(params);
}

export function normalizeFoodSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function foodDisplayLabel(food: { brand?: string | null; name: string }): string {
  return food.brand ? `${food.brand} - ${food.name}` : food.name;
}

export function matchFoodByName(
  foods: Array<PetFoodRecord & { id: string }>,
  foodName: string,
): (PetFoodRecord & { id: string }) | undefined {
  const matches = collectFoodNameMatches(foods, foodName);
  return pickBestFoodMatch(matches);
}

export function defaultFeedingTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}
