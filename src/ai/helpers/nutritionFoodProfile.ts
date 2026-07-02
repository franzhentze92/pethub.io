import { subDays, format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import type { AiExecutionContext } from '../types';
import { resolvePets } from './petResolver';
import { fetchMergedNutritionFoodCatalog, type NutritionFoodRow } from '@/utils/nutritionFoodCatalog';
import {
  buildPetMonthlyComparison,
  compliancePercent,
  type NutritionSessionRow,
  type PetProfile,
} from '@/utils/nutritionComparison';
import { foodDisplayLabel, matchFoodByName, type PetFoodRecord } from '@/utils/nutritionSession';
import { foodProfileHasMicros, foodProfileMicroScore } from '@/utils/nutritionFoodEnrichment';
import { buildNutritionMarketplaceRecommendations } from './nutritionMarketplaceRecommendations';

const VITAMIN_KEYS = [
  'vitamin_a_per_100g',
  'vitamin_d_per_100g',
  'vitamin_e_per_100g',
  'vitamin_k_per_100g',
  'vitamin_b1_per_100g',
  'vitamin_b2_per_100g',
  'vitamin_b3_per_100g',
  'vitamin_b6_per_100g',
  'vitamin_b12_per_100g',
  'vitamin_c_per_100g',
] as const;

const MINERAL_KEYS = [
  'calcium_per_100g',
  'phosphorus_per_100g',
  'magnesium_per_100g',
  'iron_per_100g',
  'zinc_per_100g',
  'copper_per_100g',
  'manganese_per_100g',
  'selenium_per_100g',
  'sodium_per_100g',
  'potassium_per_100g',
  'iodine_per_100g',
] as const;

type NutrientKey = keyof PetFoodRecord;

function roundNutrient(value: number | null | undefined, decimals = 2): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function pickPer100g(food: PetFoodRecord, keys: readonly NutrientKey[]) {
  const out: Record<string, number | null> = {};
  for (const key of keys) {
    const short = key.replace(/_per_100g$/, '');
    out[short] = roundNutrient(food[key] as number | null | undefined);
  }
  return out;
}

function scaleFromPer100g(per100: number | null | undefined, grams: number): number | null {
  if (per100 == null || grams <= 0) return null;
  return roundNutrient((per100 * grams) / 100);
}

function sumScaledNutrients(
  sessions: Array<{ quantity_grams?: number | null; food_name?: string | null }>,
  food: PetFoodRecord,
) {
  const totals: Record<string, number> = {};
  const allKeys = [...VITAMIN_KEYS, ...MINERAL_KEYS] as NutrientKey[];

  for (const session of sessions) {
    const grams = Number(session.quantity_grams) || 0;
    if (grams <= 0) continue;
    for (const key of allKeys) {
      const scaled = scaleFromPer100g(food[key] as number | null | undefined, grams);
      if (scaled == null) continue;
      const short = key.replace(/_per_100g$/, '');
      totals[short] = (totals[short] ?? 0) + scaled;
    }
  }

  for (const k of Object.keys(totals)) {
    totals[k] = roundNutrient(totals[k]) ?? 0;
  }
  return totals;
}

export function formatFoodProfileRow(food: NutritionFoodRow | (PetFoodRecord & { id?: string; life_stage?: string | null; is_reference?: boolean; data_source?: string | null })) {
  const microFieldsPresent = foodProfileMicroScore(food);
  const microFieldsTotal = VITAMIN_KEYS.length + MINERAL_KEYS.length;

  return {
    id: 'id' in food ? food.id : undefined,
    label: foodDisplayLabel(food),
    brand: food.brand,
    name: food.name,
    species: 'species' in food ? food.species : undefined,
    food_type: food.food_type,
    life_stage: 'life_stage' in food ? food.life_stage : undefined,
    is_reference: 'is_reference' in food ? food.is_reference : undefined,
    macros_per_100g: {
      calories_kcal: roundNutrient(food.calories_per_100g, 1),
      protein_g: roundNutrient(food.protein_per_100g, 1),
      fat_g: roundNutrient(food.fat_per_100g, 1),
      carbs_g: roundNutrient(food.carbs_per_100g, 1),
      fiber_g: roundNutrient(food.fiber_per_100g, 1),
      moisture_g: roundNutrient(food.moisture_per_100g, 1),
      ash_g: roundNutrient(food.ash_per_100g, 1),
    },
    /** Porcentaje en alimento tal como viene (as-fed), igual que etiqueta */
    as_fed_pct: {
      protein: roundNutrient(food.protein_per_100g, 1),
      fat: roundNutrient(food.fat_per_100g, 1),
      fiber: roundNutrient(food.fiber_per_100g, 1),
      carbs: roundNutrient(food.carbs_per_100g, 1),
    },
    vitamins_per_100g: pickPer100g(food, VITAMIN_KEYS),
    minerals_per_100g: pickPer100g(food, MINERAL_KEYS),
    profile_completeness: {
      micro_fields_filled: microFieldsPresent,
      micro_fields_total: microFieldsTotal,
      has_full_micro_profile: foodProfileHasMicros(food),
    },
    data_source: food.data_source ?? null,
    units_note:
      'Macros en g por 100g de alimento. Vitaminas A/D/E en UI por 100g (convertidas desde IU/kg en catálogo). Minerales en mg por 100g salvo selenio/iodo.',
  };
}

export async function lookupFoodNutritionProfile(foodQuery: string, species?: string | null) {
  const { foods, catalogCount, syncStatus } = await fetchMergedNutritionFoodCatalog({ species });
  const match = matchFoodByName(foods, foodQuery);
  if (match) {
    return {
      found: true,
      profile: formatFoodProfileRow(match),
      catalog_size: catalogCount,
      sync_status: syncStatus,
      candidates: [] as string[],
    };
  }

  const needle = foodQuery.toLowerCase();
  const candidates = foods
    .filter((f) => {
      const label = foodDisplayLabel(f).toLowerCase();
      return label.includes(needle) || needle.includes(f.name.toLowerCase());
    })
    .slice(0, 8)
    .map((f) => foodDisplayLabel(f));

  return { found: false, profile: null, catalog_size: catalogCount, sync_status: syncStatus, candidates };
}

export async function analyzePetDietProfile(
  ctx: AiExecutionContext,
  params: { pet_name?: string; days?: number },
) {
  if (!ctx.userId) {
    return { error: 'AUTH_REQUIRED', message: 'Inicia sesión.' };
  }

  const days = Math.min(Math.max(params.days ?? 30, 1), 90);
  const sinceDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
  const monthValue = format(new Date(), 'yyyy-MM');

  const petResult = await resolvePets(ctx, params.pet_name);
  if ('error' in petResult) {
    return {
      error: petResult.error,
      message:
        petResult.error === 'PET_REQUIRED'
          ? `¿De cuál mascota? Tienes: ${petResult.pets?.join(', ')}`
          : petResult.message,
      pets: petResult.pets,
    };
  }

  const pet = petResult.pets[0];
  const petIds = petResult.pets.map((p) => p.id);

  const [sessionsRes, schedulesRes, catalogRes] = await Promise.all([
    supabase
      .from('nutrition_sessions')
      .select(
        'pet_id, date, food_name, quantity_grams, total_calories, total_protein, total_fat, total_carbs, total_fiber, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, fiber_per_100g',
      )
      .eq('owner_id', ctx.userId)
      .in('pet_id', petIds)
      .gte('date', sinceDate)
      .order('date', { ascending: false }),
    supabase
      .from('pet_feeding_schedules')
      .select('id, pet_id, is_active, feeding_times, days_of_week, start_date, end_date')
      .eq('owner_id', ctx.userId)
      .in('pet_id', petIds),
    fetchMergedNutritionFoodCatalog({ species: pet.species }),
  ]);

  const sessions = (sessionsRes.data ?? []) as NutritionSessionRow[];
  const petProfile: PetProfile = {
    id: pet.id,
    name: pet.name,
    species: pet.species,
    weight: pet.weight,
    age: pet.age ?? null,
  };

  const monthly = buildPetMonthlyComparison({
    pet: petProfile,
    monthValue,
    schedules: schedulesRes.data ?? [],
    sessions: sessionsRes.data ?? [],
    foods: catalogRes.foods,
  });

  const fatExpectedMonth = monthly.expected.fat;
  const fatActualMonth = monthly.actual.fat;
  const fatCompliance = compliancePercent(fatExpectedMonth, fatActualMonth);

  const byFood: Record<
    string,
    { grams: number; calories: number; fat_g: number; protein_g: number; meals: number; sessions: NutritionSessionRow[] }
  > = {};

  for (const s of sessions) {
    const key = s.food_name || 'Desconocido';
    if (!byFood[key]) {
      byFood[key] = { grams: 0, calories: 0, fat_g: 0, protein_g: 0, meals: 0, sessions: [] };
    }
    byFood[key].grams += Number(s.quantity_grams) || 0;
    byFood[key].calories += Number(s.total_calories) || 0;
    byFood[key].fat_g += Number(s.total_fat) || 0;
    byFood[key].protein_g += Number(s.total_protein) || 0;
    byFood[key].meals += 1;
    byFood[key].sessions.push(s);
  }

  const foodsEaten = await Promise.all(
    Object.entries(byFood).map(async ([foodName, totals]) => {
      const lookup = await lookupFoodNutritionProfile(foodName, pet.species);
      const catalogMatch = lookup.found
        ? matchFoodByName(catalogRes.foods, foodName)
        : undefined;
      const ingested_micros =
        catalogMatch && totals.sessions.length > 0
          ? sumScaledNutrients(totals.sessions, catalogMatch)
          : null;

      return {
        food_name: foodName,
        meals: totals.meals,
        total_grams: Math.round(totals.grams),
        total_calories: Math.round(totals.calories),
        total_fat_g: roundNutrient(totals.fat_g, 1),
        total_protein_g: roundNutrient(totals.protein_g, 1),
        catalog_profile: lookup.profile,
        profile_match: lookup.found,
        estimated_micros_ingested_in_period: ingested_micros,
      };
    }),
  );

  const primaryFood = foodsEaten.sort((a, b) => b.total_grams - a.total_grams)[0];
  const primaryProfile = primaryFood?.catalog_profile;
  const primaryCatalog = primaryFood?.profile_match
    ? matchFoodByName(catalogRes.foods, primaryFood.food_name)
    : undefined;

  const periodIngestedMicros =
    primaryCatalog && primaryFood
      ? sumScaledNutrients(
          sessions.filter((s) => s.food_name === primaryFood.food_name),
          primaryCatalog,
        )
      : null;

  const dietCore = {
    pet_name: pet.name,
    species: pet.species,
    weight_kg: pet.weight,
    period_days: days,
    meals_count: sessions.length,
    foods_eaten: foodsEaten,
    primary_food: primaryFood?.food_name ?? null,
    monthly_summary: {
      expected_source: monthly.expectedSource,
      calories: {
        expected: Math.round(monthly.expected.calories),
        actual: Math.round(monthly.actual.calories),
        compliance_pct: compliancePercent(monthly.expected.calories, monthly.actual.calories),
      },
      protein: {
        expected_g: Math.round(monthly.expected.protein),
        actual_g: Math.round(monthly.actual.protein),
        compliance_pct: compliancePercent(monthly.expected.protein, monthly.actual.protein),
      },
      fat: {
        expected_g: roundNutrient(fatExpectedMonth, 1),
        actual_g: roundNutrient(fatActualMonth, 1),
        compliance_pct: fatCompliance,
      },
    },
    primary_food_profile: primaryProfile,
    primary_food_micros_ingested_period: periodIngestedMicros,
    analysis_hints: {
      food_fat_as_fed_pct: primaryProfile?.as_fed_pct?.fat ?? null,
      food_protein_as_fed_pct: primaryProfile?.as_fed_pct?.protein ?? null,
      food_fat_per_100g_g: primaryProfile?.macros_per_100g?.fat_g ?? null,
      vitamins_available_in_profile: primaryProfile?.vitamins_per_100g ?? null,
      minerals_available_in_profile: primaryProfile?.minerals_per_100g ?? null,
      profile_data_source: primaryProfile?.data_source ?? null,
      guideline_adult_dog_fat_pct: '12–18% en alimento seco suele ser adecuado para adultos activos',
      guideline_adult_cat_fat_pct: '9–15% en alimento seco',
      note:
        'Usa monthly_summary.fat para si ingiere suficiente grasa en total. Usa primary_food_profile.as_fed_pct.fat para el % del alimento. Cita data_source si el usuario pide fuente.',
    },
  };

  const marketplace_recommendations = await buildNutritionMarketplaceRecommendations(
    {
      species: pet.species,
      monthly_summary: dietCore.monthly_summary,
      primary_food_profile: primaryProfile,
    },
    catalogRes.foods,
    pet.name,
  ).catch((err) => {
    console.warn('[PetBuddy] marketplace recommendations failed:', err);
    return {
      gaps_detected: [],
      product_recommendations: [],
      service_recommendations: [],
      assistant_note:
        'No se pudo consultar el marketplace en este momento; el análisis nutricional sigue disponible.',
      marketplace_availability_note: null,
      marketplace_status: 'no_products' as const,
    };
  });

  return {
    ...dietCore,
    marketplace_recommendations,
  };
}
