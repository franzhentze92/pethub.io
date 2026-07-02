/**
 * Genera SQL de seed para catálogo Guatemala desde src/data/guatemalaReferenceFoods.ts
 * Uso: npx vite-node scripts/generate-reference-foods-sql.ts
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GUATEMALA_REFERENCE_FOODS, toPetFoodRow } from '../src/data/guatemalaReferenceFoods';

const __dirname = dirname(fileURLToPath(import.meta.url));

function sqlVal(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') {
    const s = String(v);
    return s.includes('.') && s.length > 12 ? String(Math.round(v * 1000) / 1000) : s;
  }
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return `'${String(v).replace(/'/g, "''")}'`;
}

const NUTRIENT_COLS = [
  'calories_per_100g',
  'protein_per_100g',
  'fat_per_100g',
  'fiber_per_100g',
  'carbs_per_100g',
  'moisture_per_100g',
  'ash_per_100g',
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

const rows = GUATEMALA_REFERENCE_FOODS.map((f) => {
  const r = toPetFoodRow(f);
  const nutrients = NUTRIENT_COLS.map((c) => sqlVal(r[c as keyof typeof r])).join(',\n  ');
  return `(
  ${sqlVal(r.id)}::uuid,
  ${sqlVal(r.brand)},
  ${sqlVal(r.name)},
  ${sqlVal(r.species)},
  ${sqlVal(r.food_type)},
  ${sqlVal(r.life_stage)},
  true,
  true,
  ${sqlVal(r.market_rank_gt)},
  ${sqlVal(r.data_source)},
  now(),
  ${nutrients}
)`;
});

const alter = `-- Actualización perfiles nutricionales completos — catálogo referencia Guatemala (25 productos)
-- Generado automáticamente — regenerar con:
-- npx vite-node scripts/generate-reference-foods-sql.ts

`;

const insertCols = [
  'id',
  'brand',
  'name',
  'species',
  'food_type',
  'life_stage',
  'is_reference',
  'is_available',
  'market_rank_gt',
  'data_source',
  'verified_at',
  ...NUTRIENT_COLS,
].join(',\n  ');

const updateSet = [
  'brand',
  'name',
  'species',
  'food_type',
  'life_stage',
  'is_reference',
  'is_available',
  'market_rank_gt',
  'data_source',
  'verified_at',
  ...NUTRIENT_COLS,
]
  .map((c) => `  ${c} = EXCLUDED.${c}`)
  .join(',\n');

const insert = `
INSERT INTO public.pet_foods (
  ${insertCols}
) VALUES
${rows.join(',\n')}
ON CONFLICT (id) DO UPDATE SET
${updateSet};
`;

const outPath = resolve(__dirname, '../supabase/migrations/20260702120000_update_reference_food_profiles.sql');
writeFileSync(outPath, alter + insert, 'utf8');
console.log(`Wrote ${outPath} (${GUATEMALA_REFERENCE_FOODS.length} foods)`);
