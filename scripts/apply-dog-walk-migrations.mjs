/**
 * Applies Paseos (dog walk) SQL migrations to PetHub Supabase.
 * Requires SUPABASE_ACCESS_TOKEN: https://supabase.com/dashboard/account/tokens
 *
 * Usage:
 *   set SUPABASE_ACCESS_TOKEN=your-token
 *   node scripts/apply-dog-walk-migrations.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const projectRef = 'uzcuhdkjfqqzqlxgwyjt';
const token = process.env.SUPABASE_ACCESS_TOKEN;

const migrationFiles = [
  'supabase/migrations/20260712120000_dog_walkers.sql',
  'supabase/migrations/20260712130000_dog_walk_notification_preferences.sql',
  'supabase/migrations/20260712140000_dog_walker_coverage_radius.sql',
  'supabase/migrations/20260712150000_dog_walk_request_pets.sql',
  'supabase/migrations/20260712160000_dog_walk_pickup_location.sql',
];

if (!token) {
  console.error('Missing SUPABASE_ACCESS_TOKEN.');
  console.error('Create one at https://supabase.com/dashboard/account/tokens');
  console.error('');
  console.error('Or paste the combined SQL in Supabase Dashboard → SQL Editor:');
  console.error('  scripts/dog-walk-migrations-combined.sql');
  process.exit(1);
}

async function runQuery(query, label) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${label} failed (${res.status}): ${text}`);
  }
  return text;
}

for (const file of migrationFiles) {
  const sql = readFileSync(join(root, file), 'utf8');
  const label = file.split('/').pop();
  process.stdout.write(`Applying ${label}... `);
  await runQuery(sql, label);
  console.log('OK');
}

console.log('');
console.log('All Paseos migrations applied successfully.');
console.log('Verify: https://supabase.com/dashboard/project/uzcuhdkjfqqzqlxgwyjt/editor');
