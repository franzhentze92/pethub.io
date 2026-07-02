/**
 * Carga el catálogo de referencia Guatemala en Supabase.
 * Uso: npx vite-node scripts/seed-reference-foods.ts
 */
import { createClient } from '@supabase/supabase-js';
import { GUATEMALA_REFERENCE_FOODS, toPetFoodRow } from '../src/data/guatemalaReferenceFoods';

const url = process.env.VITE_SUPABASE_URL ?? 'https://uzcuhdkjfqqzqlxgwyjt.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) {
  console.error('SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}

const supabase = createClient(url, key);

const rows = GUATEMALA_REFERENCE_FOODS.map((f) => {
  const r = toPetFoodRow(f);
  return {
    ...r,
    verified_at: new Date().toISOString(),
  };
});

const { data, error } = await supabase.from('pet_foods').upsert(rows, { onConflict: 'id' }).select('id, brand, name');

if (error) {
  console.error('Seed failed:', error.message);
  process.exit(1);
}

console.log(`Seeded ${data?.length ?? 0} reference foods`);
