/**
 * Audita completitud de perfiles nutricionales del catálogo GT.
 * Uso: npx tsx scripts/audit-food-profiles.ts
 */
import { ENRICHED_GUATEMALA_REFERENCE_FOODS, toPetFoodRow } from '../src/data/guatemalaReferenceFoods';
import { enrichNutritionFoodCatalog } from '../src/utils/nutritionFoodEnrichment';
import type { PetFoodRecord } from '../src/utils/nutritionSession';
import { foodDisplayLabel } from '../src/utils/nutritionSession';

const MACRO_KEYS: (keyof PetFoodRecord)[] = [
  'calories_per_100g',
  'protein_per_100g',
  'fat_per_100g',
  'carbs_per_100g',
  'fiber_per_100g',
];

const EXTENDED_MACRO_KEYS: (keyof PetFoodRecord)[] = [
  ...MACRO_KEYS,
  'moisture_per_100g',
  'ash_per_100g',
];

const VITAMIN_KEYS: (keyof PetFoodRecord)[] = [
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
];

const MINERAL_KEYS: (keyof PetFoodRecord)[] = [
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
];

const ALL_KEYS = [...EXTENDED_MACRO_KEYS, ...VITAMIN_KEYS, ...MINERAL_KEYS];

function hasValue(food: PetFoodRecord, key: keyof PetFoodRecord): boolean {
  const v = food[key];
  return v != null && Number(v) > 0;
}

function missingKeys(food: PetFoodRecord, keys: (keyof PetFoodRecord)[]): string[] {
  return keys.filter((k) => !hasValue(food, k)).map(String);
}

function auditFood(food: PetFoodRecord & { id: string }) {
  const missingMacros = missingKeys(food, MACRO_KEYS);
  const missingExtended = missingKeys(food, EXTENDED_MACRO_KEYS);
  const missingVitamins = missingKeys(food, VITAMIN_KEYS);
  const missingMinerals = missingKeys(food, MINERAL_KEYS);
  const missingAll = missingKeys(food, ALL_KEYS);
  const complete =
    missingMacros.length === 0 &&
    missingVitamins.length === 0 &&
    missingMinerals.length === 0;

  return {
    label: foodDisplayLabel(food),
    id: food.id,
    complete,
    missingMacros,
    missingVitamins,
    missingMinerals,
    missingAll,
    microScore: ALL_KEYS.length - missingAll.length,
  };
}

const localFoods = ENRICHED_GUATEMALA_REFERENCE_FOODS.map((f) => toPetFoodRow(f));
const enriched = enrichNutritionFoodCatalog(localFoods);

const results = enriched.map(auditFood);
const complete = results.filter((r) => r.complete);
const incomplete = results.filter((r) => !r.complete);

console.log('\n=== AUDITORÍA CATÁLOGO GT (local + enriquecido) ===\n');
console.log(`Total alimentos: ${results.length}`);
console.log(`Perfil completo (macros + 10 vitaminas + 11 minerales): ${complete.length} (${Math.round((complete.length / results.length) * 100)}%)`);
console.log(`Incompletos: ${incomplete.length}`);

if (complete.length > 0) {
  console.log('\n--- Perfil COMPLETO (28 campos) ---');
  for (const r of complete) console.log(`  ✓ ${r.label}`);
}

const byIssue = {
  macrosOnly: results.filter((r) => r.missingMacros.length > 0),
  vitaminsOnly: results.filter((r) => r.missingMacros.length === 0 && r.missingVitamins.length > 0),
  mineralsOnly: results.filter((r) => r.missingMacros.length === 0 && r.missingVitamins.length === 0 && r.missingMinerals.length > 0),
};

console.log(`\nSin macros completos: ${byIssue.macrosOnly.length}`);
console.log(`Con macros pero faltan vitaminas: ${byIssue.vitaminsOnly.length}`);
console.log(`Con macros+vitaminas pero faltan minerales: ${byIssue.mineralsOnly.length}`);

if (incomplete.length > 0) {
  console.log('\n--- Alimentos incompletos (detalle) ---\n');
  for (const r of incomplete.sort((a, b) => a.microScore - b.microScore)) {
    console.log(`${r.label}`);
    if (r.missingMacros.length) console.log(`  macros: ${r.missingMacros.join(', ')}`);
    if (r.missingVitamins.length) console.log(`  vitaminas: ${r.missingVitamins.join(', ')}`);
    if (r.missingMinerals.length) console.log(`  minerales: ${r.missingMinerals.join(', ')}`);
    console.log(`  campos OK: ${r.microScore}/${ALL_KEYS.length}`);
    console.log('');
  }
}

// Frecuencia de campos faltantes
const missingFreq = new Map<string, number>();
for (const r of incomplete) {
  for (const k of r.missingAll) {
    missingFreq.set(k, (missingFreq.get(k) ?? 0) + 1);
  }
}
if (missingFreq.size > 0) {
  console.log('--- Campos más frecuentemente vacíos ---');
  [...missingFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, n]) => console.log(`  ${k}: ${n} alimentos`));
}
