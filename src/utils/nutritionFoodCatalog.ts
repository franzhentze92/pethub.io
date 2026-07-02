import { ENRICHED_GUATEMALA_REFERENCE_FOODS, toPetFoodRow } from '@/data/guatemalaReferenceFoods';
import { supabase } from '@/lib/supabase';
import { foodDisplayLabel, type PetFoodRecord } from './nutritionSession';
import {
  enrichNutritionFoodCatalog,
  mergeNutritionFoodRow,
} from './nutritionFoodEnrichment';

export type NutritionFoodRow = PetFoodRecord & {
  id: string;
  name: string;
  brand?: string | null;
  species?: string;
  food_type?: string | null;
  life_stage?: string | null;
  is_reference?: boolean;
  is_available?: boolean;
  market_rank_gt?: number | null;
  data_source?: string | null;
};

export type CatalogSyncStatus = 'synced' | 'partial' | 'local_only';

export function getLocalGuatemalaReferenceFoodRows(): NutritionFoodRow[] {
  return ENRICHED_GUATEMALA_REFERENCE_FOODS.map((food) => toPetFoodRow(food) as NutritionFoodRow);
}

function sortFoods(foods: NutritionFoodRow[]): NutritionFoodRow[] {
  return [...foods].sort((a, b) => {
    const rankA = a.market_rank_gt ?? 9999;
    const rankB = b.market_rank_gt ?? 9999;
    if (rankA !== rankB) return rankA - rankB;
    return foodDisplayLabel(a).localeCompare(foodDisplayLabel(b), 'es');
  });
}

/** Une catálogo local GT con filas de Supabase; conserva micros locales si la BD tiene null. */
export function mergeNutritionFoodCatalog(dbFoods: NutritionFoodRow[]): NutritionFoodRow[] {
  const byId = new Map<string, NutritionFoodRow>();

  for (const local of getLocalGuatemalaReferenceFoodRows()) {
    byId.set(local.id, local);
  }

  for (const row of dbFoods) {
    const existing = byId.get(row.id);
    byId.set(row.id, existing ? mergeNutritionFoodRow(existing, row) : row);
  }

  return enrichNutritionFoodCatalog(sortFoods(Array.from(byId.values())));
}

export function filterNutritionFoodsBySpecies(
  foods: NutritionFoodRow[],
  species?: string | null,
): NutritionFoodRow[] {
  if (!species) return foods;

  const s = species.toLowerCase();
  const isCat = s.includes('cat') || s.includes('gato');
  const isDog = s.includes('dog') || s.includes('perro');

  return foods.filter((food) => {
    if (!food.species || food.species === 'Both') return true;
    if (food.species === 'Cat' && isCat) return true;
    if (food.species === 'Dog' && isDog) return true;
    return food.species.toLowerCase() === s;
  });
}

export function getCatalogSyncStatus(dbCount: number): CatalogSyncStatus {
  const catalogCount = getLocalGuatemalaReferenceFoodRows().length;
  if (dbCount === 0) return 'local_only';
  if (dbCount >= catalogCount) return 'synced';
  return 'partial';
}

export async function fetchMergedNutritionFoodCatalog(options?: {
  species?: string | null;
}): Promise<{
  foods: NutritionFoodRow[];
  dbCount: number;
  catalogCount: number;
  syncStatus: CatalogSyncStatus;
}> {
  const { data, error } = await supabase.from('pet_foods').select('*').eq('is_available', true);

  const dbFoods = error ? [] : ((data || []) as NutritionFoodRow[]);
  const merged = mergeNutritionFoodCatalog(dbFoods);
  const catalogCount = getLocalGuatemalaReferenceFoodRows().length;
  const foods = options?.species ? filterNutritionFoodsBySpecies(merged, options.species) : merged;

  return {
    foods,
    dbCount: dbFoods.length,
    catalogCount,
    syncStatus: getCatalogSyncStatus(dbFoods.length),
  };
}
